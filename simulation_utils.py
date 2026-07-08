"""
Simulation Engine Utilities
Integration layer for Opposing Counsel AI with RAG system
"""

import json
import logging
from typing import Optional, Dict, Any, List, Tuple
from groq import Groq
from models import CaseIntake
from rag_system import LegalDocumentRAG
from simulation_engine import OpposingCounsel
from config import GROQ_API_KEY

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class SimulationManager:
    """
    Manages the integration between case extraction, RAG system, and simulation engine
    """
    
    def __init__(self, api_key: str = GROQ_API_KEY):
        """Initialize Simulation Manager with RAG and Opposing Counsel"""
        
        self.api_key = api_key
        self.opposing_counsel = OpposingCounsel(api_key=api_key)
        self.rag = None
        
        try:
            self.rag = LegalDocumentRAG(persist_directory="./legal_db")
            logger.info("Simulation Manager initialized successfully")
        except Exception as e:
            logger.warning(f"RAG system not available: {e}")
    
    def run_opposing_counsel_simulation(
        self,
        case: CaseIntake,
        narrative: str,
        jurisdiction: str,
        case_type: str,
        retrieved_laws: Optional[List[Dict[str, Any]]] = None
    ) -> Dict[str, Any]:
        """
        Run opposing counsel simulation on extracted case
        
        Args:
            case: Extracted CaseIntake object
            narrative: Original case narrative
            jurisdiction: Case jurisdiction
            case_type: Type of case
            retrieved_laws: Pre-retrieved legal documents (optional)
            
        Returns:
            Simulation analysis report
        """
        
        logger.info("🎯 Starting opposing counsel simulation...")
        
        try:
            # Step 1: Extract structured facts from narrative
            structured_facts = self._extract_structured_facts(narrative)
            
            # Step 2: Retrieve relevant laws if not provided
            if retrieved_laws is None:
                retrieved_laws = self._retrieve_relevant_laws(
                    narrative,
                    jurisdiction,
                    case_type
                )
            
            # Step 3: Run opposing counsel analysis
            analysis = self.opposing_counsel.analyze_case_for_opposition(
                case=case,
                structured_facts=structured_facts,
                retrieved_laws=retrieved_laws
            )
            
            # Step 4: Enhance analysis with metadata
            analysis["structured_facts"] = structured_facts
            analysis["retrieved_laws_count"] = len(retrieved_laws) if retrieved_laws else 0
            
            logger.info("✓ Opposing counsel simulation completed")
            return analysis
        
        except Exception as e:
            logger.error(f"Error in simulation: {e}")
            return {
                "error": str(e),
                "status": "failed"
            }
    
    def _extract_structured_facts(self, narrative: str) -> Dict[str, Any]:
        """Extract structured facts from narrative"""
        
        fact_extraction_prompt = """Extract the following facts from the case narrative in JSON format:
        {
            "key_dates": [],
            "parties_involved": [],
            "main_dispute": "",
            "evidence_mentioned": [],
            "relief_sought": "",
            "procedural_status": ""
        }
        
        Only extract facts explicitly mentioned. Do not infer or hallucinate."""
        
        try:
            client = Groq(api_key=self.api_key)
            message = client.messages.create(
                model="llama-3.1-70b-versatile",
                max_tokens=1024,
                messages=[
                    {
                        "role": "user",
                        "content": f"{narrative}\n\n{fact_extraction_prompt}"
                    }
                ]
            )
            
            response_text = message.content[0].text
            
            # Parse JSON from response
            if "```json" in response_text:
                response_text = response_text.split("```json")[1].split("```")[0]
            elif "```" in response_text:
                response_text = response_text.split("```")[1].split("```")[0]
            
            facts = json.loads(response_text.strip())
            logger.info("✓ Structured facts extracted")
            return facts
        
        except Exception as e:
            logger.warning(f"Error extracting facts: {e}")
            return {
                "key_dates": [],
                "parties_involved": [],
                "main_dispute": "Could not extract",
                "evidence_mentioned": [],
                "relief_sought": "Could not extract",
                "procedural_status": "Unknown"
            }
    
    def _retrieve_relevant_laws(
        self,
        narrative: str,
        jurisdiction: str,
        case_type: str
    ) -> List[Dict[str, Any]]:
        """Retrieve relevant laws from RAG system"""
        
        if not self.rag:
            logger.warning("RAG system not available - using empty law list")
            return []
        
        try:
            # Build search query
            search_query = f"{case_type} {jurisdiction}"
            
            # Search for relevant laws
            relevant_laws, status = self.rag.ground_response(
                query=search_query,
                case_type=case_type,
                jurisdiction=jurisdiction,
                k=5
            )
            
            logger.info(f"✓ Retrieved {len(relevant_laws)} relevant laws")
            return relevant_laws
        
        except Exception as e:
            logger.warning(f"Error retrieving laws: {e}")
            return []
    
    def get_detailed_analysis(self, simulation_result: Dict[str, Any]) -> str:
        """Generate detailed text analysis from simulation result"""
        
        if "error" in simulation_result:
            return f"Error: {simulation_result.get('error', 'Unknown error')}"
        
        analysis = ""
        
        # Parse opposing arguments if they're JSON strings
        try:
            opponent_analysis = simulation_result.get("opponent_analysis", "")
            if isinstance(opponent_analysis, str):
                try:
                    opponent_data = json.loads(opponent_analysis)
                    analysis += "\n📋 OPPOSING ARGUMENTS:\n"
                    analysis += "=" * 50 + "\n"
                    
                    for arg in opponent_data.get("main_arguments", []):
                        analysis += f"\n🔴 {arg.get('argument_title', 'Argument')}\n"
                        analysis += f"   Legal Basis: {arg.get('legal_basis', 'N/A')}\n"
                        analysis += f"   Case Weaknesses: {arg.get('case_weaknesses', 'N/A')}\n"
                        analysis += f"   Counter-argument: {arg.get('aggressive_counter', 'N/A')}\n"
                        analysis += f"   Severity: {arg.get('severity', 'N/A')}\n"
                    
                    analysis += f"\nOverall Assessment: {opponent_data.get('overall_assessment', 'N/A')}\n"
                
                except json.JSONDecodeError:
                    analysis += f"\nOpposing Arguments: {opponent_analysis}\n"
        
        except Exception as e:
            logger.warning(f"Error parsing opponent analysis: {e}")
        
        # Parse legal objections if they're JSON strings
        try:
            legal_objections = simulation_result.get("legal_objections", "")
            if isinstance(legal_objections, str):
                try:
                    objections_data = json.loads(legal_objections)
                    analysis += "\n⚖️ LEGAL OBJECTIONS:\n"
                    analysis += "=" * 50 + "\n"
                    
                    for obj in objections_data.get("objections", []):
                        analysis += f"\n📌 {obj.get('objection_title', 'Objection')}\n"
                        analysis += f"   Type: {obj.get('objection_type', 'N/A')}\n"
                        analysis += f"   Legal Citation: {obj.get('legal_citation', 'N/A')}\n"
                        analysis += f"   Impact: {obj.get('impact', 'N/A')}\n"
                        analysis += f"   Suggested Motion: {obj.get('motion_suggested', 'N/A')}\n"
                    
                    analysis += f"\nCritical Issues:\n"
                    for issue in objections_data.get("critical_issues", []):
                        analysis += f"  • {issue}\n"
                
                except json.JSONDecodeError:
                    analysis += f"\nLegal Objections: {legal_objections}\n"
        
        except Exception as e:
            logger.warning(f"Error parsing legal objections: {e}")
        
        # Add vulnerabilities
        vulnerabilities = simulation_result.get("case_vulnerabilities", [])
        if vulnerabilities:
            analysis += "\n⚠️ IDENTIFIED VULNERABILITIES:\n"
            analysis += "=" * 50 + "\n"
            for vuln in vulnerabilities:
                analysis += f"\n• [{vuln.get('type', 'Unknown')}] {vuln.get('description', 'N/A')}\n"
                analysis += f"  Priority: {vuln.get('priority', 'Medium')}\n"
        
        # Add defense strategy
        defense = simulation_result.get("defense_strategy", {})
        if defense:
            analysis += "\n🛡️ RECOMMENDED DEFENSE STRATEGY:\n"
            analysis += "=" * 50 + "\n"
            
            analysis += f"\nPrimary Defense: {defense.get('primary_defense', 'N/A')}\n"
            
            analysis += f"\nKey Focus Areas:\n"
            for area in defense.get('key_focus_areas', []):
                analysis += f"  • {area}\n"
            
            analysis += f"\nRecommended Actions:\n"
            for action in defense.get('recommended_actions', []):
                analysis += f"  • {action}\n"
        
        # Add risk assessment
        risk = simulation_result.get("risk_level", {})
        if risk:
            analysis += "\n📊 RISK ASSESSMENT:\n"
            analysis += "=" * 50 + "\n"
            analysis += f"Risk Level: {risk.get('risk_level', 'Unknown')}\n"
            analysis += f"Confidence: {risk.get('confidence_score', 0):.0%}\n"
            analysis += f"Recommendation: {risk.get('recommendation', 'N/A')}\n"
        
        return analysis
    
    def export_simulation_report(
        self,
        simulation_result: Dict[str, Any],
        case: CaseIntake
    ) -> str:
        """Export simulation as formatted report"""
        
        report = f"""
╔════════════════════════════════════════════════════════════════════════════╗
║         OPPOSING COUNSEL SIMULATION ENGINE - ANALYSIS REPORT               ║
╚════════════════════════════════════════════════════════════════════════════╝

CASE INFORMATION:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Case Title:     {case.case_title}
Case Type:      {case.case_type}
Jurisdiction:   {case.jurisdiction}
Generated:      {simulation_result.get('timestamp', 'Unknown')}

RISK ASSESSMENT:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
"""
        
        risk = simulation_result.get("risk_level", {})
        report += f"Risk Level:     {risk.get('risk_level', 'Unknown')}\n"
        report += f"Confidence:     {risk.get('confidence_score', 0):.0%}\n\n"
        
        # Add detailed analysis
        detailed_analysis = self.get_detailed_analysis(simulation_result)
        report += detailed_analysis
        
        report += "\n\n╔════════════════════════════════════════════════════════════════════════════╗\n"
        report += "║  This report represents aggressive opposing counsel's perspective on your case ║\n"
        report += "║  Use it to strengthen your case preparation and address identified issues.    ║\n"
        report += "╚════════════════════════════════════════════════════════════════════════════╝\n"
        
        return report
