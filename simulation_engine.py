"""
Simulation Engine - Opposing Counsel AI (Adversarial System)
Generates aggressive legal arguments and objections against the user's case
Uses Groq Cloud API with llama3-70b-8192 model for complex legal reasoning
"""

import json
import logging
from typing import Optional, Dict, Any, List
from datetime import datetime
from groq import Groq
from models import CaseIntake
from config import GROQ_API_KEY, GROQ_MODEL

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class OpposingCounsel:
    """
    Aggressive Opposing Counsel AI (Simulation Engine)
    Analyzes user's case and generates strong counter-arguments
    """
    
    def __init__(self, api_key: str = GROQ_API_KEY, model: str = "llama-3.1-70b-versatile"):
        """
        Initialize Opposing Counsel AI
        
        Args:
            api_key: Groq API key
            model: Model to use (uses llama3-70b for complex reasoning)
        """
        if not api_key:
            raise ValueError("GROQ_API_KEY environment variable not set")
        
        self.client = Groq(api_key=api_key)
        self.model = model
        logger.info(f"Opposing Counsel AI initialized with model: {self.model}")
        
        # Powerful adversarial system prompt
        self.system_prompt = """You are an aggressive, cunning, and highly skilled opposing attorney. Your goal is to:

1. FIND WEAKNESSES: Analyze the user's case for gaps in evidence, missed deadlines, procedural errors, and legal vulnerabilities
2. CONSTRUCT POWERFUL OBJECTIONS: Generate 3-4 strong legal arguments against the user's case
3. CITE APPLICABLE LAW: Directly reference the provided legal provisions to counter their claims
4. EXPOSE INCONSISTENCIES: Identify contradictions, inconsistencies, and logical fallacies in their narrative
5. PREDICT COUNTER-CLAIMS: Suggest potential counter-claims and defenses available to the opposing party

Your response MUST include:
- Specific legal citations from provided laws
- Procedural objections and motions
- Evidentiary challenges and weaknesses
- Risk assessment and case vulnerabilities
- Recommended defense strategy points

Be aggressive, strategic, and thorough. Do NOT hold back - present the strongest possible opposing case."""

    def analyze_case_for_opposition(
        self,
        case: CaseIntake,
        structured_facts: Dict[str, Any],
        retrieved_laws: List[Dict[str, Any]],
        opposing_party_info: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Analyze the user's case from opposing counsel perspective
        
        Args:
            case: Extracted CaseIntake object
            structured_facts: Structured facts from case extraction
            retrieved_laws: Laws retrieved by RAG system
            opposing_party_info: Optional information about opposing party
            
        Returns:
            Dictionary containing opposing arguments and analysis
        """
        try:
            logger.info("🎯 Starting opposing counsel analysis...")
            
            # Step 1: Prepare the case context
            case_context = self._prepare_case_context(
                case, 
                structured_facts, 
                opposing_party_info
            )
            
            # Step 2: Prepare legal context
            legal_context = self._prepare_legal_context(retrieved_laws)
            
            # Step 3: Generate opposing arguments
            opposing_arguments = self._generate_opposing_arguments(
                case_context,
                legal_context
            )
            
            # Step 4: Generate specific objections
            objections = self._generate_legal_objections(
                case_context,
                legal_context,
                opposing_arguments
            )
            
            # Step 5: Compile analysis report
            analysis_report = {
                "timestamp": datetime.now().isoformat(),
                "case_title": case.case_title,
                "case_type": case.case_type,
                "jurisdiction": case.jurisdiction,
                "opponent_analysis": opposing_arguments,
                "legal_objections": objections,
                "case_vulnerabilities": self._identify_vulnerabilities(
                    case_context,
                    opposing_arguments
                ),
                "defense_strategy": self._suggest_defense_strategy(
                    opposing_arguments,
                    objections
                ),
                "risk_level": self._assess_risk_level(opposing_arguments),
                "summary": self._generate_summary(opposing_arguments, objections)
            }
            
            logger.info("✓ Opposing counsel analysis completed successfully")
            return analysis_report
        
        except Exception as e:
            logger.error(f"Error in opposing counsel analysis: {e}")
            return {
                "error": str(e),
                "timestamp": datetime.now().isoformat(),
                "status": "failed"
            }
    
    def _prepare_case_context(
        self,
        case: CaseIntake,
        structured_facts: Dict[str, Any],
        opposing_party_info: Optional[Dict[str, Any]] = None
    ) -> str:
        """Prepare comprehensive case context for analysis"""
        
        context = f"""
CASE CONTEXT FOR OPPOSING COUNSEL ANALYSIS
==========================================

CASE INFORMATION:
- Title: {case.case_title}
- Type: {case.case_type}
- Jurisdiction: {case.jurisdiction}
- Filing Date: {case.date_of_filing or 'Not provided'}
- Incident Date: {case.date_of_incident or 'Not provided'}

PARTIES:
Claimant/Plaintiff: {case.claimant.name}
  - Contact: {case.claimant.contact or 'Not provided'}
  - Represented by: {case.claimant.represented_by or 'Self-represented'}

Defendant/Respondent: {case.defendant.name}
  - Contact: {case.defendant.contact or 'Not provided'}
  - Represented by: {case.defendant.represented_by or 'Self-represented'}

CASE SUMMARY:
{case.case_summary}

RELIEF SOUGHT:
{case.relief_sought}

KEY LEGAL ISSUES:
{chr(10).join(f"• {issue}" for issue in case.key_legal_issues) if case.key_legal_issues else "Not specified"}

CLAIMS:
{self._format_claims(case.claims)}

EVIDENCE:
{self._format_evidence(case.evidence)}

EXTRACTED FACTS:
{json.dumps(structured_facts, indent=2, ensure_ascii=False)}

"""
        if opposing_party_info:
            context += f"\nOPPOSING PARTY INFORMATION:\n{json.dumps(opposing_party_info, indent=2, ensure_ascii=False)}"
        
        return context
    
    def _format_claims(self, claims: List) -> str:
        """Format claims for display"""
        if not claims:
            return "No claims specified"
        
        formatted = ""
        for i, claim in enumerate(claims, 1):
            formatted += f"\n{i}. {claim.title}\n"
            formatted += f"   Description: {claim.description}\n"
            if claim.amount_claimed:
                formatted += f"   Amount Claimed: {claim.amount_claimed}\n"
        
        return formatted
    
    def _format_evidence(self, evidence: List) -> str:
        """Format evidence for display"""
        if not evidence:
            return "No evidence specified"
        
        formatted = ""
        for i, evid in enumerate(evidence, 1):
            formatted += f"\n{i}. Type: {evid.type}\n"
            formatted += f"   Description: {evid.description}\n"
            formatted += f"   Status: {evid.status}\n"
        
        return formatted
    
    def _prepare_legal_context(self, retrieved_laws: List[Dict[str, Any]]) -> str:
        """Prepare legal context from retrieved laws"""
        
        if not retrieved_laws:
            return "No relevant laws provided for analysis."
        
        context = "\nAPPLICABLE LEGAL PROVISIONS (Retrieved)\n" + "="*50 + "\n"
        
        for i, law in enumerate(retrieved_laws[:5], 1):
            context += f"\n{i}. SOURCE: {law.get('source', 'Unknown')}\n"
            context += f"   Section: {law.get('section', 'N/A')}\n"
            context += f"   Jurisdiction: {law.get('jurisdiction', 'N/A')}\n"
            context += f"   Relevance: {law.get('relevance_score', 0):.0%}\n"
            context += f"   Content:\n{law.get('content', 'N/A')}\n"
            context += "-" * 50 + "\n"
        
        return context
    
    def _generate_opposing_arguments(
        self,
        case_context: str,
        legal_context: str
    ) -> str:
        """Generate aggressive opposing arguments"""
        
        prompt = f"""You are an aggressive opposing attorney. Based on the case context and applicable laws provided:

{case_context}

{legal_context}

Generate 3-4 STRONG and AGGRESSIVE opposing arguments that:
1. Challenge the claimant's case based on the applicable laws
2. Identify gaps in evidence and procedural violations
3. Point out missed deadlines and procedural errors
4. Expose weaknesses in the narrative and claims
5. Provide strong legal citations

Format your response as a JSON object with the following structure:
{{
    "main_arguments": [
        {{
            "argument_title": "Title of the argument",
            "legal_basis": "Cite the specific laws and sections",
            "case_weaknesses": "What weaknesses in claimant's case does this exploit",
            "aggressive_counter": "The aggressive counter-argument",
            "supporting_precedent": "Any relevant precedents or legal principles",
            "severity": "Critical/High/Medium"
        }}
    ],
    "overall_assessment": "Overall assessment of the claimant's case strength"
}}

Be AGGRESSIVE, THOROUGH, and LEGALLY SOUND. Do not hold back."""

        try:
            message = self.client.messages.create(
                model=self.model,
                max_tokens=2048,
                system=self.system_prompt,
                messages=[
                    {
                        "role": "user",
                        "content": prompt
                    }
                ]
            )
            
            response_text = message.content[0].text
            logger.info("✓ Opposing arguments generated successfully")
            return response_text
        
        except Exception as e:
            logger.error(f"Error generating opposing arguments: {e}")
            return json.dumps({
                "error": str(e),
                "main_arguments": [],
                "overall_assessment": "Error generating arguments"
            })
    
    def _generate_legal_objections(
        self,
        case_context: str,
        legal_context: str,
        opposing_arguments: str
    ) -> str:
        """Generate specific legal objections and motions"""
        
        prompt = f"""You are an aggressive opposing attorney. Based on the case analysis:

CASE CONTEXT:
{case_context}

LEGAL FRAMEWORK:
{legal_context}

OPPOSING ARGUMENTS GENERATED:
{opposing_arguments}

Generate 3-4 SPECIFIC LEGAL OBJECTIONS and MOTIONS that could be filed against the claimant, including:
1. Procedural objections (jurisdiction, standing, locus standi)
2. Substantive legal objections (based on applicable law)
3. Evidentiary objections (admissibility, reliability, chain of custody)
4. Suggested motions (dismissal, summary judgment, etc.)

Format your response as a JSON object:
{{
    "objections": [
        {{
            "objection_type": "Type (Procedural/Substantive/Evidentiary)",
            "objection_title": "Title of objection",
            "legal_citation": "Specific law or rule cited",
            "explanation": "Detailed explanation",
            "impact": "Impact on claimant's case",
            "motion_suggested": "Suggested motion"
        }}
    ],
    "critical_issues": ["List of critical issues to address"],
    "procedural_vulnerabilities": ["Procedural weaknesses in case filing"]
}}

Be SPECIFIC, AGGRESSIVE, and ACTIONABLE."""

        try:
            message = self.client.messages.create(
                model=self.model,
                max_tokens=2048,
                system=self.system_prompt,
                messages=[
                    {
                        "role": "user",
                        "content": prompt
                    }
                ]
            )
            
            response_text = message.content[0].text
            logger.info("✓ Legal objections generated successfully")
            return response_text
        
        except Exception as e:
            logger.error(f"Error generating legal objections: {e}")
            return json.dumps({
                "error": str(e),
                "objections": [],
                "critical_issues": [],
                "procedural_vulnerabilities": []
            })
    
    def _identify_vulnerabilities(
        self,
        case_context: str,
        opposing_arguments: str
    ) -> List[Dict[str, Any]]:
        """Identify specific vulnerabilities in the case"""
        
        vulnerabilities = []
        
        # Parse opposing arguments to identify vulnerabilities
        try:
            if "Critical" in opposing_arguments:
                vulnerabilities.append({
                    "type": "Critical",
                    "description": "Case has critical legal vulnerabilities",
                    "priority": "Immediate action required"
                })
            
            if "procedural" in opposing_arguments.lower():
                vulnerabilities.append({
                    "type": "Procedural",
                    "description": "Procedural defects or violations identified",
                    "priority": "High"
                })
            
            if "evidence" in opposing_arguments.lower() or "missing" in opposing_arguments.lower():
                vulnerabilities.append({
                    "type": "Evidentiary",
                    "description": "Gaps or weaknesses in evidence",
                    "priority": "Medium-High"
                })
            
            if "deadline" in opposing_arguments.lower():
                vulnerabilities.append({
                    "type": "Temporal",
                    "description": "Missed deadlines or temporal issues",
                    "priority": "High"
                })
        
        except Exception as e:
            logger.warning(f"Error identifying vulnerabilities: {e}")
        
        return vulnerabilities
    
    def _suggest_defense_strategy(
        self,
        opposing_arguments: str,
        objections: str
    ) -> Dict[str, Any]:
        """Suggest defense strategy points"""
        
        return {
            "primary_defense": "Claimant should prepare responses to identified arguments",
            "key_focus_areas": [
                "Address evidentiary gaps",
                "Cure procedural defects",
                "Establish clear legal basis for claims",
                "Prepare evidence preservation plan"
            ],
            "risks_to_mitigate": [
                "Anticipate opposing counsel's strongest arguments",
                "Prepare detailed factual rebuttals",
                "Gather additional supporting evidence"
            ],
            "recommended_actions": [
                "Review all procedural requirements for jurisdiction",
                "Strengthen evidence chain and documentation",
                "Prepare detailed witness statements",
                "Consider settlement implications given analysis"
            ]
        }
    
    def _assess_risk_level(self, opposing_arguments: str) -> Dict[str, Any]:
        """Assess the risk level of the case"""
        
        risk_level = "Medium"
        confidence = 0.6
        
        if "Critical" in opposing_arguments:
            risk_level = "Critical"
            confidence = 0.9
        elif "High" in opposing_arguments:
            risk_level = "High"
            confidence = 0.8
        elif "Medium" in opposing_arguments:
            risk_level = "Medium"
            confidence = 0.6
        else:
            risk_level = "Low-Medium"
            confidence = 0.5
        
        return {
            "risk_level": risk_level,
            "confidence_score": confidence,
            "recommendation": f"Case assessed as {risk_level} risk. Claimant should prepare accordingly.",
            "next_steps": "Review all identified vulnerabilities and address immediately"
        }
    
    def _generate_summary(self, opposing_arguments: str, objections: str) -> str:
        """Generate executive summary of opposing analysis"""
        
        return f"""
OPPOSING COUNSEL ANALYSIS - EXECUTIVE SUMMARY
==============================================

This analysis represents an aggressive opponent's perspective on the presented case.

KEY FINDINGS:
- Multiple legal arguments have been identified against the claimant's position
- Procedural and evidentiary objections are available to the opposing party
- The case contains identifiable weaknesses that will be exploited in litigation

RECOMMENDATION:
The claimant should thoroughly review this analysis and:
1. Address identified procedural defects immediately
2. Strengthen the evidentiary foundation of claims
3. Prepare detailed responses to anticipated objections
4. Consider the cost-benefit analysis given opposing counsel's likely strategy

This is a simulation of aggressive opposing counsel - use it to strengthen your case preparation.
"""

    def get_simulation_summary(self, analysis: Dict[str, Any]) -> str:
        """Generate a readable summary of the simulation results"""
        
        if "error" in analysis:
            return f"Error in simulation: {analysis.get('error', 'Unknown error')}"
        
        summary = f"""
═══════════════════════════════════════════════════════════════════
OPPOSING COUNSEL SIMULATION ENGINE - ANALYSIS REPORT
═══════════════════════════════════════════════════════════════════

Case: {analysis.get('case_title', 'Unknown')}
Type: {analysis.get('case_type', 'Unknown')}
Jurisdiction: {analysis.get('jurisdiction', 'Unknown')}
Generated: {analysis.get('timestamp', 'Unknown')}

RISK ASSESSMENT:
Risk Level: {analysis.get('risk_level', {}).get('risk_level', 'Unknown')}
Confidence: {analysis.get('risk_level', {}).get('confidence_score', 0):.0%}

CASE VULNERABILITIES:
{chr(10).join(f"• [{v.get('type', 'Unknown')}] {v.get('description', 'N/A')}" 
    for v in analysis.get('case_vulnerabilities', []))}

RECOMMENDED ACTIONS:
{chr(10).join(f"• {action}" 
    for action in analysis.get('defense_strategy', {}).get('recommended_actions', []))}

SUMMARY:
{analysis.get('summary', 'No summary available')}

═══════════════════════════════════════════════════════════════════
"""
        return summary
