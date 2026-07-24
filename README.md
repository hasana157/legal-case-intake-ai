# An Opposing-Argument Simulator for Self-Represented Litigants

> **A Jurisdiction-Grounded RAG System for Access-to-Justice Technology**

[![Python Version](https://img.shields.io/badge/python-3.10%2B-blue)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.100%2B-green)](https://fastapi.tiangolo.com/)
[![Qdrant](https://img.shields.io/badge/Qdrant-Vector%20DB-red)](https://qdrant.tech/)

Millions of people navigate the civil justice system—small claims, tenancy, and family court—without attorney representation. This tool helps self-represented litigants prepare for court by generating the **most likely opposing arguments** they will face, fully grounded in jurisdiction-specific statutes and case law. 

This repository implements the architecture proposed in our research paper, specifically addressing the critical risks of LLM hallucination in legal contexts via strict retrieval constraints and hard-gated citation verification.

## Architecture

The system utilizes a **three-stage pipeline**:

1. **Intake & Structuring**: Parses unstructured plain-language user narratives into a formal schema (parties, claims, disputed facts) using an LLM.
2. **Jurisdiction-Grounded Retrieval**: Uses the structured facts to retrieve relevant case law and statutes from a local Qdrant vector database containing real California legal authorities.
3. **Simulation & Citation Verification**: Generates potential opposing arguments using a constrained LLM prompt, and then passes them through a hard-gate citation verifier. If the LLM hallucinates cases or cites unretrieved material, the system penalizes confidence and explicitly warns the user.

## Repository Contents

* `api/` - The backend API written in FastAPI.
  * `api/models/` - Pydantic schemas enforcing rigid data structures.
  * `api/services/` - LLM generation, Qdrant retrieval, and the citation verifier.
  * `api/scripts/` - Scripts to seed the Qdrant knowledge base.
* `frontend/` - Static HTML/JS application (vanilla frontend).
* `evaluation/` - Automated evaluation harness testing the system against 10 realistic legal scenarios.

## Setup & Installation

### 1. Prerequisites
- Python 3.10+
- The `uv` package manager (`pip install uv`)
- An API key for Groq (LLM provider)

### 2. Environment Setup
```bash
# Clone the repository
git clone https://github.com/hasana157/legal-case-intake-ai.git
cd legal-case-intake-ai

# Set up the API virtual environment and install dependencies
cd api
uv venv
# Windows
venv\Scripts\activate
# Unix/MacOS
# source venv/bin/activate

uv pip install -r requirements.txt
```

### 3. Environment Variables
Create a `.env` file in the `api` directory:
```env
# Required for generation
GROQ_API_KEY=your_groq_api_key_here

# Required for knowledge base seeding (if augmenting the KB)
CENSUS_API_KEY=your_census_key_here 
```

### 4. Seed the Knowledge Base
To run the Opposing-Argument Simulator, you must seed the Qdrant vector database with California authorities:
```bash
cd api
python scripts/build_knowledge_base.py
```

## Running the Application

### Backend Server
From the `api` directory, start the FastAPI server:
```bash
uvicorn main:app --reload
```
The API documentation will be available at `http://127.0.0.1:8000/docs`.

### Frontend Client
Serve the static frontend folder using any web server. For example:
```bash
cd frontend
python -m http.server 3000
```
Navigate to `http://localhost:3000` to interact with the application.

## Evaluation Harness

We include a rigorous automated evaluation harness to quantify the system's adherence to retrieved cases ($G_v$ score).
```bash
# From the root directory:
python evaluation/run_evaluation.py
```
This generates a comprehensive `EVALUATION.md` report with the grounding scores and hallucination penalties for 10 simulated California scenarios.

## Research Compliance

This project satisfies all critical requirements for jurisdiction-grounded RAG:
- **Guided Intake**: Structured extraction of claims and evidence from plain-language input.
- **Knowledge Base**: 80+ real California legal authorities (Civil Code and precedent case law) seeded in a Qdrant vector database.
- **Strict Grounding**: The `verify_citations` engine acts as a hard gate. If generated arguments fail to match retrieved authorities exactly, confidence is penalized.
- **Metrics**: The `$G_v$` metric quantifies citation traceability, rigorously evaluated across a 10-scenario test bank.

## License

MIT License
