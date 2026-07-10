#!/usr/bin/env python3
# =============================================================================
# evals/grounding_eval.py
# Milestone 6A — Automated Grounding Verification Evaluation
#
# Runs all 15 evaluation fixtures through the full pipeline
# (case parsing → retrieval → generation → citation verification) and computes
# per-case and aggregate G_v scores.
#
# Usage:
#   python evals/grounding_eval.py
#
# Exit codes:
#   0  — aggregate G_v >= 0.95 (CI pass)
#   1  — aggregate G_v < 0.95 or any pipeline error (CI fail)
#
# Outputs:
#   evals/reports/grounding_report.csv   — per-case results
#   evals/reports/grounding_summary.txt  — human-readable summary
# =============================================================================

from __future__ import annotations

import asyncio
import csv
import json
import os
import sys
import time
import traceback
from datetime import datetime, timezone
from pathlib import Path

# Ensure repo root is on sys.path
_ROOT = Path(__file__).resolve().parents[1]
if str(_ROOT) not in sys.path:
    sys.path.insert(0, str(_ROOT))

from dotenv import load_dotenv
load_dotenv(_ROOT / "api" / ".env")

from evals.fixtures import ALL_EVAL_CASES
from api.services.case_parser import extract_case_facts
from api.services.jurisdiction_validator import validate_jurisdiction
from api.services.retrieval_service import retrieve_authorities
from api.services.llm_service import generate_opposing_arguments_stream
from api.services.citation_verifier import verify_citations

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

REPORTS_DIR = _ROOT / "evals" / "reports"
REPORTS_DIR.mkdir(parents=True, exist_ok=True)

AGGREGATE_G_V_THRESHOLD = 0.95   # CI fails below this
PER_CASE_G_V_THRESHOLD = 0.90    # flag for manual review

# ---------------------------------------------------------------------------
# Pipeline runner
# ---------------------------------------------------------------------------

async def _run_one_case(raw_intake, labels: dict) -> dict:
    """
    Run a single case through the full pipeline and return a result dict.
    CRITIC 3: We never log raw case facts — only metadata (IDs, scores, counts).
    """
    case_id = labels["case_id"]
    result = {
        "case_id": case_id,
        "jurisdiction": labels["jurisdiction"],
        "expected_claim_type": labels["expected_claim_type"],
        "g_v_score": None,
        "num_arguments": 0,
        "num_citations_total": 0,
        "num_citations_unverified": 0,
        "below_threshold": False,
        "retrieval_count": 0,
        "retrieval_latency_ms": None,
        "generation_latency_ms": None,
        "ttft_ms": None,
        "error": None,
    }

    try:
        # ── Step 1: Parse ────────────────────────────────────────────────────
        _, jur_normalized = validate_jurisdiction(raw_intake.jurisdiction)
        raw_intake_norm = raw_intake.model_copy(
            update={"jurisdiction": jur_normalized}
        )
        structured, _method = extract_case_facts(raw_intake_norm)
        structured = structured.model_copy(
            update={"jurisdiction": jur_normalized, "jurisdiction_validated": True}
        )

        # ── Step 2: Retrieve ─────────────────────────────────────────────────
        t0 = time.monotonic()
        retrieval_resp = retrieve_authorities(structured, k=10)
        retrieval_latency_ms = (time.monotonic() - t0) * 1000
        result["retrieval_count"] = len(retrieval_resp.authorities)
        result["retrieval_latency_ms"] = round(retrieval_latency_ms, 1)

        if retrieval_resp.insufficient_grounding:
            # If we have no authorities, G_v would be 0.0 by definition — log and skip.
            result["g_v_score"] = 0.0
            result["below_threshold"] = True
            result["error"] = "insufficient_grounding"
            print(
                f"  [{case_id}] ⚠  Insufficient grounding — "
                f"{result['retrieval_count']} authorities retrieved."
            )
            return result

        # ── Step 3: Generate (stream and accumulate) ─────────────────────────
        full_text = ""
        first_token_received = False
        t_gen_start = time.monotonic()
        ttft_ms = None

        async for delta in generate_opposing_arguments_stream(
            structured, retrieval_resp.authorities, is_retry=False
        ):
            if not first_token_received and delta.strip():
                ttft_ms = (time.monotonic() - t_gen_start) * 1000
                first_token_received = True
            full_text += delta

        generation_latency_ms = (time.monotonic() - t_gen_start) * 1000
        result["generation_latency_ms"] = round(generation_latency_ms, 1)
        result["ttft_ms"] = round(ttft_ms, 1) if ttft_ms else None

        # ── Step 4: Parse JSON ───────────────────────────────────────────────
        clean = full_text.strip()
        if clean.startswith("```json"):
            clean = clean[7:]
        if clean.endswith("```"):
            clean = clean[:-3]
        generated_json = json.loads(clean)

        # ── Step 5: Verify ───────────────────────────────────────────────────
        verified_args, g_v = verify_citations(generated_json, retrieval_resp.authorities)

        # Count citations
        total_cit = sum(len(a.get("supporting_authority", [])) for a in verified_args)
        unverified_cit = sum(
            sum(1 for c in a.get("supporting_authority", []) if c.get("unverified"))
            for a in verified_args
        )

        result["g_v_score"] = round(g_v, 4)
        result["num_arguments"] = len(verified_args)
        result["num_citations_total"] = total_cit
        result["num_citations_unverified"] = unverified_cit
        result["below_threshold"] = g_v < PER_CASE_G_V_THRESHOLD

    except json.JSONDecodeError as e:
        result["error"] = f"json_parse_error: {type(e).__name__}"
        result["g_v_score"] = 0.0
        result["below_threshold"] = True
    except Exception as e:
        result["error"] = f"{type(e).__name__}: {str(e)[:120]}"
        result["g_v_score"] = 0.0
        result["below_threshold"] = True
        # CRITIC 3: Only log error type and case_id, never the exception message
        # (which could contain reproduced case text)
        print(f"  [{case_id}] ✗ Pipeline error: {type(e).__name__}")

    return result


async def run_eval() -> int:
    """Run the full evaluation and return exit code (0=pass, 1=fail)."""
    print("=" * 70)
    print("Opposing-Argument Simulator — Grounding Verification Evaluation")
    print(f"Run at: {datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')}")
    print(f"Cases:  {len(ALL_EVAL_CASES)}")
    print("=" * 70)

    results = []
    for idx, (raw_intake, labels) in enumerate(ALL_EVAL_CASES, 1):
        case_id = labels["case_id"]
        print(f"\n[{idx:02d}/{len(ALL_EVAL_CASES)}] {case_id} "
              f"({labels['jurisdiction']}, {labels['expected_claim_type']})")
        result = await _run_one_case(raw_intake, labels)
        results.append(result)

        g_v = result["g_v_score"]
        if result["error"] and result["error"] != "insufficient_grounding":
            print(f"  [{case_id}] ✗ Error: {result['error']}")
        elif g_v is not None:
            flag = "⚠  BELOW THRESHOLD" if result["below_threshold"] else "✓"
            print(
                f"  [{case_id}] {flag} G_v={g_v:.2%} | "
                f"args={result['num_arguments']} | "
                f"unverified={result['num_citations_unverified']}/{result['num_citations_total']} | "
                f"retrieval={result['retrieval_latency_ms']}ms | "
                f"gen={result['generation_latency_ms']}ms | "
                f"ttft={result['ttft_ms']}ms"
            )

    # ── Aggregate metrics ────────────────────────────────────────────────────
    scored = [r for r in results if r["g_v_score"] is not None]
    agg_g_v = sum(r["g_v_score"] for r in scored) / len(scored) if scored else 0.0
    below_threshold = [r for r in results if r["below_threshold"]]
    errored = [r for r in results if r["error"]]

    ttfts = [r["ttft_ms"] for r in results if r["ttft_ms"] is not None]
    avg_ttft = sum(ttfts) / len(ttfts) if ttfts else None
    gen_lats = [r["generation_latency_ms"] for r in results if r["generation_latency_ms"]]
    avg_gen = sum(gen_lats) / len(gen_lats) if gen_lats else None

    passed = agg_g_v >= AGGREGATE_G_V_THRESHOLD

    # ── Write CSV report ─────────────────────────────────────────────────────
    csv_path = REPORTS_DIR / "grounding_report.csv"
    fieldnames = [
        "case_id", "jurisdiction", "expected_claim_type", "g_v_score",
        "num_arguments", "num_citations_total", "num_citations_unverified",
        "below_threshold", "retrieval_count", "retrieval_latency_ms",
        "generation_latency_ms", "ttft_ms", "error",
    ]
    with open(csv_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(results)

    # ── Write text summary ───────────────────────────────────────────────────
    summary_lines = [
        "Opposing-Argument Simulator — Grounding Evaluation Summary",
        f"Run at: {datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')}",
        "=" * 60,
        f"Total cases evaluated:     {len(ALL_EVAL_CASES)}",
        f"Cases with scores:         {len(scored)}",
        f"Cases with errors:         {len(errored)}",
        f"",
        f"AGGREGATE G_v score:       {agg_g_v:.4f} ({agg_g_v:.2%})",
        f"CI threshold (>= 0.95):    {'PASS ✓' if passed else 'FAIL ✗'}",
        f"",
        f"Cases below 0.90 (manual review required):",
    ]
    if below_threshold:
        for r in below_threshold:
            summary_lines.append(
                f"  - {r['case_id']} ({r['jurisdiction']}): G_v={r['g_v_score']:.2%}"
                + (f" [error: {r['error']}]" if r["error"] else "")
            )
    else:
        summary_lines.append("  None — all cases meet the 0.90 per-case threshold.")

    summary_lines += [
        "",
        f"Latency (avg across cases with generation):",
        f"  Time to first token (TTFT): {f'{avg_ttft:.0f}ms' if avg_ttft else 'N/A'}  (target <300ms)",
        f"  Total generation time:      {f'{avg_gen:.0f}ms' if avg_gen else 'N/A'}  (target <3000ms)",
        "",
        f"Report written to: {csv_path}",
    ]

    summary_text = "\n".join(summary_lines)
    summary_path = REPORTS_DIR / "grounding_summary.txt"
    summary_path.write_text(summary_text, encoding="utf-8")

    print("\n" + "=" * 70)
    print(summary_text)
    print("=" * 70)

    return 0 if passed else 1


if __name__ == "__main__":
    exit_code = asyncio.run(run_eval())
    sys.exit(exit_code)
