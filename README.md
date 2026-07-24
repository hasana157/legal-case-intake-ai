# Opposing-Argument Simulator

> Intelligent adversarial case preparation for self-represented litigants

[![Python](https://img.shields.io/badge/python-3.11+-blue.svg)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.111+-green.svg)](https://fastapi.tiangolo.com/)
[![Next.js](https://img.shields.io/badge/Next.js-14+-black.svg)](https://nextjs.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

## Problem Statement

Self-represented litigants face an insurmountable structural disadvantage: they enter hearings without knowledge of the opposing party's likely arguments, counterevidence, or precedents—often facing counsel armed with legal expertise and discovery.

Existing legal-tech solutions address only half the problem:
- **Document assembly tools** help draft filings
- **Legal guides** explain procedures in plain language
- **None** simulate realistic adversarial responses

This creates a preparation gap that undermines access to justice.

---

## Solution Overview

The **Opposing-Argument Simulator** bridges this gap by delivering jurisdiction-grounded adversarial preparation in four stages:

1. **Guided Intake** – Converts plain-language case narrative into structured facts
2. **Jurisdiction-Specific Retrieval** – Retrieves 500+ real California statutes and case law via RAG
3. **Adversarial Simulation** – Generates opposing counsel's likely arguments, objections, and counterevidence
4. **Rebuttal Preparation** – Helps litigants draft rebuttals with safety framing and mandatory disclaimers

**Key Innovation:** A hard-gate verification system prevents hallucinated citations. If the system cannot ground an argument in retrieved law, it refuses to include it—no confident fabrications.

---

## Features

| Feature | Benefit |
|---------|---------|
| **Multi-Step Intake Wizard** | Extracts structured case facts from unstructured narrative without requiring legal knowledge |
| **Real Legal Knowledge Base** | 500+ jurisdiction-verified California statutes and case law entries |
| **Strict Jurisdiction Filtering** | Retrieves only applicable law; eliminates cross-jurisdiction confusion |
| **Adversarial Role-Play Engine** | Simulates opposing counsel's arguments grounded in retrieved authorities |
| **Citation Verification Gate** | Every argument is checked against source material; unverifiable claims are flagged or rejected |
| **Confidence Scoring** | Each argument includes a confidence level tied to source traceability |
| **Structured Rebuttal Builder** | Per-argument rebuttal drafting with AI-generated preparation hints |
| **PDF Export & Court Ready** | Generates printable preparation report with mandatory legal disclaimer |
| **Mandatory Safety Framing** | Full-screen disclaimer + persistent banner—users cannot miss "not legal advice" notice |

---

## How It Works

### Stage 1: Guided Intake & Fact Structuring

Users walk through a conversational wizard:
- **Case Type** (small claims, landlord–tenant, family court, etc.)
- **Parties** (names, roles)
- **Jurisdiction** (state, county)
- **Facts** (plain-language narrative)
- **Dates & Timeline** (key events)
- **Evidence** (documents, communications, witnesses)

The LLM extracts a structured schema (`StructuredCaseV2`) containing jurisdiction, claim type, parties, disputed facts, and key evidence. This ensures the system has a consistent, machine-readable representation before proceeding.

### Stage 2: Jurisdiction-Grounded Retrieval

The structured facts are embedded and queried against a **Qdrant vector database** containing 500+ real California statutes and case law. A hard metadata filter ensures:
- Only laws from the selected jurisdiction are retrieved
- Outdated or repealed statutes are excluded
- Confidence scoring reflects source reliability

This step eliminates the hallucination risk endemic to general-purpose LLMs interrogating undefined legal knowledge.

### Stage 3: Adversarial Simulation & Verification

The LLM is prompted to role-play opposing counsel using only the retrieved authorities. It generates:
- Counter-arguments
- Procedural objections
- Counterevidence
- Requested remedies

A **hard-gate verifier** then validates every citation:
- **High Confidence** – Citation exists and is accurately summarized in the knowledge base
- **Low / Unverified** – Citation could not be traced; the argument is flagged
- **No Grounding** – If insufficient law is found, the simulation is refused entirely with a clear error message

### Stage 4: Rebuttal Preparation & Export

Users review each opposing argument alongside:
- The source statute or case law
- Confidence level and traceability
- AI-generated rebuttal hints

They can then draft rebuttals in a structured builder and export a complete preparation report (PDF) that includes a mandatory legal disclaimer and remains court-ready.

---

## Technical Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend (Next.js 14)                   │
│         Intake Wizard  │  Simulation Display  │  Export     │
└──────────────┬──────────────────────────────────────────────┘
               │
┌──────────────▼──────────────────────────────────────────────┐
│                 Backend API (FastAPI)                       │
│  ┌──────────────┬────────────────┬────────────────────────┐ │
│  │ Case Intake  │  RAG Pipeline  │ Adversarial Engine    │ │
│  │ (LLM Extract)│ (Qdrant Query) │ (Role-Play + Verify)  │ │
│  └──────────────┴────────────────┴────────────────────────┘ │
└──────────────┬──────────────────────────────────────────────┘
               │
┌──────────────▼──────────────────────────────────────────────┐
│             Knowledge Base (Qdrant Vector DB)               │
│  500+ California Statutes & Case Law (Jurisdiction-Tagged)  │
└─────────────────────────────────────────────────────────────┘
```

### Technology Stack

- **Backend:** Python 3.11, FastAPI, Anthropic Claude API
- **Frontend:** Next.js 14, React, Tailwind CSS
- **Vector Database:** Qdrant
- **Containerization:** Docker, docker-compose
- **Deployment:** Railway (backend), Vercel (frontend)

---

## Quick Start

### Prerequisites
- Python 3.11+
- Node.js 18+
- Docker (for Qdrant)
- API keys: Anthropic Claude API

### 1. Clone & Install

```bash
git clone https://github.com/yourusername/opposing-argument-simulator.git
cd opposing-argument-simulator
```

### 2. Set Up Qdrant & Knowledge Base

**Option A: Qdrant Cloud (Recommended)**

1. Create a free cluster at [cloud.qdrant.io](https://cloud.qdrant.io)
2. Copy the API URL and API key
3. Create `api/.env`:
   ```
   QDRANT_URL=https://your-cluster.qdrant.io
   QDRANT_API_KEY=your-api-key
   ANTHROPIC_API_KEY=your-anthropic-key
   ```

**Option B: Local Qdrant via Docker**

```bash
docker run -p 6333:6333 qdrant/qdrant
```

Then update `api/.env`:
```
QDRANT_URL=http://localhost:6333
ANTHROPIC_API_KEY=your-anthropic-key
```

### 3. Seed the Knowledge Base

```bash
cd api
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
python scripts/build_knowledge_base.py
```

### 4. Start the Backend

```bash
cd api
uvicorn main:app --reload --port 8000
```

Backend will be available at `http://localhost:8000`

### 5. Start the Frontend

In a new terminal:

```bash
cd frontend
npm install
npm run dev
```

Frontend will be available at `http://localhost:3000`

### 6. First Run

- Navigate to `http://localhost:3000`
- Accept the mandatory disclaimer
- Begin your case intake

---

## Evaluation Results

**Test Set:** 10 realistic California landlord–tenant and small-claims scenarios

| Metric | Result |
|--------|--------|
| **Average Grounding Score (G_v)** | 0.83 |
| **Scenarios with G_v ≥ 0.90** | 6 / 10 (60%) |
| **Citations Traceable to Knowledge Base** | 18 / 22 (82%) |
| **Hallucinated Cases / Statutes** | 0 |
| **User Comprehension (Post-Sim)** | 87% reported improved case understanding |

**Key Finding:** The hard-gate architecture successfully prevents confident hallucinations. When grounding is weak, the system either refuses the simulation or explicitly marks arguments as unverified.

📄 **Full Evaluation Report:** See `evaluation/EVALUATION.md`

---

## Ethical Framework & Safety

This tool is explicitly **not a substitute for professional legal advice**. It is a case-preparation practice aid for self-represented litigants.

### Built-In Safeguards

✅ **Mandatory Disclaimer Modal** – Full-screen notice on app launch; users must acknowledge before proceeding  
✅ **Persistent Safety Banner** – "This tool provides case-preparation practice, not legal advice. Consult an attorney."  
✅ **Grounding Verification** – No simulation is generated without jurisdiction-specific legal grounding  
✅ **Citation Transparency** – Every argument is traceable to a source; unverified claims are flagged  
✅ **No PII Collection** – Unless explicitly consented, no personally identifiable information is stored  
✅ **Clear Export Disclaimer** – PDF reports include mandatory legal warning  

### User Responsibility

Self-represented litigants should:
- Verify all critical arguments with an attorney or legal aid organization before relying on them in court
- Treat this tool as a preparation aid, not legal counsel
- Seek professional review of any arguments before filing or presenting in court

---

## Proposal Alignment

This implementation fulfills all objectives and expected outcomes from the original research proposal:

| Proposal Objective | Implementation Status |
|------|------|
| Case intake & fact structuring | ✅ Multi-step wizard + LLM extraction to structured schema |
| Jurisdiction-grounded retrieval | ✅ RAG pipeline over 500+ California entries with strict metadata filtering |
| Opposing-argument simulation engine | ✅ Adversarial prompt with citation-constrained generation + role-play |
| Rebuttal preparation & safety framing | ✅ Structured rebuttal builder + mandatory disclaimer modal & persistent banner |

| Expected Outcome | Status |
|---|---|
| End-to-end validated pipeline | ✅ Functional with traceable citations |
| Jurisdictional knowledge base | ✅ 500+ real CA statutes & cases |
| Deployable hearing-preparation tool | ✅ Fully containerized & tested |
| Evaluated grounding accuracy | ✅ Documented G_v = 0.83, 82% citation traceability |

---

## Deployment

The application is fully containerized and production-ready.

### Deploy to Railway (Backend)

1. Connect your GitHub repo to Railway
2. Set environment variables (Qdrant URL, API keys)
3. Railway will auto-detect `Dockerfile` and deploy

### Deploy to Vercel (Frontend)

1. Connect your GitHub repo to Vercel
2. Vercel will auto-detect `next.config.js` and deploy
3. Update API endpoint in frontend `.env` to your Railway backend URL

**Full deployment guide:** See `DEPLOYMENT.md`

---

## Roadmap

- [ ] Expand knowledge base to all 50 US states
- [ ] Add federal civil litigation support
- [ ] Integrate real-time court docket lookup
- [ ] Multi-language support
- [ ] Mobile app (React Native)
- [ ] Integration with legal aid networks for referral
- [ ] Enhanced citation tracking and precedent clustering

---

## Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Commit your changes: `git commit -m "Add your feature"`
4. Push to the branch: `git push origin feature/your-feature`
5. Open a pull request

**Development Standards:**
- Python: PEP 8, type hints required
- JavaScript/TypeScript: ESLint + Prettier
- Commits: Conventional commits

---
## Acknowledgments

This project was developed to address a critical gap in access-to-justice technology. Special thanks to:
- The California self-represented litigant community for framing the problem
- Legal aid organizations for insights on case preparation workflows
- Anthropic for supporting responsible AI research

---

