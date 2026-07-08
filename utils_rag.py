"""
Enhanced utilities integrating RAG system for grounded legal analysis
"""

import json
import logging
from typing import Optional, Dict, Any, List, Tuple
from groq import Groq
from models import CaseIntake
from config import GROQ_API_KEY, GROQ_MODEL, SYSTEM_PROMPT, RESPONSE_FORMAT
from rag_system import LegalDocumentRAG

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class GroundedCaseExtractor:
    """
    Enhanced case extractor with RAG grounding to prevent hallucinations
    """
    
    def __init__(self, api_key: str = GROQ_API_KEY):
        """Initialize with Groq client and RAG system"""
        if not api_key:
            raise ValueError("GROQ_API_KEY environment variable not set")
        self.client = Groq(api_key=api_key)
        self.model = GROQ_MODEL
        
        # Initialize RAG system
        try:
            self.rag = LegalDocumentRAG(persist_directory="./legal_db")
            stats = self.rag.get_statistics()
            logger.info(f"RAG system initialized with {stats['total_documents']} documents")
        except Exception as e:
            logger.warning(f"RAG system initialization failed: {e}")
            self.rag = None
    
    def extract_case_info_with_grounding(
        self, 
        narrative: str,
        jurisdiction: str = None,
        case_type: str = None
    ) -> Tuple[Optional[CaseIntake], Dict[str, Any]]:
        """
        Extract case information with grounding in legal documents
        
        Args:
            narrative: User's unstructured case description
            jurisdiction: Legal jurisdiction if known
            case_type: Type of case if known
            
        Returns:
            Tuple of (CaseIntake object, grounding_info)
        """
        grounding_info = {
            "relevant_laws": [],
            "grounding_status": "Not grounded",
            "confidence": 0.0,
            "warnings": []
        }
        
        try:
            # Step 1: Extract facts from narrative
            logger.info("Step 1: Extracting case facts from narrative...")
            facts = self._extract_case_facts(narrative)
            
            # Step 2: Ground the facts in legal documents
            if self.rag:
                logger.info("Step 2: Grounding facts in legal documents...")
                grounding_info = self._ground_facts(
                    facts, 
                    jurisdiction, 
                    case_type
                )
            else:
                grounding_info["warnings"].append(
                    "RAG system not available. Results may not be fully grounded."
                )
            
            # Step 3: Extract structured case information
            logger.info("Step 3: Extracting structured case information...")
            
            # Enhance prompt with grounded laws
            enhanced_narrative = self._create_enhanced_narrative(
                narrative, 
                facts, 
                grounding_info
            )
            
            # Get structured extraction
            case_intake = self._extract_structured_case(enhanced_narrative)
            
            if case_intake:
                # Adjust confidence based on grounding
                if grounding_info["relevant_laws"]:
                    case_intake.confidence_score = min(
                        (case_intake.confidence_score or 0.85) * 1.1,
                        0.99
                    )
                logger.info("✓ Case extraction completed with grounding")
            
            return case_intake, grounding_info
        
        except Exception as e:
            logger.error(f"Error in grounded extraction: {e}")
            grounding_info["warnings"].append(f"Error during extraction: {str(e)}")
            return None, grounding_info
    
    def _extract_case_facts(self, narrative: str) -> Dict[str, Any]:
        """Extract key facts from narrative without hallucination"""
        
        fact_extraction_prompt = """Extract the following facts from the case narrative, 
        ONLY mention facts that are explicitly stated. Do not infer or hallucinate:
        1. Key parties involved (names, roles)
        2. Key dates (incident, filing, events)
        3. Main issue/dispute
        4. Relief sought
        5. Evidence mentioned
        
        Return as JSON."""
        
        try:
            message = self.client.messages.create(
                model=self.model,
                max_tokens=1024,
                messages=[
                    {
                        "role": "user",
                        "content": f"{narrative}\n\n{fact_extraction_prompt}"
                    }
                ]
            )
            
            response_text = message.content[0].text
            facts_json = self._parse_json_response(response_text)
            logger.info(f"Extracted facts: {facts_json}")
            return facts_json
        
        except Exception as e:
            logger.error(f"Error extracting facts: {e}")
            return {}
    
    def _ground_facts(
        self, 
        facts: Dict[str, Any],
        jurisdiction: str = None,
        case_type: str = None
    ) -> Dict[str, Any]:
        """Ground extracted facts in legal documents"""
        
        grounding_info = {
            "relevant_laws": [],
            "grounding_status": "Not grounded",
            "confidence": 0.0,
            "warnings": []
        }
        
        if not self.rag:
            return grounding_info
        
        try:
            # Build search query from facts
            search_terms = []
            if case_type:
                search_terms.append(case_type)
            if isinstance(facts, dict):
                if facts.get("main_issue"):
                    search_terms.append(facts["main_issue"])
                if facts.get("relief_sought"):
                    search_terms.append(facts["relief_sought"])
            
            search_query = " ".join(search_terms) if search_terms else "legal principles"
            
            # Search for relevant laws
            relevant_laws, status = self.rag.ground_response(
                query=search_query,
                case_type=case_type,
                jurisdiction=jurisdiction,
                k=5
            )
            
            grounding_info["relevant_laws"] = relevant_laws
            grounding_info["grounding_status"] = status
            
            if relevant_laws:
                grounding_info["confidence"] = sum(
                    law["relevance_score"] for law in relevant_laws
                ) / len(relevant_laws)
            
            logger.info(f"Grounding status: {status}")
            logger.info(f"Found {len(relevant_laws)} relevant laws")
            
            return grounding_info
        
        except Exception as e:
            logger.error(f"Error grounding facts: {e}")
            grounding_info["warnings"].append(f"Grounding error: {str(e)}")
            return grounding_info
    
    def _create_enhanced_narrative(
        self,
        original_narrative: str,
        facts: Dict[str, Any],
        grounding_info: Dict[str, Any]
    ) -> str:
        """Create enhanced narrative with grounded legal context"""
        
        enhanced = f"""Original Narrative:
{original_narrative}

"""
        
        # Add grounded legal context
        if grounding_info["relevant_laws"]:
            enhanced += "Relevant Legal Provisions (from knowledge base):\n"
            enhanced += "-" * 50 + "\n"
            
            for i, law in enumerate(grounding_info["relevant_laws"][:3], 1):
                enhanced += f"\n{i}. {law['source']} (Section: {law['section']})\n"
                enhanced += f"   Relevance: {law['relevance_score']:.0%}\n"
                enhanced += f"   Content: {law['content'][:300]}...\n"
            
            enhanced += "\n" + "-" * 50 + "\n"
        
        # Add warning about hallucinations
        enhanced += "\nIMPORTANT: Only use information explicitly mentioned in the narrative above. "
        enhanced += "Do not hallucinate or infer facts not stated. "
        enhanced += "Use grounded legal provisions only as reference for understanding applicable law.\n"
        
        return enhanced
    
    def _extract_structured_case(self, enhanced_narrative: str) -> Optional[CaseIntake]:
        """Extract structured case information from enhanced narrative"""
        
        try:
            message = self.client.messages.create(
                model=self.model,
                max_tokens=2048,
                system=SYSTEM_PROMPT,
                messages=[
                    {
                        "role": "user",
                        "content": f"{enhanced_narrative}\n\n{RESPONSE_FORMAT}"
                    }
                ]
            )
            
            response_text = message.content[0].text
            extracted_json = self._parse_json_response(response_text)
            case_intake = CaseIntake(**extracted_json)
            
            return case_intake
        
        except Exception as e:
            logger.error(f"Error extracting structured case: {e}")
            return None
    
    def _parse_json_response(self, response_text: str) -> Dict[str, Any]:
        """Parse JSON from response text"""
        
        response_text = response_text.strip()
        
        # Remove markdown code blocks
        if response_text.startswith("```json"):
            response_text = response_text[7:]
        if response_text.startswith("```"):
            response_text = response_text[3:]
        if response_text.endswith("```"):
            response_text = response_text[:-3]
        
        response_text = response_text.strip()
        extracted_json = json.loads(response_text)
        
        return extracted_json
    
    def get_rag_status(self) -> Dict[str, Any]:
        """Get status of RAG system"""
        
        if not self.rag:
            return {"status": "Not initialized", "documents": 0}
        
        return self.rag.get_statistics()


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
    """Validate user narrative input"""
    
    if not narrative or not narrative.strip():
        return False, "براہ کرم ایک narrative فراہم کریں / Please provide a narrative"
    
    if len(narrative.strip()) < min_length:
        return False, f"Narrative کم از کم {min_length} حروف ہونے چاہیئں / Narrative must be at least {min_length} characters long"
    
    return True, "Valid"
