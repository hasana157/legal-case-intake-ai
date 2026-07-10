# Opposing-Argument Simulator

> **Legal-tech generative-AI platform** that lets self-represented litigants rehearse their case against a simulated opposing counsel.

**Status:** Milestone 1 — Scaffold & Pipeline ✅  
**Stack:** Next.js 14 + TypeScript · FastAPI · Vercel Serverless  
**Author:** Hasana Zahid · COMSATS University Islamabad · SP24-BAI-060

---

## Project Overview

Self-represented litigants (people without lawyers) are at a severe disadvantage in court. This tool lets them:

1. **Submit** their case facts through a guided intake form
2. **Receive** a set of AI-generated opposing arguments (simulating what the other side might argue)
3. **Practise rebuttals** so they walk into court better prepared

> **IMPORTANT:** This is an educational simulation only — not legal advice.

---

## Repository Structure

```
opposing-simulator/
├── vercel.json           # Vercel routing (API → FastAPI, / → Next.js)
├── .gitignore
├── .env.example          # Copy to .env and fill in keys
├── README.md
│
├── frontend/             # Next.js 14 + TypeScript + Tailwind CSS
│   ├── package.json
│   ├── tsconfig.json
│   ├── next.config.js
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   └── src/
│       ├── pages/        # / · /intake · /simulation
│       ├── components/   # Layout, CaseIntakeForm, ArgumentDisplay …
│       ├── services/     # api.ts — axios wrapper
│       ├── types/        # index.ts — shared TypeScript interfaces
│       └── styles/       # globals.css
│
└── api/                  # FastAPI (Vercel Python Serverless)
    ├── main.py           # All routes: /health · /intake · /generate-opposition
    └── requirements.txt
```

---

## Milestone Roadmap

| # | Milestone | Status |
|---|-----------|--------|
| 1 | Scaffold & Deployment Pipeline | ✅ This release |
| 2 | Vector DB & Real Legal Data (Qdrant + Harvard CAP) | 🔜 |
| 3 | Claude AI Integration & Streaming | 🔜 |
| 4 | Citation Engine & PDF Export | 🔜 |
| 5 | Full Legal Disclaimer & Bias Audit | 🔜 |
| 6 | Production Hardening & Launch | 🔜 |

---

## Local Development

### Prerequisites

- Node.js ≥ 18
- Python ≥ 3.11
- Git

### 1 — Clone & Configure

```bash
git clone https://github.com/<your-username>/opposing-simulator.git
cd opposing-simulator

# Copy environment template
cp .env.example .env
# (fill in keys — all optional for Milestone 1)
```

### 2 — Frontend

```bash
cd frontend
npm install
npm run dev          # → http://localhost:3000
```

### 3 — Backend

```bash
cd api
python -m venv venv

# Windows
venv\Scripts\activate

# macOS / Linux
source venv/bin/activate

pip install -r requirements.txt
uvicorn main:app --reload --port 8000
# → http://localhost:8000
# → http://localhost:8000/docs  (Swagger UI)
```

> The Next.js dev server automatically proxies `/api/*` to `localhost:8000` — no CORS issues locally.

### 4 — Verify Everything Works

```bash
# Health check
curl http://localhost:8000/api/health

# Case intake (mock)
curl -X POST http://localhost:8000/api/intake \
  -H "Content-Type: application/json" \
  -d '{
    "plaintiff_name": "Jane Smith",
    "defendant_name": "Acme Corp",
    "claim_type": "breach_of_contract",
    "jurisdiction": "California",
    "filing_date": "2024-01-15",
    "incident_date": "2023-11-01",
    "facts": "Defendant failed to deliver goods as specified in the signed contract dated October 1, 2023.",
    "relief_sought": "Compensatory damages of $50,000"
  }'

# Generate opposition (mock)
curl -X POST http://localhost:8000/api/generate-opposition \
  -H "Content-Type: application/json" \
  -d '{
    "case_id": "MOCK-001",
    "case_input": {
      "plaintiff_name": "Jane Smith",
      "defendant_name": "Acme Corp",
      "claim_type": "breach_of_contract",
      "jurisdiction": "California",
      "filing_date": "2024-01-15",
      "incident_date": "2023-11-01",
      "facts": "Defendant failed to deliver goods.",
      "relief_sought": "Damages of $50,000"
    }
  }'
```

---

## Deployment to Vercel

### Option A — Vercel CLI (Recommended)

```bash
# Install Vercel CLI globally
npm install -g vercel

# From repo root
vercel login
vercel link          # link to your Vercel project
vercel env add ANTHROPIC_API_KEY
vercel env add QDRANT_URL
vercel env add QDRANT_API_KEY
vercel --prod        # deploy to production
```

### Option B — Vercel Dashboard

1. Push this repo to GitHub
2. Go to [vercel.com/new](https://vercel.com/new) → Import Repository
3. Set **Root Directory** to `.` (project root)
4. Add Environment Variables from `.env.example`
5. Click **Deploy**

### Post-Deployment Verification

After deploy, verify these URLs (replace with your live URL):

```
https://your-app.vercel.app/            → Landing page
https://your-app.vercel.app/intake      → Case intake form
https://your-app.vercel.app/simulation  → Simulation page
https://your-app.vercel.app/api/health  → {"status":"ok","milestone":1}
```

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `ANTHROPIC_API_KEY` | Milestone 3+ | Claude API key |
| `QDRANT_URL` | Milestone 2+ | Qdrant cluster URL |
| `QDRANT_API_KEY` | Milestone 2+ | Qdrant API key |
| `NEXT_PUBLIC_API_BASE_URL` | Optional | Override API base URL |

---

## API Reference

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/health` | Health check |
| `POST` | `/api/intake` | Submit case intake |
| `POST` | `/api/generate-opposition` | Generate opposing arguments |

Full interactive docs at `/docs` (local) or `/api/docs` (if configured).

---

## Technology Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Frontend | Next.js + TypeScript | 14.0.3 |
| Styling | Tailwind CSS | 3.4.1 |
| HTTP Client | Axios | 1.6.2 |
| Backend | FastAPI | 0.104.1 |
| Server | Uvicorn (ASGI) | 0.24.0 |
| Validation | Pydantic v2 | 2.5.0 |
| Hosting | Vercel Serverless | — |

---

## License

MIT — see [LICENSE](LICENSE) for details.

> **Disclaimer:** This software is for educational simulation purposes only. It does not constitute legal advice. Always consult a qualified attorney for legal matters.
