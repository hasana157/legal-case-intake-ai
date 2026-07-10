#!/usr/bin/env python3
# =============================================================================
# evals/load_test.py
# Milestone 6C — Latency & Concurrent Load Testing
#
# Sends N concurrent requests to /api/generate-opposition-v2 and measures:
#   - Time to first token (TTFT) per request
#   - Total streaming time per request
#   - Whether all requests completed successfully
#
# Usage:
#   # Start the FastAPI server first:
#   #   uvicorn api.main:app --reload --port 8000
#   python evals/load_test.py [--base-url http://localhost:8000] [--concurrency 10]
#
# Targets:
#   TTFT < 300ms
#   Total streaming < 3000ms
#   Zero serverless timeouts under 10 concurrent users
# =============================================================================

from __future__ import annotations

import argparse
import asyncio
import json
import sys
import time
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path

_ROOT = Path(__file__).resolve().parents[1]
if str(_ROOT) not in sys.path:
    sys.path.insert(0, str(_ROOT))

try:
    import httpx
except ImportError:
    print("httpx is required for load testing. Run: pip install httpx")
    sys.exit(1)

# Use a simple subset of fixtures for the load test (avoid exhausting API quota)
LOAD_TEST_PAYLOAD = {
    "case_id": "LOAD-TEST-001",
    "jurisdiction": "California",
    "claim_type": "tenancy",
    "parties": [
        {"name": "Load Test Plaintiff", "role": "plaintiff"},
        {"name": "Load Test Defendant", "role": "defendant"},
    ],
    "key_dates": [{"label": "Incident date", "date": "2024-01-15"}],
    "disputed_facts": [
        "The landlord failed to return the security deposit within 21 days.",
        "No itemised deduction statement was provided.",
        "The unit was vacated in clean condition.",
    ],
    "available_evidence": [],
    "raw_narrative": "Load test narrative — security deposit dispute in California.",
    "jurisdiction_validated": True,
    "missing_context": [],
    "extraction_confidence": 0.95,
    "processed_at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
}

TTFT_TARGET_MS = 300
TOTAL_STREAMING_TARGET_MS = 3000


@dataclass
class RequestResult:
    user_id: int
    success: bool
    ttft_ms: float | None = None
    total_ms: float | None = None
    error: str | None = None
    status_code: int | None = None
    events_received: int = 0


async def _stream_one_request(
    client: httpx.AsyncClient,
    base_url: str,
    user_id: int,
) -> RequestResult:
    result = RequestResult(user_id=user_id, success=False)
    url = f"{base_url.rstrip('/')}/api/generate-opposition-v2"

    t_start = time.monotonic()
    first_token = False

    try:
        async with client.stream(
            "POST",
            url,
            json=LOAD_TEST_PAYLOAD,
            headers={"Accept": "text/event-stream", "Content-Type": "application/json"},
            timeout=30.0,
        ) as response:
            result.status_code = response.status_code
            if response.status_code not in (200, 201):
                result.error = f"HTTP {response.status_code}"
                return result

            buffer = ""
            async for raw_bytes in response.aiter_bytes():
                text = raw_bytes.decode("utf-8", errors="replace")
                buffer += text

                # Count SSE events
                parts = buffer.split("\n\n")
                buffer = parts.pop()
                for part in parts:
                    if not part.strip():
                        continue
                    result.events_received += 1

                    # Detect first meaningful delta
                    if not first_token and "event: delta" in part:
                        result.ttft_ms = (time.monotonic() - t_start) * 1000
                        first_token = True

                    if "event: complete" in part or "event: error" in part:
                        result.total_ms = (time.monotonic() - t_start) * 1000
                        result.success = "event: complete" in part
                        return result

        result.total_ms = (time.monotonic() - t_start) * 1000
        result.success = True

    except httpx.TimeoutException:
        result.error = "timeout"
        result.total_ms = (time.monotonic() - t_start) * 1000
    except Exception as e:
        result.error = type(e).__name__
        result.total_ms = (time.monotonic() - t_start) * 1000

    return result


async def run_load_test(base_url: str, concurrency: int) -> int:
    """
    Run the load test with `concurrency` simultaneous users.
    Returns exit code: 0=pass, 1=fail.
    """
    print("=" * 70)
    print("Opposing-Argument Simulator — Concurrent Load Test")
    print(f"Run at:      {datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')}")
    print(f"Target URL:  {base_url}")
    print(f"Concurrency: {concurrency} simultaneous users")
    print(f"TTFT target: <{TTFT_TARGET_MS}ms | Total target: <{TOTAL_STREAMING_TARGET_MS}ms")
    print("=" * 70)

    t_wall_start = time.monotonic()

    async with httpx.AsyncClient(http2=True) as client:
        tasks = [
            _stream_one_request(client, base_url, user_id=i + 1)
            for i in range(concurrency)
        ]
        results: list[RequestResult] = await asyncio.gather(*tasks, return_exceptions=False)

    wall_time = (time.monotonic() - t_wall_start) * 1000

    # ── Summarise ─────────────────────────────────────────────────────────────
    successful = [r for r in results if r.success]
    failed = [r for r in results if not r.success]

    ttfts = [r.ttft_ms for r in results if r.ttft_ms is not None]
    totals = [r.total_ms for r in results if r.total_ms is not None]

    avg_ttft = sum(ttfts) / len(ttfts) if ttfts else None
    max_ttft = max(ttfts) if ttfts else None
    avg_total = sum(totals) / len(totals) if totals else None
    max_total = max(totals) if totals else None

    ttft_pass = max_ttft is None or max_ttft < TTFT_TARGET_MS
    total_pass = max_total is None or max_total < TOTAL_STREAMING_TARGET_MS
    success_pass = len(failed) == 0

    print(f"\n{'USER':>5}  {'STATUS':>8}  {'TTFT(ms)':>10}  {'TOTAL(ms)':>12}  {'EVENTS':>7}  ERROR")
    for r in sorted(results, key=lambda x: x.user_id):
        status = "✓ OK" if r.success else "✗ FAIL"
        ttft_str = f"{r.ttft_ms:.0f}" if r.ttft_ms else "—"
        total_str = f"{r.total_ms:.0f}" if r.total_ms else "—"
        err_str = r.error or ""
        print(f"{r.user_id:>5}  {status:>8}  {ttft_str:>10}  {total_str:>12}  {r.events_received:>7}  {err_str}")

    print(f"\n── Aggregate Results ──────────────────────────────────────────────────")
    print(f"  Successful requests: {len(successful)}/{concurrency}   "
          f"{'✓ PASS' if success_pass else '✗ FAIL (failures detected)'}")
    print(f"  Avg TTFT:     {f'{avg_ttft:.0f}ms' if avg_ttft else 'N/A'} "
          f"| Max TTFT:  {f'{max_ttft:.0f}ms' if max_ttft else 'N/A'}   "
          f"(target <{TTFT_TARGET_MS}ms)  {'✓ PASS' if ttft_pass else '✗ FAIL'}")
    print(f"  Avg Total:    {f'{avg_total:.0f}ms' if avg_total else 'N/A'} "
          f"| Max Total: {f'{max_total:.0f}ms' if max_total else 'N/A'}   "
          f"(target <{TOTAL_STREAMING_TARGET_MS}ms)  {'✓ PASS' if total_pass else '✗ FAIL'}")
    print(f"  Wall-clock time for all {concurrency} concurrent requests: {wall_time:.0f}ms")
    print("=" * 70)

    return 0 if (success_pass and ttft_pass and total_pass) else 1


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Concurrent load test for the simulator.")
    parser.add_argument(
        "--base-url", default="http://localhost:8000",
        help="Base URL of the FastAPI server (default: http://localhost:8000)"
    )
    parser.add_argument(
        "--concurrency", type=int, default=10,
        help="Number of simultaneous users (default: 10)"
    )
    args = parser.parse_args()

    exit_code = asyncio.run(run_load_test(args.base_url, args.concurrency))
    sys.exit(exit_code)
