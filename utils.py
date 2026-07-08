"""
Utility functions for Case Intake application
"""
import json
import logging
from typing import Optional, Dict, Any
from groq import Groq
from models import CaseIntake
from config import GROQ_API_KEY, GROQ_MODEL, SYSTEM_PROMPT, RESPONSE_FORMAT

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class GroqCaseExtractor:
    """Handles extraction of legal case information using Groq API"""
    
    def __init__(self, api_key: str = GROQ_API_KEY):
        """Initialize Groq client"""
        if not api_key:
            raise ValueError("GROQ_API_KEY environment variable not set")
        self.client = Groq(api_key=api_key)
        self.model = GROQ_MODEL
    
    def extract_case_info(self, narrative: str) -> Optional[CaseIntake]:
        """
        Extract structured case information from unstructured narrative text
        
        Args:
            narrative: User's unstructured text description of the case
            
        Returns:
            CaseIntake object with extracted information, or None if extraction fails
        """
        try:
            logger.info("Sending narrative to Groq API for extraction")
            
            # Create the message for Groq
            message = self.client.messages.create(
                model=self.model,
                max_tokens=2048,
                system=SYSTEM_PROMPT,
                messages=[
                    {
                        "role": "user",
                        "content": f"{narrative}\n\n{RESPONSE_FORMAT}"
                    }
                ]
            )
            
            # Extract the response content
            response_text = message.content[0].text
            logger.info(f"Received response from Groq: {response_text[:100]}...")
            
            # Parse JSON response
            extracted_json = self._parse_json_response(response_text)
            
            # Validate and create CaseIntake object
            case_intake = CaseIntake(**extracted_json)
            logger.info("Successfully created CaseIntake object")
            
            return case_intake
            
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse JSON response: {e}")
            return None
        except ValueError as e:
            logger.error(f"Validation error: {e}")
            return None
        except Exception as e:
            logger.error(f"Error during case extraction: {e}")
            return None
    
    def _parse_json_response(self, response_text: str) -> Dict[str, Any]:
        """
        Extract and parse JSON from Groq response
        
        Args:
            response_text: Raw text response from Groq
            
        Returns:
            Parsed JSON dictionary
        """
        # Try to find JSON in the response
        response_text = response_text.strip()
        
        # Remove markdown code blocks if present
        if response_text.startswith("```json"):
            response_text = response_text[7:]
        if response_text.startswith("```"):
            response_text = response_text[3:]
        if response_text.endswith("```"):
            response_text = response_text[:-3]
        
        response_text = response_text.strip()
        
        # Parse JSON
        extracted_json = json.loads(response_text)
        return extracted_json


def format_date_for_display(date_obj) -> str:
    """Format date object for display"""
    if date_obj is None:
        return "Not provided"
    return str(date_obj)


def safe_json_dump(obj) -> str:
    """Safely convert Pydantic model to JSON string"""
    if hasattr(obj, 'model_dump'):
        return json.dumps(obj.model_dump(mode='json'), indent=2, ensure_ascii=False)
    return json.dumps(obj, indent=2, ensure_ascii=False, default=str)


def validate_narrative(narrative: str, min_length: int = 50) -> tuple[bool, str]:
    """
    Validate user narrative input
    
    Args:
        narrative: User input text
        min_length: Minimum required length
        
    Returns:
        Tuple of (is_valid, message)
    """
    if not narrative or not narrative.strip():
        return False, "Please provide a narrative"
    
    if len(narrative.strip()) < min_length:
        return False, f"Narrative must be at least {min_length} characters long"
    
    return True, "Valid"
