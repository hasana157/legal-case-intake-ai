# 📓 Notebooks — Harvard CAP Ingestion Pipeline

This directory contains the Google Colab notebook that populates **Qdrant Cloud**
with 50,000+ court opinions from the Harvard Caselaw Access Project (CAP).
Running this notebook is the **critical prerequisite** for enabling RAG-grounded
legal argument generation in the Opposing-Argument Simulator.

---

## Why This Matters

Without this pipeline, the app defaults to ungrounded generation:

```
QDRANT_SKIP_RETRIEVAL=true  ← default (before ingestion)
  → Qdrant returns []
  → LLM has no legal authorities
  → G_v (grounding score) = 0.0
  → HALLUCINATED arguments ❌
```

After running this pipeline:

```
QDRANT_SKIP_RETRIEVAL=false  ← after ingestion
  → Qdrant returns 10 real cases per query
  → LLM cites actual case law
  → G_v score ≥ 0.90 ✅
```

---

## Files

| File | Description |
|------|-------------|
| [`caselaw_ingestion.ipynb`](./caselaw_ingestion.ipynb) | Main ingestion notebook (open in Google Colab) |
| `README.md` | This file |

> **Legacy:** `milestone3_ingestion.ipynb` was the original prototype. It used hardcoded
> credentials and was limited to 500 California cases. Use `caselaw_ingestion.ipynb` instead.

---

## Quick Start (≈ 10 minutes setup, ~60 minutes ingestion)

### Step 1 — Create Qdrant Cloud Account (5 min)

1. Go to [cloud.qdrant.io](https://cloud.qdrant.io/)
2. Sign up (free — no credit card required)
3. Click **Create Cluster**
   - Name: `opposing-simulator-prod`
   - Cloud: any (AWS us-east is recommended for low latency from Vercel)
   - Size: free tier (1 node, 1 GB RAM) — sufficient for 50k vectors
4. Wait ~2 minutes for the cluster to provision
5. Copy:
   - **Cluster URL** — looks like `https://xxxx-yyyy.us-east-1-0.aws.cloud.qdrant.io`
   - **API Key** — looks like `eyJhbGciOiJIUzI1NiJ9...`

> [!IMPORTANT]
> Keep your API key safe. Never commit it to git. You'll add it as a **Colab Secret**,
> not paste it into the notebook code.

---

### Step 2 — Open Notebook in Google Colab (2 min)

**Option A (Recommended): GitHub import**

1. Go to [colab.research.google.com](https://colab.research.google.com/)
2. Click **File → Open notebook**
3. Select the **GitHub** tab
4. Enter repo: `hasana157/legal-case-intake-ai`
5. Select: `notebooks/caselaw_ingestion.ipynb`
6. Click **Open**

**Option B: Direct URL**

Click this badge to open instantly:

[![Open In Colab](https://colab.research.google.com/assets/colab-badge.svg)](https://colab.research.google.com/github/hasana157/legal-case-intake-ai/blob/main/notebooks/caselaw_ingestion.ipynb)

---

### Step 3 — Add Colab Secrets (2 min)

> [!IMPORTANT]
> Do NOT paste your credentials into the notebook cells — they'd be visible in
> your notebook history and GitHub. Use Colab Secrets instead.

1. In the left sidebar of Colab, click the **🔐 Secrets** icon (key icon)
2. Click **+ Add new secret**
3. Add the first secret:
   - **Name:** `QDRANT_URL`
   - **Value:** `https://xxxx-yyyy.us-east-1-0.aws.cloud.qdrant.io`
4. Toggle **"Allow notebook access"** to ON
5. Click **+ Add new secret** again
6. Add the second secret:
   - **Name:** `QDRANT_API_KEY`
   - **Value:** `eyJh...your-full-api-key...`
7. Toggle **"Allow notebook access"** to ON

---

### Step 4 — Run All Cells (45–60 min)

1. Click **Runtime → Run all** (or `Ctrl+F9`)
2. Watch the progress messages in Cell 7 (the main ingestion cell)

**Expected output per progress checkpoint:**
```
🔄 Starting ingestion → target: 50,000 cases
   Batch size: 64 points | Embed batch: 32 sentences
   Progress printed every 2,000 cases
------------------------------------------------------------
✅  2,000 cases |   5,800 vectors | 1.1 cases/s | ~41 min remaining
✅  4,000 cases |  11,600 vectors | 1.1 cases/s | ~40 min remaining
...
✅ 50,000 cases | 145,000 vectors | 1.1 cases/s | ~0 min remaining

============================================================
🎉 INGESTION COMPLETE
============================================================
  Cases processed :  50,000
  Vectors uploaded:  ~145,000
  Cases skipped   :  ~2,100 (no usable text)
  Errors          :  ~50
  Total time      :  47.3 minutes
  Avg rate        :  17.65 cases/sec
============================================================
```

> [!NOTE]
> The number of vectors is higher than cases because each case is chunked into
> multiple overlapping segments. This improves retrieval precision.

---

### Step 5 — Update Your `.env` (2 min)

In `api/.env` (create from `api/.env.example` if it doesn't exist):

```bash
# Qdrant Vector Database — populated by notebooks/caselaw_ingestion.ipynb
QDRANT_URL=https://xxxx-yyyy.us-east-1-0.aws.cloud.qdrant.io
QDRANT_API_KEY=eyJh...your-key...
```

> [!NOTE]
> Do **not** set `QDRANT_SKIP_RETRIEVAL=true`. The app automatically uses Qdrant
> when `QDRANT_URL` and `QDRANT_API_KEY` are set.

---

### Step 6 — Verify RAG Works (5 min)

Start the backend and test retrieval:

```bash
# Start backend
cd api
uvicorn main:app --reload --port 8000
```

```bash
# Test retrieval endpoint
curl -X POST http://localhost:8000/api/retrieve \
  -H 'Content-Type: application/json' \
  -d '{
    "case_id": "test-001",
    "claim_type": "tenancy",
    "jurisdiction": "California",
    "disputed_facts": ["landlord failed to return security deposit within 21 days"],
    "parties": [],
    "key_dates": [],
    "raw_narrative": "My landlord did not return my security deposit.",
    "jurisdiction_validated": true,
    "missing_context": [],
    "extraction_confidence": 1.0
  }'
```

**Expected response:**
```json
{
  "case_id": "test-001",
  "authorities": [
    {
      "case_name": "...",
      "citation": "...",
      "jurisdiction": "California",
      "similarity_score": 0.87
    }
  ],
  "insufficient_grounding": false,
  "message": "Found 10 relevant authorities in California."
}
```

---

## Configuration Reference

These parameters in Cell 2 of the notebook can be adjusted:

| Parameter | Default | Description |
|-----------|---------|-------------|
| `MAX_CASES` | `50_000` | Total cases to ingest (increase for better coverage) |
| `BATCH_SIZE` | `64` | Points per Qdrant upsert call |
| `EMBED_BATCH_SIZE` | `32` | Sentences per `encode()` call |
| `CHUNK_SIZE_CHARS` | `1800` | Max characters per chunk |
| `CHUNK_OVERLAP_CHARS` | `150` | Character overlap between chunks |
| `PROGRESS_INTERVAL` | `2_000` | Print progress every N cases |

---

## Troubleshooting

### ❌ "QDRANT_URL and QDRANT_API_KEY must be set"

You haven't added the Colab Secrets yet. See Step 3 above.

Make sure you toggled **"Allow notebook access"** ON for both secrets.

---

### ❌ "Cannot reach Qdrant Cloud"

- Check that your cluster is in **green** status on [cloud.qdrant.io](https://cloud.qdrant.io/)
- Verify the URL format: `https://xxxx-yyyy.us-east-1-0.aws.cloud.qdrant.io` (no trailing slash)
- Regenerate the API key in the Qdrant Cloud dashboard and re-add to Colab Secrets

---

### ❌ Colab session disconnects during ingestion

Colab free tier disconnects after ~90 minutes of inactivity. To resume:

1. Re-run cells 1–6 (they're fast — seconds each)
2. Note the existing vector count from Cell 8
3. Re-run Cell 7 — UPSERT operations are idempotent (stable IDs prevent duplicates)
4. The ingestion will skip already-uploaded vectors and continue from where it left off

---

### ⚠️ "Only N vectors" — fewer than expected

The CAP dataset includes many cases with empty or redacted opinions. The notebook
skips these automatically. A ~5% skip rate is normal.

If you see a very high skip rate (>50%), check that the dataset download completed
correctly. Try re-running Cell 7 after restarting the Colab session.

---

### ⚠️ Retrieval returns 0 results for a jurisdiction

The `jurisdiction` payload field in Qdrant must **exactly match** the canonical
values used by `api/services/jurisdiction_validator.py`.

1. Run Cell 10 (Jurisdiction Coverage Report) to see what jurisdiction strings are in Qdrant
2. Compare with the canonical names in [`jurisdiction_validator.py`](../api/services/jurisdiction_validator.py)
3. If there's a mismatch, add an alias to `jurisdiction_validator.py`

---

## Technical Architecture

```
Hugging Face (streaming)
  └─ free-law/Caselaw_Access_Project
       │
       ▼ extract_chunks()
  Per-case chunking
  ├─ RecursiveCharacterTextSplitter (1800 chars, 150 overlap)
  ├─ Metadata: case_name, citation, court, decision_date, jurisdiction, claim_type
  └─ Stable UUID (MD5 of citation+chunk_index — idempotent upserts)
       │
       ▼ SentenceTransformer('all-MiniLM-L6-v2')
  384-dim normalized embeddings
       │
       ▼ qdrant_client.upsert()
  Qdrant Cloud collection: "caselaw_authorities"
  └─ COSINE distance (requires normalize_embeddings=True)
       │
       ▼ retrieval_service.py
  Jurisdiction-filtered ANN search
  └─ score_threshold=0.60, limit=10
       │
       ▼ llm_service.py
  Groq Llama 3.3 — grounded generation
       │
       ▼ citation_verifier.py
  G_v score computation → must be ≥ 0.90
```

---

## Data Source

- **Dataset:** `free-law/Caselaw_Access_Project` on Hugging Face
- **Source:** Harvard Law School Caselaw Access Project
- **License:** Cases are public domain (US court opinions are not subject to copyright)
- **Size:** 6.7M total opinions; this notebook ingests 50,000 (configurable)
- **Coverage:** All US state and federal courts

---

*Last updated: 2026-07-16 | Milestone 3 — Jurisdiction-Grounded Retrieval Layer*
