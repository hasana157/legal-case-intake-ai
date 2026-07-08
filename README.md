# Legal Case Intake Form Application

A sophisticated Streamlit-based application that extracts structured legal information from unstructured case narratives using AI-powered analysis via Groq Cloud API.

## 🎯 Objective

Transform unstructured legal narratives (in plain language, Hinglish, or English) into clean, structured JSON data with validated legal facts. Users can:
- Submit case narratives in natural language
- Automatically extract structured legal information (parties, claims, evidence, dates)
- Review and edit extracted information with full control
- Export data as JSON for further processing

## 🛠️ Technology Stack

- **Frontend**: [Streamlit](https://streamlit.io/) - Interactive Python web framework
- **Data Validation**: [Pydantic](https://docs.pydantic.dev/) - Python data validation using type hints
- **LLM Engine**: [Groq Cloud API](https://groq.com/) - Fast inference with Llama 3.1 models
- **Language Model**: `llama3-8b-8192` - Fast, efficient model with JSON support

## 📋 Features

✅ **AI-Powered Extraction**
- Intelligent extraction of legal facts from unstructured text
- Support for Hinglish and English narratives
- Automatic detection of dates, names, and legal terms

✅ **Structured Data Models**
- Pre-defined Pydantic models for case data
- Validation of all extracted information
- Type-safe data handling

✅ **Interactive Editing**
- User-friendly interface to review extracted data
- Edit any field with validation
- Add/modify claims and evidence items

✅ **Comprehensive Case Details**
- Party information (claimants, defendants)
- Multiple claims with descriptions and amounts
- Evidence tracking with status
- Key legal issues identification
- Date tracking for incidents and filing

✅ **Multiple Export Formats**
- Download as JSON
- View formatted summaries
- Copy-paste ready data

## 🚀 Quick Start

### Prerequisites
- Python 3.8+
- A Groq API key (free tier available)

### Installation

1. **Clone or download the project**
```bash
cd case_intake_app
```

2. **Create a virtual environment** (recommended)
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. **Install dependencies**
```bash
pip install -r requirements.txt
```

4. **Set up environment variables**
```bash
# Copy the example file
cp .env.example .env

# Edit .env and add your Groq API key
# GROQ_API_KEY=your_actual_api_key_here
```

### Get Groq API Key

1. Go to [https://console.groq.com/](https://console.groq.com/)
2. Sign up for a free account (no credit card needed)
3. Create an API key
4. Copy it to your `.env` file

### Run the Application

```bash
streamlit run app.py
```

The app will open at `http://localhost:8501`

## 📖 Usage Guide

### Step 1: Enter Case Narrative
Describe your legal case in natural language. Include:
- Parties involved (claimant, defendant)
- What happened and when
- Claims being made
- Available evidence
- What relief is being sought

Example:
```
Mr. Sharma's neighbor Patel owned a shop that caught fire on January 15, 2023. 
The fire damaged Sharma's house. Patel has not compensated despite requests. 
Sharma's lawyer Ms. Das filed a negligence case on March 1, 2023 in District Court. 
Evidence includes photos, fire department report, and witness statements.
```

### Step 2: Select Jurisdiction and Case Type
- **Jurisdiction**: Choose appropriate court level (District Court, High Court, etc.)
- **Case Type**: Select from Civil, Criminal, Family, Corporate, etc.

### Step 3: Submit for Extraction
Click "Extract Case Info" button. The AI will:
1. Parse your narrative
2. Extract structured information
3. Validate against Pydantic models
4. Display results with confidence score

### Step 4: Review Extracted Data
View the automatically extracted information:
- Case title and summary
- Party details (names, contact, representatives)
- Claims with descriptions and amounts
- Evidence items with status
- Key legal issues
- Dates of incident and filing

### Step 5: Edit and Refine
In the "Edit Details" tab:
- Correct any misinterpreted information
- Update party details
- Add or modify claims
- Add or update evidence
- Add key legal issues
- Save all changes

### Step 6: Export
Download the structured data as JSON or copy the formatted output for use in other systems.

## 📁 Project Structure

```
case_intake_app/
├── app.py                 # Main Streamlit application
├── models.py              # Pydantic data models
├── utils.py               # Utility functions and Groq API integration
├── config.py              # Configuration and constants
├── requirements.txt       # Python dependencies
├── .env.example           # Environment variables template
├── README.md              # This file
└── .gitignore             # Git ignore rules
```

### Key Files Explanation

**app.py**
- Main Streamlit UI application
- Handles user input and display
- Manages editing interface
- Handles export functionality

**models.py**
- Pydantic models for data validation
- CaseIntake: Main case data structure
- Claimant, Defendant: Party information
- Claim: Individual legal claims
- Evidence: Evidence items

**utils.py**
- GroqCaseExtractor: Handles API calls to Groq
- JSON parsing and validation
- Utility functions for data handling

**config.py**
- API configuration and keys
- Lists of jurisdictions and case types
- System prompt for AI extraction
- Configuration constants

## 🔧 Configuration

### Customizing Jurisdictions and Case Types

Edit `config.py` to add your custom options:

```python
JURISDICTIONS = [
    "Federal Court",
    "Your Court",
    # Add more...
]

CASE_TYPES = [
    "Civil",
    "Your Case Type",
    # Add more...
]
```

### Modifying the Extraction Prompt

The system prompt in `config.py` controls how the AI extracts information. You can modify:
- `SYSTEM_PROMPT`: Main instructions to the AI
- `RESPONSE_FORMAT`: Output format requirements

## 🔒 Security Considerations

- **API Key**: Never commit `.env` file to version control
- **Input Validation**: All user inputs are validated before processing
- **Data Privacy**: Narratives are sent to Groq API; review their privacy policy
- **No Data Storage**: Application doesn't store submitted cases (except in session)

## 📊 Data Model Overview

### CaseIntake
Main model containing:
- Case identification (title, jurisdiction, type)
- Party information (claimant, defendant)
- Timeline (date of incident, filing)
- Legal details (claims, evidence, issues)
- Metadata (AI extraction confidence)

### Supported Fields

```json
{
  "case_title": "string",
  "jurisdiction": "string",
  "case_type": "string",
  "claimant": {
    "name": "string",
    "contact": "string or null",
    "represented_by": "string or null"
  },
  "defendant": {
    "name": "string",
    "contact": "string or null",
    "represented_by": "string or null"
  },
  "date_of_incident": "YYYY-MM-DD or null",
  "date_of_filing": "YYYY-MM-DD or null",
  "claims": [
    {
      "title": "string",
      "description": "string",
      "amount_claimed": "string or null"
    }
  ],
  "evidence": [
    {
      "type": "string",
      "description": "string",
      "status": "pending|available|pending_verification"
    }
  ],
  "case_summary": "string",
  "relief_sought": "string",
  "key_legal_issues": ["string"],
  "extracted_by_ai": true,
  "confidence_score": 0.85
}
```

## 🎨 UI Features

- **Responsive Design**: Works on desktop and tablets
- **Color-Coded Messages**: Success (green), error (red), info (blue)
- **Tabbed Interface**: Separate tabs for viewing, editing, and exporting
- **Expandable Sections**: Claims and evidence in expandable containers
- **Sample Data**: Load sample narrative for testing
- **Progress Indicators**: Visual feedback during processing

## 🐛 Troubleshooting

### "GROQ_API_KEY not set" error
- Ensure `.env` file exists in the project root
- Copy `.env.example` to `.env`
- Add your actual API key

### "Failed to parse JSON response"
- Ensure Groq API is working (check console.groq.com)
- Try with a simpler, clearer narrative
- Check that the narrative contains sufficient legal information

### Streamlit not starting
- Ensure Python 3.8+ is installed: `python --version`
- Reinstall dependencies: `pip install -r requirements.txt --upgrade`
- Try: `streamlit run app.py --logger.level=debug`

### Slow response times
- Normal first request may take 10-15 seconds
- Groq API is optimized for speed; subsequent requests are faster
- Ensure good internet connection

## 📝 Example Narratives

### Civil Case - Negligence
```
My neighbor's faulty electrical wiring caused a fire that damaged my property worth ₹50,000. 
Despite multiple requests, he refuses to compensate. I filed a negligence case in District Court 
on March 1, 2023. Evidence includes photos, fire department report, and neighbor statements.
```

### Contract Dispute
```
ABC Corp agreed to supply 1000 units of widgets by January 31, 2023. They failed to deliver. 
We lost ₹2,00,000 in revenue. My lawyer, Advocate Sharma, filed a breach of contract case 
on February 15, 2023 in Commercial Court against ABC Corp. Evidence: written contract, 
email exchanges, proof of payment, delivery confirmation documents.
```

## 🤝 Contributing

Feel free to:
- Report bugs or issues
- Suggest improvements to the extraction logic
- Add support for more case types
- Improve UI/UX

## 📄 License

This project is open source and available for educational and professional use.

## 🔗 Resources

- [Groq Documentation](https://console.groq.com/docs)
- [Streamlit Documentation](https://docs.streamlit.io/)
- [Pydantic Documentation](https://docs.pydantic.dev/)
- [Llama 3.1 Model Card](https://huggingface.co/meta-llama/Llama-2-7b)

## 📞 Support

For issues with:
- **Groq API**: Visit [console.groq.com](https://console.groq.com)
- **Streamlit**: Check [streamlit.io/docs](https://docs.streamlit.io)
- **Application**: Review the code comments and configuration

## 🎓 Learning Resources

This application demonstrates:
- Building interactive web apps with Streamlit
- Using Pydantic for data validation
- Integrating external LLM APIs
- Building user-friendly data extraction tools
- Managing state in web applications

---

**Version**: 1.0.0  
**Last Updated**: 2024  
**Status**: Production Ready
