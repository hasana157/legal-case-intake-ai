"""
Rebuttal & Safety Engine (Jawab Ki Tayaari)
Evaluates user responses to opposing counsel arguments and provides coaching feedback.
"""
import json
import logging
from typing import Dict, Any, List, Optional
from groq import Groq
from config import GROQ_API_KEY, GROQ_MODEL

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class RebuttalCoach:
    """
    AI Coach that evaluates user's rebuttal to opposing counsel's arguments.
    """
    
    def __init__(self, api_key: str = GROQ_API_KEY, model: str = "llama3-8b-8192"):
        """
        Initialize Rebuttal Coach. We use a faster/smaller model for coaching feedback.
        """
        if not api_key:
            raise ValueError("GROQ_API_KEY environment variable not set")
        
        self.client = Groq(api_key=api_key)
        self.model = model
        logger.info(f"Rebuttal Coach initialized with model: {self.model}")
        
        self.system_prompt = """You are a supportive but realistic Legal AI Coach helping a user practice their case.
The user is facing an argument from opposing counsel. They will provide their tentative response.

Your job is to:
1. EVALUATE: Assess how strong their response would be in court (Strong, Moderate, Weak).
2. FEEDBACK: Explain WHY it is strong or weak. Point out if they are missing evidence, sounding too emotional, or making a logical flaw.
3. IMPROVEMENT: Give them a specific tip on how to frame their response better legally.

Format your response exactly as a JSON object:
{
    "strength": "Strong/Moderate/Weak",
    "feedback": "Detailed explanation of why the response is good or bad",
    "missing_evidence": "What evidence should they ideally show to back this up",
    "coaching_tip": "One actionable tip to improve the phrasing or legal standing"
}

Be constructive, encouraging, but firmly realistic about legal standards."""

    def evaluate_rebuttal(self, objection: Dict[str, Any], user_response: str) -> Dict[str, Any]:
        """
        Evaluate the user's rebuttal against a specific objection.
        """
        try:
            logger.info("Evaluating user rebuttal...")
            
            # Extract objection details safely
            if "argument_title" in objection:
                objection_title = objection.get("argument_title", "Argument")
                objection_desc = objection.get("aggressive_counter", "")
            else:
                objection_title = objection.get("objection_title", "Objection")
                objection_desc = objection.get("explanation", "")
                
            prompt = f"""
OPPOSING COUNSEL'S ARGUMENT:
Title: {objection_title}
Details: {objection_desc}

USER'S DRAFTED REBUTTAL:
"{user_response}"

Evaluate the user's rebuttal and provide coaching feedback.
"""
            message = self.client.messages.create(
                model=self.model,
                max_tokens=1024,
                system=self.system_prompt,
                messages=[
                    {
                        "role": "user",
                        "content": prompt
                    }
                ]
            )
            
            response_text = message.content[0].text
            
            # Parse JSON from response
            if "```json" in response_text:
                response_text = response_text.split("```json")[1].split("```")[0]
            elif "```" in response_text:
                response_text = response_text.split("```")[1].split("```")[0]
            
            evaluation = json.loads(response_text.strip())
            logger.info("✓ Rebuttal evaluated successfully")
            return evaluation
            
        except Exception as e:
            logger.error(f"Error evaluating rebuttal: {e}")
            return {
                "error": str(e),
                "strength": "Unknown",
                "feedback": "Could not evaluate response due to an error.",
                "missing_evidence": "N/A",
                "coaching_tip": "Try keeping your answer concise and factual."
            }
