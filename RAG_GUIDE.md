# Grounded Retrieval (Kanoon Ka Database - RAG) Implementation Guide

## 📋 Overview

This guide explains the RAG (Retrieval Augmented Generation) system implemented in the case intake application to prevent AI hallucinations by grounding responses in actual legal statutes and court cases.

**Objective:** AI ko jhoot bolne (hallucination) se rokna aur sirf real statutes aur court cases ke mutabiq baat karne par majboor karna.

---

## 🏗️ Architecture

### Tech Stack

```
┌─────────────────────────────────────────────────────────────┐
│                    Streamlit App (UI)                        │
│                   (app_rag.py)                               │
└────────────────┬──────────────────────────────────┬──────────┘
                 │                                  │
        ┌────────▼──────────┐          ┌───────────▼────────┐
        │  Groq LLM        │          │  RAG System        │
        │  (case extraction)         │  (rag_system.py)   │
        │                  │          │                    │
        │  - Structured   │          │ - ChromaDB         │
        │    extraction    │          │ - Vector DB        │
        │  - Case facts   │          │ - Search & Ground  │
        └──────────────────┘          └────────┬───────────┘
                                                │
                                       ┌────────▼────────┐
                                       │ Legal Documents │
                                       │                 │
                                       │ - Statutes      │
                                       │ - Case Law      │
                                       │ - Provisions    │
                                       └─────────────────┘
```

### Components

#### 1. **rag_system.py** - RAG Engine
- `HuggingFaceEmbeddings`: CPU-friendly embeddings (no GPU required)
- `LegalDocumentRAG`: Main RAG class
  - `add_documents()`: Add documents to vector store
  - `search_relevant_laws()`: Find relevant legal documents
  - `ground_response()`: Ground a response in legal documents
- `LegalDocumentProcessor`: Process raw documents into chunks

#### 2. **utils_rag.py** - Enhanced Case Extraction
- `GroundedCaseExtractor`: Extends case extraction with RAG grounding
  - `extract_case_info_with_grounding()`: Extract case with legal grounding
  - `_ground_facts()`: Ground extracted facts in legal documents
  - `_extract_case_facts()`: Extract facts without hallucination

#### 3. **setup_knowledge_base.py** - Knowledge Base Initialization
- Load legal documents from markdown files
- Create vector embeddings
- Store in ChromaDB for fast retrieval

#### 4. **Legal Documents** (legal_documents/)
- `landlord_tenant_act.md`: Tenant-landlord law provisions
- `tort_law_negligence.md`: Negligence and tort liability
- `contract_law.md`: Contract formation and remedies

---

## 🚀 Getting Started

### Step 1: Install Dependencies

```bash
# Install RAG dependencies
pip install -r requirements.txt

# Dependencies:
# - langchain==0.1.11
# - langchain-community==0.0.21
# - sentence-transformers==2.3.0 (CPU-friendly)
# - chromadb==0.4.20 (local vector DB)
```

### Step 2: Initialize Knowledge Base

```bash
# Run setup script (only once)
python setup_knowledge_base.py

# Output:
# ✓ Loading documents into ChromaDB
# ✓ Creating vector embeddings
# ✓ Saving knowledge base
```

This will:
- Load legal documents from `legal_documents/` directory
- Create sentence embeddings using sentence-transformers
- Store vectors in local ChromaDB (`legal_db/` directory)
- Create index for fast retrieval

### Step 3: Run the Application

```bash
# Run RAG-grounded version
streamlit run app_rag.py

# Or original version (without RAG)
streamlit run app.py
```

---

## 💡 How It Works

### Extraction Flow with RAG Grounding

```
User Input
    ↓
[Step 1] Extract Case Facts
    ↓
[Step 2] Ground Facts in Legal Documents
    ├─ Search relevant laws
    ├─ Calculate relevance scores
    └─ Get applicable statutes
    ↓
[Step 3] Enhanced Extraction
    ├─ Combine facts + grounded laws
    ├─ Extract structured case
    └─ Provide legal references
    ↓
Output: CaseIntake + Grounding Info
```

### Example: Property Negligence Case

**User Input:**
```
"My neighbor's shop caught fire due to faulty wiring. The fire spread to my house 
and caused ₹50,000 in damage. He refuses to compensate."
```

**Step 1: Extract Facts**
```json
{
  "main_issue": "property damage from negligence",
  "relief_sought": "compensation for damages",
  "damage_amount": "₹50,000"
}
```

**Step 2: Ground in Legal Documents**
```
Query: "property damage negligence compensation"
↓
Found: 
1. Tort Law - Negligence (90% relevance)
2. Tort Law - Property Damage (85% relevance)
3. Tort Law - Liability (78% relevance)
```

**Step 3: Grounded Extraction**
```json
{
  "case_type": "Negligence / Property Damage",
  "claims": [
    {
      "title": "Negligent maintenance of electrical wiring",
      "description": "Failure to maintain electrical system causing fire damage",
      "amount_claimed": "₹50,000"
    }
  ],
  "key_legal_issues": [
    "Duty of care for property owners",
    "Negligence liability",
    "Property damage recovery"
  ]
}
```

**Grounding Info Returned:**
```json
{
  "relevant_laws": [
    {
      "source": "Tort Law and Negligence",
      "section": "Liability for Property Damage",
      "relevance_score": 0.90,
      "content": "Landlord/property owner is liable for maintaining..."
    }
  ],
  "grounding_status": "✓ Grounded: Found 3 relevant legal sources",
  "confidence": 0.84
}
```

---

## 📚 Legal Documents Structure

### Document Format
Each legal document is a markdown file with:

```markdown
# Title

## Chapter/Section 1: Main Topic

### Subsection 1.1
Content about the legal provision...

### Subsection 1.2
More content...

## Chapter/Section 2: Another Topic
...
```

### Chunking Strategy
- **Chunk Size:** 1000 characters
- **Overlap:** 200 characters (for context)
- **Rationale:** Allows semantic search of related concepts

### Document Metadata
Each chunk stores:
```python
{
    "source": "Landlord and Tenant Act",
    "section": "Security Deposit",
    "jurisdiction": "General/Region",
    "document_type": "Statute/Case Law"
}
```

---

## 🔍 Vector Search & Retrieval

### Embedding Model
**Model:** `sentence-transformers/all-MiniLM-L6-v2`
- **Size:** 384-dimensional vectors
- **Speed:** CPU-friendly (no GPU needed)
- **Accuracy:** Good for legal domain
- **Training:** Trained on semantic search tasks

### Search Process

1. **Query Encoding**
   ```
   User query → Embedding model → 384-dim vector
   ```

2. **Vector Similarity Search**
   ```
   Encoded query vs. all document embeddings
   ↓
   Calculate cosine similarity
   ↓
   Return top-K most similar documents
   ```

3. **Filtering & Ranking**
   ```
   Results → Filter by relevance threshold (0.4)
   ↓
   Rank by similarity score
   ↓
   Return to user
   ```

### Relevance Score Calculation
```
Relevance = 1 - (distance / 2)  [normalized to 0-1]

Threshold: 0.4 (only highly relevant results shown)
```

---

## 🛠️ Customization

### Adding New Legal Documents

1. **Create markdown file** in `legal_documents/`
   ```markdown
   # Document Title
   
   ## Section 1
   Content...
   ```

2. **Update setup_knowledge_base.py**
   ```python
   documents_to_load = {
       "new_law.md": {
           "source_name": "New Law Title",
           "jurisdiction": "Your Jurisdiction",
           "document_type": "Statute"
       }
   }
   ```

3. **Reinitialize knowledge base**
   ```bash
   python setup_knowledge_base.py
   ```

### Tuning Search Parameters

**In `rag_system.py`:**
```python
# Adjust search parameters
relevant_laws = rag.search_relevant_laws(
    query=query,
    k=5,           # Number of results (default: 5)
    threshold=0.4  # Relevance threshold (default: 0.4)
)
```

**In `utils_rag.py`:**
```python
# Adjust grounding strategy
grounding_info = self._ground_facts(
    facts=facts,
    case_type=case_type,
    jurisdiction=jurisdiction,
    k=5  # Number of relevant documents to retrieve
)
```

### Changing Embedding Model

```python
# In rag_system.py
rag = LegalDocumentRAG(
    embedding_model="sentence-transformers/all-mpnet-base-v2"
    # Other options:
    # - "sentence-transformers/all-roberta-large-v1"
    # - "sentence-transformers/legal-contrastive"
)
```

---

## 📊 Performance Optimization

### ChromaDB Benefits
- **Local Storage:** No API calls needed
- **Fast Retrieval:** < 100ms for searches
- **Persistence:** Saves to disk, survives restarts
- **Scalability:** Handles 10,000+ documents efficiently

### Optimization Tips

1. **Increase Vector Size** for better accuracy (trade-off: slower)
   ```python
   chunk_size=2000  # Larger chunks
   ```

2. **Reduce Chunk Overlap** for faster processing
   ```python
   chunk_overlap=50  # Less overlap
   ```

3. **Use Batch Processing** for many documents
   ```python
   rag.add_documents(documents, batch_size=50)
   ```

4. **Cache Frequent Searches**
   ```python
   @cache
   def search_relevant_laws(query):
       return rag.search_relevant_laws(query)
   ```

---

## ✅ Testing & Verification

### Verify Knowledge Base

```bash
python setup_knowledge_base.py

# Output shows:
# - Number of documents loaded
# - Chunk statistics
# - Sample search results
```

### Test Search Quality

```python
from rag_system import LegalDocumentRAG

rag = LegalDocumentRAG()

# Test queries
queries = [
    "tenant eviction notice",
    "landlord security deposit",
    "negligence property damage",
    "contract breach remedies"
]

for query in queries:
    results = rag.search_relevant_laws(query)
    print(f"Query: {query}")
    print(f"Results: {len(results)}")
```

### Unit Tests

```bash
# Run tests
pytest tests/test_rag_system.py
pytest tests/test_case_extraction.py
```

---

## 🚨 Preventing Hallucinations

### RAG Strategy for Accuracy

1. **Fact Extraction Only**
   - Extract only explicitly stated facts
   - Don't infer or assume information

2. **Ground in Legal Documents**
   - All legal references must come from knowledge base
   - Show relevance scores for transparency

3. **Confidence Scores**
   - Adjust based on grounding quality
   - Higher confidence if well-grounded

4. **Explicit Warnings**
   - Mark uncertain or poorly grounded information
   - Suggest additional research if needed

### Example: Preventing Hallucination

❌ **Without RAG (Hallucination Risk):**
```
Query: "What's the penalty for non-payment of rent?"
AI Response: "The penalty is 5% of rent per week, up to 50% of annual rent."
[Completely made up]
```

✅ **With RAG (Grounded Response):**
```
Query: "What's the penalty for non-payment of rent?"
AI Response: "Based on the Landlord and Tenant Act (found in knowledge base):
- No specific penalty percentage mentioned in statute
- Court can order payment with interest
- Interest calculated at bank rate
[Grounded in actual legal documents, with sources cited]
```

---

## 🔐 Important Notes

### Data Privacy
- All data stored locally (no cloud uploads)
- ChromaDB stored in `legal_db/` directory
- No external API calls for embeddings

### License & Usage
- Legal documents are educational references
- Consult actual lawyers for real cases
- System designed to assist, not replace legal professionals

### Knowledge Base Maintenance
- Update documents as laws change
- Add jurisdiction-specific documents
- Regularly verify search quality

---

## 📞 Troubleshooting

### Issue: Knowledge base empty
```bash
# Solution: Run setup script
python setup_knowledge_base.py

# Check for legal_documents/ directory
ls -la legal_documents/
```

### Issue: Slow search
```bash
# Solution: Reduce chunk size or use batch retrieval
chunk_size=500  # Smaller chunks = faster search
```

### Issue: Poor search results
```bash
# Solution: Improve query or add more documents
# Use clear, specific queries
# Add more comprehensive legal documents
```

---

## 📖 Further Reading

- [LangChain Documentation](https://python.langchain.com/)
- [ChromaDB Documentation](https://docs.trychroma.com/)
- [Sentence Transformers](https://www.sbert.net/)
- [RAG Best Practices](https://python.langchain.com/docs/use_cases/qa_structured/chat_history)

---

## 📝 Sample Implementation

### Complete Example Flow

```python
from utils_rag import GroundedCaseExtractor

# Initialize
extractor = GroundedCaseExtractor()

# User narrative
narrative = """
My landlord hasn't returned my security deposit after 2 months of vacating. 
I paid ₹30,000 as deposit and left the property in good condition.
He claims deductions but won't provide details.
"""

# Extract with grounding
case, grounding_info = extractor.extract_case_info_with_grounding(
    narrative=narrative,
    jurisdiction="District Court",
    case_type="Property"
)

# Use results
if case:
    print(f"Case: {case.case_title}")
    print(f"Relief Sought: {case.relief_sought}")
    
    if grounding_info['relevant_laws']:
        print(f"\nGrounded in {len(grounding_info['relevant_laws'])} legal documents")
        for law in grounding_info['relevant_laws']:
            print(f"- {law['source']} ({law['relevance_score']:.0%})")
```

---

## 🎯 Future Enhancements

- [ ] Multi-language support (Hindi, Urdu, etc.)
- [ ] Jurisdiction-specific documents
- [ ] Real-time legal database updates
- [ ] Integration with legal APIs
- [ ] Case precedent matching
- [ ] Automated legal research generation
