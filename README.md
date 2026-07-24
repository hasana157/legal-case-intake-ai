# Opposing-Argument Simulator for Self-Represented Litigants

An AI-powered legal case preparation tool that helps self-represented litigants practice against realistic opposing arguments using **Retrieval-Augmented Generation (RAG)** and jurisdiction-specific legal authorities.

## 🎯 Overview

This application assists individuals representing themselves in legal proceedings by:
- Extracting structured case information from user narratives
- Retrieving jurisdiction-specific legal authorities (statutes, case law)
- Generating realistic opposing arguments based on retrieved legal material
- Guiding users to prepare effective rebuttals
- Exporting case summaries with citations in PDF format

**Key Innovation:** Unlike traditional LLM applications, this system retrieves relevant legal documents *before* generating responses, significantly reducing hallucinations and ensuring all arguments are grounded in verifiable legal authorities.

## ✨ Key Features

- **Structured Case Intake** - Step-by-step guided form for legal dispute details
- **AI Fact Extraction** - Automatically extract parties, claims, dates, and evidence
- **Semantic Legal Retrieval** - Vector database search for jurisdiction-specific authorities
- **Opposing Argument Simulation** - Generate realistic counterarguments with citations
- **Rebuttal Workspace** - Guided prompts to help users prepare responses
- **Citation Grounding** - All arguments include supporting legal references
- **PDF Export** - Save case summary, arguments, and rebuttals for review

## 🛠 Tech Stack

| Component | Technology |
|-----------|-----------|
| **Frontend** | Next.js, React, TypeScript, Tailwind CSS |
| **Backend** | FastAPI (Python) |
| **Language Model** | Groq API |
| **Vector Database** | Qdrant |
| **Embeddings** | Transformers (sentence-transformers) |
| **Deployment** | Vercel (Frontend), Docker (Backend) |
| **Version Control** | Git & GitHub |

## 🏗 System Architecture

```
<img width="1250" height="718" alt="image" src="https://github.com/user-attachments/assets/017943e6-c7e3-4f22-ac07-a701e9a0e943" />

```

## 📊 Evaluation Results

| Metric | Result |
|--------|--------|
| **Average Grounding Score** | 0.83 / 1.0 |
| **Citation Traceability** | 82% |
| **Fabricated Case Citations** | 0 (None Observed) |
| **Module Test Status** | All 7 modules passed ✅ |

## 🚀 Core Workflow

1. **Case Intake** - User provides dispute details (type, jurisdiction, parties, narrative)
2. **Fact Extraction** - AI extracts structured information (parties, claims, dates, evidence)
3. **Legal Retrieval** - System searches vector database for relevant authorities
4. **Argument Generation** - AI generates opposing arguments grounded in retrieved material
5. **Rebuttal Preparation** - User prepares responses with guided prompts
6. **Export** - User exports case summary and work product as PDF

## 📋 Use Cases

- **Self-Represented Litigants** - Practice courtroom arguments without legal counsel
- **Case Preparation** - Anticipate and prepare responses to counterarguments
- **Legal Education** - Learn about jurisdiction-specific legal authorities
- **Pre-Trial Preparation** - Strengthen case narrative and evidence organization

## ⚙️ System Requirements

- Python 3.9+
- Node.js 16+
- Groq API key
- Qdrant instance (cloud or local)
- 2GB+ RAM

## 🔧 Installation & Setup

### Backend Setup
```bash
# Clone repository
git clone <repo-url>
cd backend

# Install dependencies
pip install -r requirements.txt

# Configure environment variables
cp .env.example .env
# Add: GROQ_API_KEY, QDRANT_URL, QDRANT_API_KEY

# Run FastAPI server
uvicorn main:app --reload
```

### Frontend Setup
```bash
cd frontend

# Install dependencies
npm install

# Configure API endpoint
# Update .env.local with NEXT_PUBLIC_API_URL

# Run development server
npm run dev
```

Visit `http://localhost:3000` in your browser.

## 🎓 Learning Outcomes

This project demonstrates:
- ✅ Full-stack web application development (Next.js, FastAPI)
- ✅ Retrieval-Augmented Generation (RAG) implementation
- ✅ Vector database management and semantic search
- ✅ LLM API integration and prompt engineering
- ✅ AI evaluation frameworks and metrics
- ✅ Responsible AI practices in legal technology
- ✅ Modern software engineering practices

## 🔐 Safety & Compliance

- ✅ Citation verification for all generated arguments
- ✅ Confidence indicators for generated content
- ✅ Mandatory legal disclaimers
- ✅ No storage of sensitive case information
- ✅ Grounding in verified legal authorities only
- ⚠️ **Educational Simulation Only** - Not a substitute for legal counsel

## 🔮 Future Enhancements

- [ ] Expand legal knowledge base to additional jurisdictions
- [ ] Support for more dispute types and practice areas
- [ ] User authentication and secure case history
- [ ] Advanced evaluation with larger legal scenario datasets
- [ ] Performance optimization for high-volume usage
- [ ] Integration with court filing systems
- [ ] Multi-language support

## 📚 References

1. Lewis, P., et al. (2020). *Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks.* NeurIPS.
2. FastAPI: https://fastapi.tiangolo.com/
3. Next.js: https://nextjs.org/
4. Qdrant: https://qdrant.tech/
5. Groq API: https://console.groq.com/

## 👤 Author

**Hasana Zahid**  


---

**Disclaimer:** This application is for educational purposes only and does not constitute legal advice. Users should consult qualified legal professionals before making legal decisions.
