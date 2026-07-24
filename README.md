# Opposing-Argument Simulator

**A jurisdiction-grounded RAG tool that simulates the opposing side's arguments for self-represented litigants.**

This README is based on a direct read of the codebase (not the project report), so the numbers below are what's actually in the repo today.

---

## What it actually does

A user describes their case in plain language through a multi-step intake form. The backend:

1. Extracts structured case facts (parties, claim type, jurisdiction, disputed facts, key dates) using an LLM, with a regex-based fallback if extraction fails.
2. Embeds those facts and queries a Qdrant vector database for matching California statutes and case law, filtered strictly by jurisdiction.
3. Feeds only the retrieved authorities to an LLM prompted to role-play opposing counsel, generating counter-arguments as an SSE stream.
4. Verifies every citation the model produces against the retrieved set. Anything not traceable back to a retrieved authority is flagged, and if grounding is too weak (fewer than 3 qualifying authorities), the system refuses to generate rather than guess.
5. Lets the user draft rebuttals per argument with LLM-generated hints, then export the whole session as a PDF (built client-side with jsPDF).

Everything is framed as case-preparation practice, not legal advice — there's a mandatory disclaimer modal and a persistent banner in the UI.

---

## Real vs. reported numbers

The project's own status report claims some things the code doesn't back up. Worth knowing before you trust either document:

| Claim | Report says | Codebase actually has |
|---|---|---|
| Knowledge base size | "500+" CA statutes/cases | **88 vectors** in the shipped local Qdrant snapshot (`api/qdrant_data`); `EVALUATION.md` itself describes the seed as "60+ real California precedents" plus a handful of statute sections |
| LLM provider | README says "Anthropic Claude API" | Code (`llm_service.py`, `requirements.txt`) calls **Groq's `llama-3.3-70b-versatile`** — no Anthropic SDK anywhere |
| Containerization | "Fully containerized," Docker + Railway deployment | **No `Dockerfile` or `docker-compose.yml` exists in the repo.** Deployment is actually configured for Vercel serverless (Python runtime) per `vercel.json` and `DEPLOYMENT_CHECKLIST.md` — Railway isn't referenced there at all |
| PDF export | Report lists it as "planned for next phase" | It's **already implemented** — `frontend/src/services/pdfExport.ts` using jsPDF + jspdf-autotable, wired into `export.tsx` |
| Grounding score (G_v = 0.83, 82% traceability) | Reported | **This one checks out.** `EVALUATION.md` and `evaluation/results_latest.json` agree scenario-by-scenario — real per-scenario data, not just a summary number |

Net effect: the eval methodology and hard-gate safety design are legitimate and match the code. The knowledge-base size, model provider, and deployment/containerization claims in the report are overstated or wrong.

---

## Architecture

```
Next.js 14 frontend (intake wizard, streaming argument display,
rebuttal builder, PDF export, dashboard, saved cases, retrieval-debug page)
        │
        ▼
FastAPI backend (api/main.py)
  ├─ /api/intake                    → LLM extraction → StructuredCaseV2
  ├─ /api/generate-opposition       → legacy Milestone-1 mock route (still present)
  ├─ /api/generate-opposition-v2    → real pipeline: retrieve → stream → verify
  ├─ /api/rebuttal-hints            → LLM-generated rebuttal starting points
  └─ /api/analyze-weaknesses        → post-session weakness analysis
        │
        ▼
Qdrant (local file-backed store by default, or Qdrant Cloud via env vars)
  collection: caselaw_authorities, 384-dim MiniLM embeddings
```

The backend was built up in explicit milestones (visible in code comments): scaffold → real intake extraction → Qdrant retrieval → SSE streaming + citation verification → rebuttal workspace/PDF export → rate limiting and hardening. The Milestone-1 mock route (`/api/generate-opposition`) is still in the codebase alongside the real one (`/api/generate-opposition-v2`) — it hasn't been removed.

---

## Tech stack (confirmed from code)

| Layer | Technology |
|---|---|
| Backend | Python 3.11, FastAPI, Uvicorn |
| LLM | Groq Cloud API, `llama-3.3-70b-versatile` |
| Embeddings | `sentence-transformers/all-MiniLM-L6-v2` |
| Vector DB | Qdrant (local file-mode by default; Qdrant Cloud if `QDRANT_URL` is set) |
| Rate limiting | slowapi |
| Frontend | Next.js 14, TypeScript, Tailwind CSS, Framer Motion |
| PDF export | jsPDF + jspdf-autotable (client-side) |
| Deployment | Vercel (both frontend and Python serverless functions), per `vercel.json` |

---

## Safety mechanisms actually in the code

- **Jurisdiction isolation:** retrieval applies a hard Qdrant metadata filter on jurisdiction before ranking — cases from the wrong state can't be retrieved (`retrieval_service.py`).
- **Insufficient-grounding gate:** fewer than 3 qualifying authorities → the SSE stream emits an `INSUFFICIENT_GROUNDING` error and stops instead of generating (`main.py`).
- **No-authorities gate:** zero retrieved authorities → `NO_AUTHORITIES` error, same refusal behavior.
- **Citation verification (G_v):** every citation the LLM outputs is checked against the exact retrieved set; unverified ones are flagged and drop the argument's confidence from High to Medium (`citation_verifier.py`).
- **Auto-retry on weak grounding:** if G_v < 0.90 on first generation, the pipeline regenerates once before finalizing.
- **Prompt-injection stripping:** free-text narrative fields are regex-scrubbed for common injection patterns (`"ignore previous instructions"`, `[SYSTEM]`, etc.) before reaching the LLM.
- **Logging discipline:** request middleware logs method/path/latency/status only — case narratives and generated argument text are explicitly never logged (called out in code comments as "CRITIC 3" compliance).

---

## Local setup

Requirements: Python 3.11+, Node.js 18+

```bash
# Backend
cd api
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
# .env needs: GROQ_API_KEY (required), QDRANT_URL + QDRANT_API_KEY (optional — falls back to local file-mode Qdrant)
uvicorn main:app --reload --port 8000

# Frontend
cd frontend
npm install
npm run dev      # http://localhost:3000
```

If `QDRANT_URL` isn't set, the backend uses the pre-seeded local snapshot in `api/qdrant_data/` (88 vectors) rather than a live cluster — fine for trying it out, but that's the actual size of the knowledge base you'll be querying against, not 500+.

To reseed or expand the knowledge base: `api/scripts/build_knowledge_base.py`, plus separate ingestion scripts for CA statutes, CourtListener, and Case Access Project (CAP) case law.

---

## What's genuinely solid here

- The hard-gate refusal logic is real, tested against actual scenarios, and matches its own evaluation data.
- The frontend is considerably more built-out than "MVP" implies — dashboard, saved cases, a retrieval-debug page, streaming argument display, and a working PDF export all exist.
- The evaluation numbers (G_v = 0.83, 18/22 citations traceable) are reproducible from `evaluation/results_latest.json`, not just asserted.

## What to fix before calling it production-ready

- Reseed with a knowledge base that actually matches the "500+" claim, or correct the claim.
- Decide on and document the actual LLM provider (Groq, currently) instead of referencing Anthropic Claude in user-facing docs.
- Either add the Dockerfile/docker-compose the docs promise, or drop the containerization claims and document the real Vercel serverless deployment path.
- Remove or clearly deprecate the Milestone-1 mock route so it can't be hit in production by mistake.
