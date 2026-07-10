# DEPLOYMENT_CHECKLIST.md
# Opposing-Argument Simulator — Production Deployment Checklist
# =============================================================================
# Complete every item in this checklist before going live.
# Mark items with [x] as they are confirmed. Items marked [REQUIRED] will
# cause silent failures or data-privacy violations if skipped.
# =============================================================================

## 0. Prerequisites

- [ ] Git repository is clean (no uncommitted secrets or API keys)
- [ ] Python ≥ 3.11 and Node.js ≥ 18 are installed in the target environment
- [ ] `npm run build` passes with zero lint errors locally
- [ ] `python -m pytest api/tests/ -v` passes locally
- [ ] `python evals/grounding_eval.py` exits with code 0 (aggregate G_v ≥ 0.95)

---

## 1. Environment Variables

### Backend (Vercel → Settings → Environment Variables)

| Variable | Description | Required | Example |
|---|---|---|---|
| `GROQ_API_KEY` | Groq cloud API key for LLM extraction & generation | **[REQUIRED]** | `gsk_...` |
| `QDRANT_URL` | Qdrant Cloud cluster URL (from cloud.qdrant.io) | **[REQUIRED]** | `https://xxxx.cloud.qdrant.io` |
| `QDRANT_API_KEY` | Qdrant Cloud API key | **[REQUIRED]** | `ey...` |

> [!CAUTION]
> **NEVER** commit these values to `.env` files that are tracked by git.
> Vercel's secret injection keeps them out of the codebase and build logs.
> Rotate the Groq key if it is ever exposed.

### Frontend (Vercel → Settings → Environment Variables)

| Variable | Description | Required |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | Base URL of the deployed FastAPI backend (Vercel Python runtime URL) | **[REQUIRED]** |

> [!NOTE]
> The frontend reads `NEXT_PUBLIC_API_URL` at build time. If this is not set,
> API calls will 404. Set it to the Vercel deployment URL of the Python backend,
> e.g. `https://your-app.vercel.app`.

---

## 2. Vercel Configuration

### `vercel.json` (already in repo root — verify these settings)

```json
{
  "functions": {
    "api/**/*.py": {
      "runtime": "python3.11",
      "maxDuration": 30
    }
  },
  "rewrites": [
    { "source": "/api/(.*)", "destination": "/api/main.py" }
  ]
}
```

> [!IMPORTANT]
> **`maxDuration: 30` is required for SSE streaming.** Vercel serverless functions
> default to 10 seconds. The generation + verification pipeline needs up to 25 seconds
> under load. Set this to 30 (the maximum on hobby plans; upgrade to Pro for 60s).
> Without this, `generate-opposition-v2` will time out on complex cases.

### SSE Headers Verification

The `/api/generate-opposition-v2` route returns:
```
Cache-Control: no-cache
Connection: keep-alive
X-Accel-Buffering: no
```
Confirm these are forwarded correctly through Vercel's edge network by opening
the Network tab in Chrome DevTools and checking that the response type is
`EventStream`, not a buffered JSON blob.

---

## 3. Qdrant Cloud Collection Setup

> [!IMPORTANT]
> The vector database must be populated **before** the backend can retrieve case law.
> The FastAPI backend will return `insufficient_grounding: true` for all queries
> until the collection is seeded.

### Steps

1. **Create a Qdrant Cloud account** at [cloud.qdrant.io](https://cloud.qdrant.io)
2. **Create a free cluster** — name it `opposing-simulator-prod`
3. Copy the **Cluster URL** → `QDRANT_URL` environment variable
4. Copy the **API Key** → `QDRANT_API_KEY` environment variable
5. **Run the ingestion notebook** in Google Colab:
   - Open `notebooks/caselaw_ingestion.ipynb`
   - Set `QDRANT_URL` and `QDRANT_API_KEY` as Colab secrets
   - Set `TARGET_JURISDICTION` to your target state(s)
   - Run all cells — ingestion takes 20–60 minutes depending on dataset size
6. **Verify the collection** exists:
   ```bash
   curl -H "api-key: $QDRANT_API_KEY" \
     "$QDRANT_URL/collections/caselaw_authorities"
   ```
   Expected: `{"result": {"status": "green", "vectors_count": N, ...}}`

### Collection Schema

| Field | Type | Notes |
|---|---|---|
| `case_name` | keyword | Full case name, e.g. "Smith v. Jones" |
| `citation` | keyword | Citation string used for G_v verification |
| `court` | keyword | Court name |
| `decision_date` | keyword | ISO date string |
| `jurisdiction` | keyword | **Exact-match filter field** — must match the values in `jurisdiction_validator.py` |
| `text` | text | Case law chunk text (up to 512 tokens) |

> [!WARNING]
> The `jurisdiction` field must exactly match the canonical values from
> `api/services/jurisdiction_validator.py` (e.g. `"California"`, `"Federal"`).
> Mismatches will result in zero retrieval results for those jurisdictions.

---

## 4. Rate Limiting

The production backend uses `slowapi` to enforce **5 requests/minute per IP**
on the `/api/generate-opposition-v2` endpoint. This protects Groq free-tier
token quota (30,000 TPM) from abuse.

- [ ] Confirm `slowapi>=0.1.9` is in `api/requirements.txt`
- [ ] Verify `pip install -r api/requirements.txt` succeeds in the Vercel build
- [ ] Test rate limiting by sending 6+ rapid requests and confirming HTTP 429

If you upgrade to a paid Groq plan, increase the limit by editing the decorator
in `api/main.py` from `"5/minute"` to `"30/minute"` or higher.

---

## 5. Privacy & Data Architecture Verification

> [!CAUTION]
> The privacy architecture from Milestone 5 (NFR-3) must be intact before go-live.
> Violations could expose case facts of vulnerable self-represented litigants.

- [ ] **No case content in server logs**: Grep all log statements for `logger.info`,
  `logger.error`, `logger.warning` — confirm none contain `.narrative`, `.disputed_facts`,
  `.claim_text`, or raw argument text. Run:
  ```bash
  grep -n "logger\." api/main.py api/services/llm_service.py \
    api/services/retrieval_service.py api/services/citation_verifier.py
  ```
- [ ] **No server-side session storage**: Confirm FastAPI routes are stateless —
  no `SessionMiddleware`, no database writes of case content, no file writes.
- [ ] **No case content in rate limit keys**: Rate limit key is `get_remote_address`
  (client IP only), not any case field.
- [ ] **Frontend state only in memory**: Confirm `SessionContext` uses React `useState`
  (not `localStorage` or `sessionStorage`). Search for these terms in the frontend:
  ```bash
  grep -r "localStorage\|sessionStorage\|document.cookie" frontend/src/
  ```
  Expected: zero results (except the "Clear Session" button comment if any).

---

## 6. Disclaimer System Verification

- [ ] The `DisclaimerOverlay` appears on **every** page that shows case content or arguments
- [ ] The disclaimer **cannot be dismissed** without clicking "I Understand and Agree"
- [ ] The "I Understand" state is stored only in React in-memory session state
- [ ] Page refresh resets the disclaimer acknowledgment (intended behavior)
- [ ] The disclaimer text is sourced from `frontend/src/constants/legalNotices.ts`
  (single source of truth — no hardcoded disclaimer text in JSX)

---

## 7. Pre-Go-Live Smoke Tests

Run these manually after deploying to Vercel. The full URL will be your
Vercel deployment URL, e.g. `https://your-app.vercel.app`.

### 7.1 Health Check
```bash
curl https://your-app.vercel.app/api/health
```
Expected: `{"status": "ok", "milestone": 6, "version": "6.0.0", ...}`

### 7.2 Intake (Groq extraction)
```bash
curl -X POST https://your-app.vercel.app/api/intake \
  -H "Content-Type: application/json" \
  -d '{"parties":[{"name":"Test Plaintiff","role":"plaintiff"},{"name":"Test Defendant","role":"defendant"}],"claim_type":"tenancy","jurisdiction":"California","key_dates":[{"label":"Move-out","date":"2024-01-31"}],"narrative":"I rented an apartment from Test Defendant for one year. I moved out on January 31 2024 giving 30 days notice. The landlord has not returned my security deposit of $1,500 within 21 days as required by California Civil Code Section 1950.5.","evidence":[]}'
```
Expected: HTTP 200, `extraction_method: "groq_llm"`, `jurisdiction_validated: true`

### 7.3 SSE Streaming
Open Chrome DevTools → Network tab. Navigate to `/simulation-v2` and submit a case.
Confirm: response type is `EventStream`, events flow as `heartbeat → delta → complete`.

### 7.4 Rate Limit
```bash
for i in {1..6}; do curl -s -o /dev/null -w "%{http_code}\n" \
  -X POST https://your-app.vercel.app/api/generate-opposition-v2 \
  -H "Content-Type: application/json" -d '{}'; done
```
Expected: first 5 return 422 (bad input), 6th returns 429 (rate limited).

### 7.5 Qdrant Connectivity
```bash
curl -H "api-key: $QDRANT_API_KEY" "$QDRANT_URL/collections/caselaw_authorities"
```
Expected: `status: "green"`, `vectors_count > 0`

---

## 8. Monitoring & Alerting

> [!NOTE]
> These are recommendations for a production system. The free Vercel + Groq +
> Qdrant stack does not include native alerting — set these up manually.

### Structured Logs (already implemented)
Every request emits a structured log line:
```
2026-07-10T10:00:00  INFO  opposing_simulator  req=A1B2C3D4  HTTP POST /api/generate-opposition-v2 -> 200  latency=2340ms
```
- **Log key**: `req=` — correlate errors to specific requests
- **Log key**: `latency=` — alert if P95 > 5000ms
- **Log key**: `error_type=` — alert if non-zero count over 5-minute window

### Recommended Alerts (set up via Vercel Log Drains → Datadog / Logtail / Axiom)

| Alert | Threshold | Action |
|---|---|---|
| G_v score below 0.90 | Any single case in logs | Investigate retrieval quality |
| `RateLimitError` count | > 10/hour | Upgrade Groq plan or reduce load |
| `Qdrant search failed` | Any occurrence | Check Qdrant Cloud dashboard |
| HTTP 5xx rate | > 1% of requests | Check Vercel function logs |
| TTFT (time-to-first-token) | > 300ms P95 | Review Groq model or network |

### Uptime Monitoring
Set up an uptime monitor (e.g. [BetterStack](https://betterstack.com/uptime) free tier)
pinging `GET /api/health` every 5 minutes. Alert if response time > 3s or status != 200.

---

## 9. Post-Deployment Evaluation

After first deployment with real traffic:

1. **Re-run the grounding eval** against the production endpoint:
   ```bash
   python evals/grounding_eval.py
   ```
   Confirm aggregate G_v ≥ 0.95. If below threshold, check:
   - Qdrant collection ingestion completeness
   - Jurisdiction coverage in the dataset
   - LLM prompt adherence

2. **Run the RAGAS eval**:
   ```bash
   python evals/ragas_eval.py
   ```
   Confirm Faithfulness > 0.80 and Context Relevance > 0.75.

3. **Run the load test** against the live endpoint:
   ```bash
   python evals/load_test.py --base-url https://your-app.vercel.app --concurrency 5
   ```
   (Use 5, not 10, on free tier to avoid burning Groq quota in one shot.)

---

## 10. Final Sign-Off Checklist

| Item | Owner | Status |
|---|---|---|
| All environment variables set in Vercel | DevOps | [ ] |
| Qdrant collection seeded with target jurisdiction(s) | Data | [ ] |
| `npm run build` passes with zero errors | Frontend | [ ] |
| `python -m pytest api/tests/ -v` passes | Backend | [ ] |
| `grounding_eval.py` exits 0 (G_v ≥ 0.95) | QA | [ ] |
| Disclaimer overlay confirmed on all pages | QA | [ ] |
| Log audit: no case content in log statements | Security | [ ] |
| Rate limiting confirmed (HTTP 429 at 6th req) | Security | [ ] |
| Uptime monitor active on `/api/health` | DevOps | [ ] |
| Smoke tests 7.1–7.5 all passing | QA | [ ] |

---

*Generated by Milestone 6 of the Opposing-Argument Simulator build.*
*Last updated: 2026-07-10*
