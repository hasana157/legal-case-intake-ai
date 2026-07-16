# Opposing-Argument Simulator — Complete A-Z Setup & Usage Guide

> **For self-represented litigants and developers alike.**
> This guide covers everything from zero to a live deployed system:
> getting the dataset, ingesting it into Qdrant, deploying the backend and
> frontend to Vercel, and using the app for hearing preparation.

---

## Table of Contents

1. [What You Are Building](#1-what-you-are-building)
2. [Architecture Overview](#2-architecture-overview)
3. [Prerequisites — Install These First](#3-prerequisites--install-these-first)
4. [One-Time Account Setup](#4-one-time-account-setup)
5. [Clone & Configure the Repository](#5-clone--configure-the-repository)
6. [Getting the Legal Dataset](#6-getting-the-legal-dataset)
7. [Ingesting Data into Qdrant with Google Colab](#7-ingesting-data-into-qdrant-with-google-colab)
8. [Running the App Locally (Development)](#8-running-the-app-locally-development)
9. [Deploying to Vercel (Production)](#9-deploying-to-vercel-production)
10. [Using the App — Workflow A to Z](#10-using-the-app--workflow-a-to-z)
11. [Running the Evaluation Suite](#11-running-the-evaluation-suite)
12. [Troubleshooting](#12-troubleshooting)

---

## 1. What You Are Building

The **Opposing-Argument Simulator** is a legal-tech tool that helps
self-represented litigants (people going to court without a lawyer)
**practise against the arguments the other side might use**.

It does four things:
1. **Extracts structured facts** from your narrative description of your case
2. **Retrieves relevant case law** from a vector database of legal authorities
3. **Generates opposing arguments** using an AI, each grounded in real citations
4. **Gives you a rebuttal workspace** to draft your own responses, then exports
   a PDF "Hearing Rehearsal Guide" to take to court

> ⚠️ **This is an educational tool only. It does not provide legal advice.**
> Always consult a qualified attorney for legal advice.

---

## 2. Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                         USER'S BROWSER                              │
│   Next.js Frontend (Vercel CDN)                                     │
│   • Intake form → Simulation page → Rebuttal workspace → PDF export│
└──────────────────────────┬──────────────────────────────────────────┘
                           │  HTTPS (SSE for streaming)
┌──────────────────────────▼──────────────────────────────────────────┐
│                     FastAPI Backend (Vercel Serverless)             │
│   /api/intake         → Groq LLM (fact extraction)                 │
│   /api/retrieve       → Qdrant Cloud (vector search)               │
│   /api/generate-*-v2  → Groq LLM (argument generation, streaming)  │
│   /api/rebuttal-hints → Groq LLM (guiding questions)               │
└──────────────┬───────────────────────────────┬──────────────────────┘
               │                               │
┌──────────────▼────────┐        ┌─────────────▼────────────────────┐
│  Groq Cloud API       │        │  Qdrant Cloud                    │
│  (Free tier LLM)      │        │  (Free 1GB vector database)      │
│  llama-3.3-70b        │        │  Populated via Google Colab      │
└───────────────────────┘        └──────────────────────────────────┘
```

**Key constraint:** All case data stays in your browser. The only data that
leaves is the momentary LLM call (stateless, no storage) and vector search
metadata. No case content is ever written to disk or logged server-side.

---

## 3. Prerequisites — Install These First

### On Your Local Machine

| Tool | Version | Download |
|---|---|---|
| **Node.js** | ≥ 18.x | [nodejs.org](https://nodejs.org) |
| **Python** | ≥ 3.11 | [python.org](https://python.org) |
| **Git** | Any | [git-scm.com](https://git-scm.com) |
| **pip** | Comes with Python | — |

Verify your installs:
```bash
node --version    # should print v18.x or higher
python --version  # should print 3.11.x or higher
git --version
```

---

## 4. One-Time Account Setup

You need **three free cloud accounts**. None require a credit card.

### A. Groq Cloud (Free LLM API)
1. Go to [console.groq.com](https://console.groq.com)
2. Sign up with Google or email
3. Go to **API Keys** → **Create API Key**
4. Name it `opposing-simulator` and copy the key (starts with `gsk_`)
5. **Save it somewhere safe** — you'll use it twice

Free tier limits: 30,000 tokens/minute, which is plenty for this app.

### B. Qdrant Cloud (Free Vector Database)
1. Go to [cloud.qdrant.io](https://cloud.qdrant.io)
2. Sign up with Google or email
3. Click **Create Cluster** → choose **Free tier** → name it `opposing-simulator-prod`
4. Wait ~1 minute for the cluster to start
5. On the cluster page, copy:
   - **Cluster URL** (looks like `https://xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx.us-east4-0.gcp.cloud.qdrant.io`)
   - **API Key** (click the key icon)
6. **Save both** — you'll use them in Step 5 and Step 7

### C. Vercel (Free Hosting)
1. Go to [vercel.com](https://vercel.com)
2. Sign up with your **GitHub account** (required — Vercel deploys from GitHub)
3. That's it for now — we'll come back to this in Step 9

### D. Google Account (for Colab)
You just need a regular Google account to use Google Colab. It's free.

---

## 5. Clone & Configure the Repository

```bash
# 1. Clone the repo
git clone https://github.com/hasana157/legal-case-intake-ai.git
cd legal-case-intake-ai

# 2. Create the backend .env file
# (Never commit this file — it's in .gitignore)
cd api
copy .env.example .env
```

Open `api/.env` in any text editor and fill in your keys:
```
GROQ_API_KEY=gsk_your_groq_key_here
QDRANT_URL=https://your-cluster.cloud.qdrant.io
QDRANT_API_KEY=your_qdrant_api_key_here
```

Then install backend Python dependencies:
```bash
# Still inside the api/ directory
pip install -r requirements.txt
```

Then install frontend Node dependencies:
```bash
cd ../frontend
npm install
```

---

## 6. Getting the Legal Dataset

You need **case law text** to populate the vector database so the simulator can
cite real authorities. Here are your options, from easiest to most complete:

### Option A — Harvard Case Law Access Project (Recommended, Free)
The best free source of US case law.

1. Go to [case.law](https://case.law)
2. Sign up for a free account
3. Go to [case.law/api](https://case.law/api/) and request an API key
4. You get **500 free cases/day** — more than enough

The Colab notebook (Step 7) will use this API automatically if you set
`CASELAW_API_KEY` as a Colab secret.

**Which jurisdictions?** For free tier Qdrant (1GB):
- Pick **1–2 US states** that are most relevant to your case type
- Recommended starter set: California + Federal (covers most landlord-tenant,
  employment, and small claims cases)

### Option B — CourtListener (Free, No API Key Needed)
[courtlistener.com/api](https://www.courtlistener.com/api/) — free REST API
for US court opinions. The Colab notebook supports this source too.

### Option C — Manual CSV Upload (Easiest for Testing)
If you just want to test the system quickly, you can upload a hand-curated CSV
with this format:
```csv
case_name,citation,court,decision_date,jurisdiction,text
"Smith v. Jones","123 Cal.App.3d 456","California Court of Appeal","2020-01-15","California","The court held that..."
```

The notebook has a cell to load from CSV too.

---

## 7. Ingesting Data into Qdrant with Google Colab

This step runs **once** (or whenever you want to add more case law).
It uses Google Colab's free GPU/CPU, so you don't need to install anything
heavy on your local machine.

### Step-by-Step

1. **Open Google Colab**: [colab.research.google.com](https://colab.research.google.com)

2. **Upload the notebook**:
   - In Colab, click **File → Upload notebook**
   - Upload `notebooks/caselaw_ingestion.ipynb` from the repo
   - (Or: File → Open notebook → GitHub → paste the repo URL → select the notebook)

3. **Set your secrets in Colab**:
   - On the left sidebar, click the 🔑 **key icon** ("Secrets")
   - Add three secrets (click "Add new secret" for each):
     | Name | Value |
     |---|---|
     | `QDRANT_URL` | Your Qdrant cluster URL from Step 4B |
     | `QDRANT_API_KEY` | Your Qdrant API key from Step 4B |
     | `CASELAW_API_KEY` | Your Harvard CaseLaw API key from Step 6A |
   - Toggle the 👁 "Notebook access" switch for each secret

4. **Configure the notebook** (Cell 2 — Configuration):
   ```python
   TARGET_JURISDICTIONS = ["California", "Federal"]  # Edit these
   CASES_PER_JURISDICTION = 200                       # 200 × 2 = 400 cases
   CHUNK_SIZE_TOKENS = 400                            # Keep under 512
   COLLECTION_NAME = "caselaw_authorities"            # Must match backend
   ```

5. **Run all cells**: Runtime → Run all (Ctrl+F9)

   What happens:
   - **Cell 1**: Installs qdrant-client and sentence-transformers
   - **Cell 2**: Configuration — reads your secrets
   - **Cell 3**: Creates/resets the Qdrant collection
   - **Cell 4**: Fetches cases from the API (takes 5–20 min depending on count)
   - **Cell 5**: Splits cases into chunks (400 token max)
   - **Cell 6**: Embeds chunks using `all-MiniLM-L6-v2` (the same model the backend uses)
   - **Cell 7**: Upserts all vectors into Qdrant Cloud
   - **Cell 8**: Verification query — confirms retrieval works

6. **Verify success**:
   At the end of Cell 8, you should see something like:
   ```
   ✓ Collection 'caselaw_authorities' has 1,847 vectors
   ✓ Test query returned 5 results for jurisdiction=California
   ✓ Top result: Smith v. Jones (0.89 score)
   Ingestion complete!
   ```

> **Important:** The `jurisdiction` field in every vector MUST exactly match the
> canonical values your backend expects. The notebook handles this automatically
> by normalising through `jurisdiction_validator.py`'s mapping. Do not edit the
> jurisdiction strings manually.

### Re-running Ingestion

You can re-run the notebook at any time to add more jurisdictions. It will NOT
duplicate vectors — the notebook uses upsert (update or insert), keyed on a
hash of the case citation + chunk index.

---

## 8. Running the App Locally (Development)

You need **two terminal windows** running simultaneously.

### Terminal 1 — Backend (FastAPI)

```bash
cd legal-case-intake-ai/api
# Activate a virtualenv if you use one (optional but recommended):
# python -m venv venv && venv\Scripts\activate   (Windows)
# python -m venv venv && source venv/bin/activate (Mac/Linux)

pip install -r requirements.txt
uvicorn api.main:app --reload --port 8000
```

You should see:
```
INFO:     Uvicorn running on http://127.0.0.1:8000 (Press CTRL+C to quit)
INFO:     Started reloader process
```

Verify the backend is alive: [http://localhost:8000/api/health](http://localhost:8000/api/health)
Expected response: `{"status":"ok","milestone":6,"version":"6.0.0",...}`

### Terminal 2 — Frontend (Next.js)

```bash
cd legal-case-intake-ai/frontend

# Create a local env file
echo "NEXT_PUBLIC_API_URL=http://localhost:8000" > .env.local

npm install
npm run dev
```

You should see:
```
ready - started server on http://localhost:3000
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 9. Deploying to Vercel (Production)

### Step 1 — Push to GitHub (if you forked)

If you're deploying your own fork:
```bash
cd legal-case-intake-ai
git add -A
git commit -m "feat: Milestone 6 complete — production hardened"
git push origin main
```

### Step 2 — Import to Vercel

1. Go to [vercel.com/new](https://vercel.com/new)
2. Click **"Import Git Repository"**
3. Select your `legal-case-intake-ai` repository
4. Vercel auto-detects it as a Next.js project. **Change the Root Directory**
   to `frontend` (click the pencil icon next to "Root Directory")
5. Click **Deploy** — the first deploy will likely fail because env vars aren't
   set yet. That's fine, continue to Step 3.

### Step 3 — Set Environment Variables

In Vercel dashboard → your project → **Settings → Environment Variables**:

| Name | Value | Environments |
|---|---|---|
| `GROQ_API_KEY` | `gsk_...` | Production, Preview |
| `QDRANT_URL` | `https://xxxx.cloud.qdrant.io` | Production, Preview |
| `QDRANT_API_KEY` | `ey...` | Production, Preview |
| `NEXT_PUBLIC_API_URL` | `https://your-app.vercel.app` | Production, Preview |

> For `NEXT_PUBLIC_API_URL`, use the Vercel deployment URL shown in the
> dashboard. It looks like `https://legal-case-intake-ai.vercel.app`.
> If you have a custom domain, use that instead.

### Step 4 — Redeploy

Go to **Deployments** tab → click the three dots on the latest deployment →
**Redeploy**. This picks up the new environment variables.

### Step 5 — Verify

Visit your Vercel URL + `/api/health`:
```
https://your-app.vercel.app/api/health
```
Should return `{"status":"ok","milestone":6,...}`

Also visit the homepage and go through the intake form with a test case.

---

## 10. Using the App — Workflow A to Z

Here is the full user journey from opening the app to walking into court:

### Step 1 — Read and Accept the Disclaimer

When you open the app, a disclaimer overlay appears explaining this is an
**educational simulation only**, not legal advice. You must click
**"I Understand and Agree"** to proceed. This cannot be skipped.

### Step 2 — Fill in the Case Intake Form

Go to `/intake` (or click "Start" on the homepage).

Fill in:
- **Your name** and **the other party's name**
- **Claim type** (tenancy dispute, employment, personal injury, etc.)
- **Jurisdiction** (the US state where your case is filed)
- **Key dates** (incident date, filing date, etc.)
- **Your narrative** — describe what happened in plain English. Be as detailed
  as possible. Example:
  > *"I rented a one-bedroom apartment from John Smith for 12 months ending
  > January 31, 2024. I vacated on time and left the unit clean. The landlord
  > has not returned my $1,500 security deposit and it has now been 35 days,
  > which exceeds the 21-day limit under California Civil Code Section 1950.5.
  > He has not provided any itemised deduction statement."*
- **Evidence** you have (photos, emails, receipts — list them)

Click **"Analyse My Case"**. The AI extracts structured facts (takes ~3–8 seconds).

### Step 3 — Review Extracted Facts

The system shows you what it understood:
- Parties involved
- Claim type classification
- Disputed facts it identified
- Evidence noted
- Any **missing context** it flagged (e.g., "We don't know if you gave written
  notice — this may be raised by the opposing side")

If anything is wrong, go back and edit your narrative. Then click
**"Retrieve Relevant Authorities"**.

### Step 4 — See Retrieved Case Law

The system searches the Qdrant database and returns the most relevant legal
authorities for your jurisdiction and claim type. You'll see:

- Case names and citations (e.g., "Granberry v. Islay Investments, 9 Cal.4th 738")
- The court that decided it
- A summary of the holding
- A relevance score (0–1)

This is the case law the AI will use to ground its arguments.

### Step 5 — Run the Opposing Argument Simulation

Click **"Simulate Opposition"**. You'll see:

1. A **"Retrieving authorities..."** heartbeat indicator
2. A **"Drafting arguments..."** indicator
3. The arguments **streaming in real-time** (like ChatGPT typing)
4. A **"Verifying citations..."** step after generation
5. The final G_v (Grounding Verification) score

Each argument shows:
- The **claim** the opposing side would make
- The **supporting authority** (case name, citation, relevant quote)
- The **argument type** (procedural, substantive, evidentiary)

> If G_v < 0.90, you'll see a "Regenerating..." message — the system is
> automatically retrying to improve citation quality. This is working as intended.

### Step 6 — Prepare Your Rebuttals

For each opposing argument, click **"Get Rebuttal Hints"**. The AI gives you
3–5 **guiding questions** to help you think through your response. It does NOT
write the rebuttal for you — that's intentional. Your rebuttal must be in your
own words.

Use the text box under each argument to draft your rebuttal. Write what you
would actually say at the hearing.

### Step 7 — Export Your Hearing Rehearsal Guide

Click **"Export PDF"** at the top of the rebuttal workspace. A PDF is generated
**entirely in your browser** (no data leaves your device) with:

- Case summary table
- Each opposing argument with its citation
- Your rebuttal notes
- Legal disclaimers
- The date

Print this PDF and bring it to your hearing. It's formatted to be readable at
a glance during a stressful courtroom situation.

---

## 11. Running the Evaluation Suite

These scripts verify the system's quality. Run them from the project root.

### Grounding Verification Eval (most important)
Tests that generated arguments actually cite the retrieved authorities.
Target: G_v ≥ 0.95 across all test cases.

```bash
# Make sure your api/.env is set up with GROQ + QDRANT credentials
cd legal-case-intake-ai
python evals/grounding_eval.py
```

Output: Console report + `evals/reports/grounding_report.csv`

### RAGAS-Style Quality Eval
Tests faithfulness (do arguments match their citations?) and context relevance
(are retrieved cases relevant?). Requires Groq API key.

```bash
python evals/ragas_eval.py
```

Output: `evals/reports/ragas_report.md`
Targets: Faithfulness > 0.80, Context Relevance > 0.75

### Concurrent Load Test
Tests that 10 simultaneous users don't cause timeouts.
**Requires the local backend to be running first** (see Step 8).

```bash
# Terminal 1: start the backend
uvicorn api.main:app --port 8000

# Terminal 2: run the load test
python evals/load_test.py --base-url http://localhost:8000 --concurrency 5
```

Targets: TTFT < 300ms, Total streaming < 3000ms, zero failures

---

## 12. Troubleshooting

### "Backend imports OK" but app crashes on startup
Check: Is `GROQ_API_KEY` set in `api/.env`? Run `cat api/.env` (Linux/Mac) or
`type api\.env` (Windows) to confirm.

### No arguments generated / "insufficient grounding"
The Qdrant collection is empty or not reachable. Check:
1. Is `QDRANT_URL` correctly set?
2. Did you run the Colab ingestion notebook? (Step 7)
3. Does the jurisdiction in your case match an ingested jurisdiction exactly?

Test Qdrant directly:
```bash
curl -H "api-key: YOUR_QDRANT_KEY" "YOUR_QDRANT_URL/collections/caselaw_authorities"
```
Should return `"status": "green"` and `vectors_count > 0`.

### Streaming stops mid-way / blank page
Likely a Vercel serverless timeout. Check:
- Is `maxDuration: 30` set in `vercel.json`? (It should be — check the file)
- Are you on the Vercel Hobby plan? Hobby limits functions to 10s by default;
  the `vercel.json` override should set it to 30s.

### Rate limit errors (HTTP 429)
You've hit 5 requests/minute from the same IP. Wait 60 seconds and try again.
This protects the free Groq quota. If you need more, edit the rate limit in
`api/main.py` (search for `"5/minute"`) after upgrading your Groq plan.

### Colab disconnects during ingestion
Colab free tier times out after ~90 minutes of inactivity. To avoid this:
1. Keep the Colab tab active in your browser
2. If it disconnects, just reconnect and re-run from the failed cell —
   the notebook uses upsert so it won't duplicate vectors

### PDF export produces blank pages
jsPDF requires the rebuttal workspace to have loaded arguments. Make sure you:
1. Completed the simulation (saw the "complete" event)
2. Are on the rebuttal page (not the simulation page)

### TypeScript / lint errors on `npm run build`
Run `npm run lint` in the `frontend/` directory to see specific errors.
The most common are unescaped quote characters in JSX — use `&quot;` instead of `"`.

---

## Quick Reference — Commands Cheat Sheet

```bash
# Development
uvicorn api.main:app --reload --port 8000    # Start backend
npm run dev                                   # Start frontend (in frontend/)

# Evaluation  
python evals/grounding_eval.py               # Grounding quality eval
python evals/ragas_eval.py                   # RAGAS faithfulness/relevance
python evals/load_test.py                    # Load test (backend must be running)

# Git
git add -A && git commit -m "msg"            # Stage + commit all
git push origin main                          # Push to GitHub (triggers Vercel deploy)

# Health check
curl http://localhost:8000/api/health         # Local
curl https://your-app.vercel.app/api/health  # Production
```

---

*Guide version: Milestone 6 — 2026-07-10*
*For the latest updates, check the project README on GitHub.*
