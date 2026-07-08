# Case Intake App with RAG & Simulation Engine ⚖️

## 🎯 What's New: Opposing Counsel Simulation Engine

This enhanced version includes a **powerful Simulation Engine** that simulates aggressive opposing counsel analyzing your legal case.

## 🚀 Quick Start

### Installation
```bash
pip install -r requirements.txt
```

### Run the App
```bash
streamlit run app_rag.py
```

## 📊 New Features

### 1. **Opposing Counsel Simulation** (Tab 3)
   - Aggressive case analysis from opponent's perspective
   - Identifies weaknesses and vulnerabilities
   - Generates specific legal objections
   - Recommends defense strategies

### 2. **Risk Assessment**
   - Risk Level: Critical, High, Medium, Low-Medium
   - Confidence Score: How confident the analysis is
   - Vulnerability metrics

### 3. **Defense Strategy Recommendations**
   - Primary defense approach
   - Key focus areas
   - Risks to mitigate
   - Actionable recommendations

### 4. **Detailed Analysis & Export**
   - View detailed opposing arguments
   - Download comprehensive reports
   - Share analysis with legal team

## 🔧 Architecture

```
┌─────────────────────────────────────────────────────┐
│          CASE INTAKE APPLICATION                    │
├─────────────────────────────────────────────────────┤
│                                                     │
│  ┌──────────────┐      ┌──────────────┐            │
│  │   Case       │      │   RAG        │            │
│  │ Extraction   ├─────▶│  System      │            │
│  │   (LLM)      │      │              │            │
│  └──────────────┘      └──────────────┘            │
│         │                      │                    │
│         │                      │                    │
│         ▼                      ▼                    │
│  ┌──────────────────────────────────┐              │
│  │  Structured Facts +              │              │
│  │  Retrieved Laws                  │              │
│  └──────────────────────────────────┘              │
│         │                                          │
│         │                                          │
│         ▼                                          │
│  ┌──────────────────────────────────┐              │
│  │ SIMULATION ENGINE                │              │
│  │ (Opposing Counsel AI)            │              │
│  │ - Groq llama-3.1-70b             │              │
│  │ - Aggressive Analysis            │              │
│  │ - Risk Assessment                │              │
│  └──────────────────────────────────┘              │
│         │                                          │
│         ▼                                          │
│  ┌──────────────────────────────────┐              │
│  │  Opposing Arguments              │              │
│  │  Legal Objections                │              │
│  │  Vulnerability Analysis          │              │
│  │  Defense Recommendations         │              │
│  └──────────────────────────────────┘              │
│                                                     │
└─────────────────────────────────────────────────────┘
```

## 📁 New Files Added

### Core Simulation Files
- **`simulation_engine.py`** (19 KB, 480+ lines)
  - `OpposingCounsel` class for aggressive case analysis
  - Argument generation with legal citations
  - Vulnerability identification
  - Risk assessment and defense strategy

- **`simulation_utils.py`** (13 KB, 420+ lines)
  - `SimulationManager` for integration
  - RAG system integration
  - Analysis formatting and export
  - Report generation

### Documentation
- **`SIMULATION_ENGINE_GUIDE.md`** - Comprehensive guide
- **`SIMULATION_ENGINE_README.md`** - This file

### Updated Files
- **`app_rag.py`** - New Tab 3 for simulation
- **`requirements.txt`** - All dependencies

## 💻 Usage Workflow

### Step 1: Extract Case
1. Fill in case narrative
2. Select jurisdiction and case type
3. Click "Extract Case Info (RAG Grounded)"
4. View extracted case details

### Step 2: View RAG Grounding
- See relevant legal provisions
- Review confidence scores
- Understand legal basis

### Step 3: Run Simulation
1. Go to **"⚖️ Simulation"** tab
2. Click **"🚀 Run Opposing Counsel Simulation"**
3. Wait for analysis (30-60 seconds)
4. Review results

### Step 4: Analyze Results
- View risk metrics
- Review identified vulnerabilities
- Study defense strategy
- Read detailed analysis
- Download report

## 🎯 Key Components

### OpposingCounsel Class

```python
opposing_counsel = OpposingCounsel(api_key=GROQ_API_KEY)

result = opposing_counsel.analyze_case_for_opposition(
    case=extracted_case,
    structured_facts=facts,
    retrieved_laws=laws
)
```

### Output Structure
```python
{
    "opponent_analysis": "3-4 aggressive arguments",
    "legal_objections": "Procedural & substantive objections",
    "case_vulnerabilities": [
        {"type": "...", "description": "...", "priority": "..."}
    ],
    "defense_strategy": {
        "primary_defense": "...",
        "key_focus_areas": [...],
        "recommended_actions": [...]
    },
    "risk_level": {
        "risk_level": "Critical/High/Medium/Low",
        "confidence_score": 0.85
    }
}
```

## 🔑 Environment Setup

Required environment variables:
```bash
GROQ_API_KEY=your_groq_api_key_here
GROQ_MODEL=llama-3.1-70b-versatile
```

## 📊 Simulation Features

### Opposing Arguments (3-4)
- **Argument Title**: Clear description
- **Legal Basis**: Specific law citations
- **Case Weaknesses**: Exploited vulnerabilities
- **Aggressive Counter**: The actual argument
- **Severity**: Critical/High/Medium

### Legal Objections
1. **Procedural**: Jurisdiction, standing, service
2. **Substantive**: Legal basis, statutory compliance
3. **Evidentiary**: Admissibility, authenticity
4. **Motions**: Dismissal, summary judgment suggestions

### Vulnerabilities
- **Critical**: Immediate threats
- **High**: Significant weaknesses
- **Medium**: Manageable issues
- **Temporal**: Deadline/timing issues

### Defense Strategy
- **Primary Defense**: Main approach
- **Key Focus Areas**: What to prioritize
- **Risks to Mitigate**: What to address
- **Recommended Actions**: Specific steps

## 🎨 UI/UX

### Tab Organization
- **Tab 1**: View extracted data
- **Tab 2**: Edit case details
- **Tab 3**: Opposing counsel simulation ✨ NEW
- **Tab 4**: Export data

### Simulation Display
- Risk metrics (cards)
- Vulnerability list (expandable)
- Defense strategy (expandable)
- Detailed analysis button
- Download report button

## 📈 Technology Stack

### LLM & AI
- **Groq Cloud API**: High-speed inference
- **Model**: llama-3.1-70b-versatile
- **Max Tokens**: 2048 for comprehensive analysis

### Data Processing
- **LangChain**: Document processing & retrieval
- **Sentence Transformers**: Embeddings
- **ChromaDB**: Vector storage

### Web Framework
- **Streamlit**: Interactive UI
- **Pydantic**: Data validation

## 🔄 Integration Points

### With RAG System
- Uses retrieved laws for legal basis
- Grounds arguments in actual statutes
- Prevents hallucinations

### With Case Extraction
- Uses structured facts
- References extracted claims
- Analyzes identified evidence

### With Streamlit UI
- Seamless integration in Tab 3
- Real-time result display
- One-click export

## ⚙️ Configuration

### Model Parameters
- **Temperature**: Default (set in config)
- **Max Tokens**: 2048
- **Top P**: Default (optimal reasoning)

### Simulation Parameters
- **Number of Arguments**: 3-4
- **Objection Types**: 3-4
- **Analysis Depth**: Comprehensive

## 🚨 Error Handling

The system handles:
- Missing API keys
- RAG system unavailability
- JSON parsing errors
- API timeouts
- Invalid case data

All errors are displayed user-friendly messages.

## 📊 Sample Output

### Risk Assessment
```
Risk Level: HIGH
Confidence: 75%
Vulnerabilities: 4 identified
```

### Key Findings
```
⚠️ CRITICAL: Missing evidence for key claim
⚠️ HIGH: Procedural violation in filing
⚠️ MEDIUM: Inconsistency in witness statement
```

### Defense Recommendations
```
✓ Address evidentiary gaps
✓ Cure procedural defects
✓ Strengthen legal arguments
✓ Prepare detailed rebuttals
```

## 🎓 Best Practices

1. **Complete Case Extraction First**
   - Ensure all fields are filled
   - Have RAG grounding verified
   - Organize evidence properly

2. **Review Simulation Results**
   - Understand each vulnerability
   - Read detailed analysis
   - Study legal objections

3. **Take Action**
   - Address critical issues first
   - Gather additional evidence
   - Prepare detailed responses

4. **Iterate & Improve**
   - Re-run simulation after improvements
   - Track vulnerability reduction
   - Strengthen case progressively

## 📞 Support

For issues:
1. Check GROQ_API_KEY is set
2. Verify case is properly extracted
3. Ensure knowledge base is loaded
4. Check internet connectivity

## 📝 License & Usage

This application is designed for:
- Legal case preparation
- Evidence organization
- Procedural compliance
- Risk assessment

**Note**: Always consult with qualified attorneys for actual legal representation.

---

**Version**: 2.0 with Simulation Engine
**Last Updated**: July 2024
**Status**: Production Ready ✅
