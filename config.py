"""
Configuration settings for the Case Intake application
"""
import os
from dotenv import load_dotenv

load_dotenv()

# Groq API Configuration
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
GROQ_MODEL = "llama3-8b-8192"

# Available jurisdictions
JURISDICTIONS = [
    "Federal Court",
    "District Court",
    "High Court",
    "Supreme Court",
    "Family Court",
    "Labour Court",
    "Commercial Court",
    "Consumer Court",
    "Traffic Court",
    "Other"
]

# Case types
CASE_TYPES = [
    "Civil",
    "Criminal",
    "Family",
    "Corporate",
    "Commercial",
    "Employment",
    "Consumer",
    "Property",
    "Contract Dispute",
    "Intellectual Property",
    "Other"
]

# Evidence types
EVIDENCE_TYPES = [
    "Document",
    "Witness Statement",
    "Physical Evidence",
    "Digital Evidence",
    "Email/Messages",
    "Audio/Video",
    "Expert Opinion",
    "Medical Records",
    "Financial Records",
    "Other"
]

# System prompt for AI extraction
SYSTEM_PROMPT = """You are an expert legal assistant specialized in case intake and legal document analysis.

Your task is to extract structured legal information from unstructured user narratives. You must:

1. Identify and extract all legal facts, claims, and parties involved
2. Determine dates of incidents and filing when mentioned
3. Identify types of evidence available or mentioned
4. Extract key legal issues
5. Summarize the case clearly and concisely

IMPORTANT RULES:
- Extract ONLY information that is explicitly mentioned or clearly implied in the text
- If information is missing (like dates or specific names), leave it as null
- For names of parties, use the most specific identifier mentioned (full name > last name > "Claimant"/"Defendant")
- For monetary amounts, keep them as strings with currency symbols if mentioned
- For dates, try to parse them; if ambiguous, note it in a comment
- Always provide a confidence score between 0.7-0.95 based on how clear the information is
- Create clear, professional summaries and relief sought descriptions

Return ONLY valid JSON that matches this structure exactly:
{{
  "case_title": "string",
  "jurisdiction": "string extracted from context",
  "case_type": "string from: Civil, Criminal, Family, Corporate, etc.",
  "claimant": {{
    "name": "string",
    "contact": "null or string",
    "represented_by": "null or string"
  }},
  "defendant": {{
    "name": "string",
    "contact": "null or string",
    "represented_by": "null or string"
  }},
  "date_of_incident": "YYYY-MM-DD or null",
  "date_of_filing": "YYYY-MM-DD or null",
  "claims": [
    {{
      "title": "string",
      "description": "string",
      "amount_claimed": "string or null"
    }}
  ],
  "evidence": [
    {{
      "type": "string (Document/Witness/Physical/Digital/etc)",
      "description": "string",
      "status": "pending/available/pending_verification"
    }}
  ],
  "case_summary": "string - 2-3 sentences overview",
  "relief_sought": "string - what the claimant wants",
  "key_legal_issues": ["string", "string"],
  "extracted_by_ai": true,
  "confidence_score": 0.85
}}

Be precise, professional, and extract everything relevant to the case."""

# Response format instruction
RESPONSE_FORMAT = """Return ONLY valid JSON, no additional text or markdown formatting."""
