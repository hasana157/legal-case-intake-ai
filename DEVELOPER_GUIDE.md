# Developer Guide - Case Intake Application

This guide provides information for developers who want to extend or customize the Case Intake application.

## 🏗️ Architecture Overview

The application follows a modular architecture with clear separation of concerns:

```
┌─────────────────────────────────────┐
│   Streamlit UI Layer (app.py)        │
│  - User input handling               │
│  - Display and editing               │
│  - Session management                │
└────────────────┬────────────────────┘
                 │
┌─────────────────▼────────────────────┐
│   Business Logic Layer                │
│  - GroqCaseExtractor (utils.py)      │
│  - Data validation (models.py)       │
│  - Configuration (config.py)         │
└────────────────┬────────────────────┘
                 │
┌─────────────────▼────────────────────┐
│   External Services Layer             │
│  - Groq Cloud API                    │
│  - LLM (llama3-8b-8192)             │
└──────────────────────────────────────┘
```

## 📦 Module Descriptions

### app.py
**Purpose**: Main Streamlit application UI

**Key Functions**:
- `main()`: Application entry point
- `edit_case_details()`: Case editing interface
- `create_date_input()`: Date input helper

**State Management**:
- `st.session_state.extracted_case`: Stores extracted CaseIntake object
- `st.session_state.original_narrative`: Stores user input narrative
- `st.session_state.show_edit`: Controls edit mode visibility

**Customization Points**:
- Modify `JURISDICTIONS` and `CASE_TYPES` in config.py
- Add new input fields by extending the edit interface
- Add new export formats in the Export tab

### models.py
**Purpose**: Pydantic data models for validation

**Models**:
- `Claimant`: Party information
- `Defendant`: Party information
- `Claim`: Individual legal claim
- `Evidence`: Evidence item details
- `CaseIntake`: Main case data model

**Customization**:
- Add new fields to any model
- Create new models for additional entity types
- Modify validation rules using Pydantic validators

**Example**: Adding a new field
```python
class CaseIntake(BaseModel):
    # ... existing fields ...
    court_fees: Optional[float] = Field(None, description="Court filing fees")
```

### utils.py
**Purpose**: Utility functions and external API integration

**Key Classes**:
- `GroqCaseExtractor`: Handles Groq API communication

**Methods**:
- `extract_case_info()`: Main extraction method
- `_parse_json_response()`: JSON parsing
- `format_date_for_display()`: Date formatting
- `validate_narrative()`: Input validation

**Customization**:
- Modify system prompt for different extraction behavior
- Add post-processing of extracted data
- Implement caching to reduce API calls

**Example**: Adding custom validation
```python
def custom_validation(case: CaseIntake) -> bool:
    # Add your validation logic
    if not case.claimant.name:
        return False
    return True
```

### config.py
**Purpose**: Configuration and constants

**Settings**:
- API configuration (model, keys)
- Domain-specific lists (jurisdictions, case types)
- System prompts
- Constants

**Customization**:
- Add new jurisdictions and case types
- Modify system prompt for better extraction
- Add new configuration parameters

## 🔄 Workflow Flow

```
User Input
    ↓
Validation (validate_narrative)
    ↓
Groq API Call (extract_case_info)
    ↓
JSON Parsing (_parse_json_response)
    ↓
Pydantic Validation (CaseIntake model)
    ↓
Streamlit Display
    ↓
User Edits (edit_case_details)
    ↓
Export (JSON)
```

## 🧪 Testing

### Unit Testing
Create a `test_models.py` file:

```python
import pytest
from models import CaseIntake, Claimant, Defendant

def test_case_intake_creation():
    case = CaseIntake(
        case_title="Test Case",
        jurisdiction="District Court",
        case_type="Civil",
        claimant=Claimant(name="Plaintiff"),
        defendant=Defendant(name="Defendant"),
        case_summary="Test summary",
        relief_sought="Test relief"
    )
    assert case.case_title == "Test Case"

def test_invalid_case_missing_fields():
    with pytest.raises(ValueError):
        CaseIntake(case_title="Test")
```

### Manual Testing
Use the sample cases in `sample_cases.md` to test extraction quality.

## 🚀 Extending Features

### Adding a New Case Field

1. **Update the model** (models.py):
```python
class CaseIntake(BaseModel):
    # ... existing fields ...
    client_email: Optional[str] = Field(None, description="Client email address")
```

2. **Update system prompt** (config.py):
```python
SYSTEM_PROMPT = """... your prompt ...
"client_email": "string or null",
..."""
```

3. **Add UI input** (app.py):
```python
client_email = st.text_input("Client Email", value=case.client_email or "")
```

4. **Update case creation**:
```python
updated_case = CaseIntake(
    # ... existing fields ...
    client_email=client_email
)
```

### Implementing Custom Validators

```python
from pydantic import field_validator

class CaseIntake(BaseModel):
    # ... fields ...
    
    @field_validator('case_title')
    def validate_case_title(cls, v):
        if len(v) < 5:
            raise ValueError('Case title must be at least 5 characters')
        return v
```

### Adding Database Support

```python
from sqlalchemy import create_engine, Column, String
from sqlalchemy.orm import Session

# In utils.py
def save_case_to_db(case: CaseIntake, db_session: Session):
    db_case = DBCase(
        title=case.case_title,
        jurisdiction=case.jurisdiction,
        data=case.model_dump_json()
    )
    db_session.add(db_case)
    db_session.commit()
```

### Implementing API Backend

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

@app.post("/extract-case")
async def extract_case_endpoint(narrative: str):
    extractor = GroqCaseExtractor()
    case = extractor.extract_case_info(narrative)
    return case.model_dump()
```

## 🔍 Debugging

### Enable Debug Logging

```python
import logging

logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)
```

### Streamlit Debug Mode

```bash
streamlit run app.py --logger.level=debug
```

### Inspect Groq Response

Add in utils.py:
```python
logger.info(f"Groq Response: {response_text}")
logger.info(f"Parsed JSON: {extracted_json}")
```

## 📊 Performance Optimization

### Caching

```python
import streamlit as st

@st.cache_data
def extract_case_info_cached(narrative: str):
    extractor = GroqCaseExtractor()
    return extractor.extract_case_info(narrative)
```

### Streaming Responses

For long extractions, implement streaming:

```python
def extract_case_info_stream(self, narrative: str):
    # Use streaming parameter in Groq API
    with st.spinner("Extracting..."):
        for chunk in self.client.messages.stream(...):
            yield chunk
```

## 🔐 Security Considerations

### Input Validation
Always validate and sanitize user input:

```python
def sanitize_input(text: str) -> str:
    # Remove potentially harmful content
    return text.strip()[:5000]  # Limit length
```

### API Key Management
- Never commit .env files
- Use environment variables
- Rotate keys regularly
- Implement rate limiting

### Data Protection
- Don't log sensitive information
- Use HTTPS for any API calls
- Consider encrypting stored data
- Implement audit logging

## 📚 Best Practices

1. **Code Organization**
   - Keep models separate from business logic
   - Use utility functions for reusable code
   - Maintain clear separation of concerns

2. **Error Handling**
   - Always wrap API calls in try-except
   - Provide meaningful error messages
   - Log errors with context

3. **Documentation**
   - Add docstrings to all functions
   - Document complex logic
   - Keep README updated

4. **Testing**
   - Write tests for new features
   - Test with various inputs
   - Test error conditions

5. **Performance**
   - Cache expensive operations
   - Implement pagination for large datasets
   - Monitor API response times

## 🔗 Integration Examples

### With Google Drive
```python
from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request
from google.auth.oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build

def save_to_drive(case: CaseIntake, drive_service):
    file_metadata = {'name': f'{case.case_title}.json'}
    media = MediaFileUpload(json_file, mimetype='application/json')
    drive_service.files().create(body=file_metadata, media_body=media).execute()
```

### With Email
```python
import smtplib
from email.mime.multipart import MIMEMultipart

def send_case_via_email(case: CaseIntake, recipient_email: str):
    msg = MIMEMultipart()
    msg['Subject'] = f"Case Intake: {case.case_title}"
    msg.attach(MIMEText(case.model_dump_json(), 'plain'))
    # Send email
```

### With Slack
```python
from slack_sdk import WebClient

def notify_slack(case: CaseIntake, channel: str):
    client = WebClient(token="xoxb-...")
    client.chat_postMessage(
        channel=channel,
        text=f"New case: {case.case_title}"
    )
```

## 📞 Troubleshooting Development

### Issue: ModuleNotFoundError
**Solution**: Activate virtual environment and reinstall dependencies
```bash
source venv/bin/activate
pip install -r requirements.txt
```

### Issue: Pydantic Validation Error
**Solution**: Check field names and types in the model match the data

### Issue: Streamlit Session State Issues
**Solution**: Initialize all session state variables in the beginning of main()

## 🎯 Future Enhancement Ideas

1. Support for multiple languages
2. Document upload and parsing
3. Case timeline visualization
4. Precedent case matching
5. Risk assessment scoring
6. Integration with legal databases
7. Multi-user collaboration
8. Case templates
9. Batch processing
10. Advanced analytics dashboard

---

**Last Updated**: 2024

For more information, refer to the official documentation:
- [Streamlit Docs](https://docs.streamlit.io)
- [Pydantic Docs](https://docs.pydantic.dev)
- [Groq API Docs](https://console.groq.com/docs)
