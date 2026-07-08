"""
Case Intake Form Application with RAG Grounding
A Streamlit app to extract and validate legal case information with grounding in legal documents
Prevents hallucinations by referencing actual statutes and case law
"""
import streamlit as st
import json
from datetime import datetime, date
from typing import Optional
from models import CaseIntake, Claimant, Defendant, Claim, Evidence
from utils_rag import GroundedCaseExtractor, validate_narrative, safe_json_dump
from config import JURISDICTIONS, CASE_TYPES, EVIDENCE_TYPES

# Page configuration
st.set_page_config(
    page_title="Legal Case Intake Form (RAG Grounded)",
    page_icon="⚖️",
    layout="wide",
    initial_sidebar_state="expanded"
)

# Custom CSS for better UI with RAG status
st.markdown("""
    <style>
    .main-header {
        color: #1f77b4;
        font-size: 2.5rem;
        font-weight: bold;
        margin-bottom: 10px;
    }
    .section-header {
        color: #2c3e50;
        font-size: 1.3rem;
        font-weight: bold;
        margin-top: 20px;
        border-bottom: 2px solid #1f77b4;
        padding-bottom: 10px;
    }
    .success-box {
        background-color: #d4edda;
        border: 1px solid #c3e6cb;
        color: #155724;
        padding: 12px;
        border-radius: 4px;
        margin-bottom: 10px;
    }
    .error-box {
        background-color: #f8d7da;
        border: 1px solid #f5c6cb;
        color: #721c24;
        padding: 12px;
        border-radius: 4px;
        margin-bottom: 10px;
    }
    .grounding-box {
        background-color: #e7f3ff;
        border: 1px solid #b3d9ff;
        color: #004085;
        padding: 12px;
        border-radius: 4px;
        margin-bottom: 10px;
    }
    .law-reference {
        background-color: #f0f0f0;
        border-left: 4px solid #1f77b4;
        padding: 10px;
        margin: 8px 0;
        border-radius: 2px;
    }
    </style>
""", unsafe_allow_html=True)

# Initialize session state
if 'extracted_case' not in st.session_state:
    st.session_state.extracted_case = None
if 'original_narrative' not in st.session_state:
    st.session_state.original_narrative = ""
if 'show_edit' not in st.session_state:
    st.session_state.show_edit = False
if 'grounding_info' not in st.session_state:
    st.session_state.grounding_info = None


def create_date_input(label: str, value: Optional[date] = None, key: str = None):
    """Helper function to create date input"""
    return st.date_input(label, value=value if value else None, key=key)


def display_grounding_info(grounding_info: dict):
    """Display RAG grounding information"""
    if not grounding_info:
        return
    
    st.markdown('<div class="grounding-box">', unsafe_allow_html=True)
    
    st.markdown("### 📚 Legal Grounding Information")
    
    # Status
    st.markdown(f"**Status:** {grounding_info['grounding_status']}")
    
    if grounding_info['relevant_laws']:
        st.markdown(f"**Confidence in grounding:** {grounding_info['confidence']:.0%}")
        
        st.markdown("**Relevant Legal Provisions Found:**")
        
        for law in grounding_info['relevant_laws']:
            with st.expander(f"📖 {law['source']} - {law['section']} (Relevance: {law['relevance_score']:.0%})"):
                st.markdown(f"**Source:** {law['source']}")
                st.markdown(f"**Jurisdiction:** {law['jurisdiction']}")
                st.markdown(f"**Relevance Score:** {law['relevance_score']:.0%}")
                st.markdown(f"**Content Preview:**")
                st.text_area("", value=law['content'][:500] + "...", height=150, disabled=True, key=f"law_{law['source']}")
    
    # Warnings
    if grounding_info['warnings']:
        st.warning("⚠️ **Warnings:**\n" + "\n".join(f"• {w}" for w in grounding_info['warnings']))
    
    st.markdown('</div>', unsafe_allow_html=True)


def edit_case_details(case: CaseIntake) -> CaseIntake:
    """Allow user to edit extracted case details"""
    st.markdown('<div class="section-header">📝 Edit Case Details</div>', unsafe_allow_html=True)
    
    col1, col2 = st.columns(2)
    
    with col1:
        case_title = st.text_input("Case Title", value=case.case_title)
        jurisdiction = st.selectbox(
            "Jurisdiction",
            JURISDICTIONS,
            index=JURISDICTIONS.index(case.jurisdiction) if case.jurisdiction in JURISDICTIONS else 0
        )
        case_type = st.selectbox(
            "Case Type",
            CASE_TYPES,
            index=CASE_TYPES.index(case.case_type) if case.case_type in CASE_TYPES else 0
        )
    
    with col2:
        date_of_incident = create_date_input(
            "Date of Incident",
            value=case.date_of_incident,
            key="date_incident"
        )
        date_of_filing = create_date_input(
            "Date of Filing",
            value=case.date_of_filing,
            key="date_filing"
        )
    
    # Case summary and relief sought
    st.markdown('<div class="section-header">📋 Case Summary</div>', unsafe_allow_html=True)
    
    case_summary = st.text_area(
        "Case Summary",
        value=case.case_summary,
        height=100,
        key="case_summary"
    )
    
    relief_sought = st.text_area(
        "Relief Sought (What the claimant wants)",
        value=case.relief_sought,
        height=80,
        key="relief_sought"
    )
    
    # Edit parties information
    st.markdown('<div class="section-header">👥 Parties Involved</div>', unsafe_allow_html=True)
    
    col1, col2 = st.columns(2)
    
    with col1:
        st.write("**Claimant/Plaintiff**")
        claimant_name = st.text_input("Claimant Name", value=case.claimant.name, key="claimant_name")
        claimant_contact = st.text_input("Claimant Contact", value=case.claimant.contact or "", key="claimant_contact")
        claimant_represented = st.text_input("Represented By", value=case.claimant.represented_by or "", key="claimant_rep")
    
    with col2:
        st.write("**Defendant/Respondent**")
        defendant_name = st.text_input("Defendant Name", value=case.defendant.name, key="defendant_name")
        defendant_contact = st.text_input("Defendant Contact", value=case.defendant.contact or "", key="defendant_contact")
        defendant_represented = st.text_input("Represented By", value=case.defendant.represented_by or "", key="defendant_rep")
    
    # Edit claims
    st.markdown('<div class="section-header">⚖️ Legal Claims</div>', unsafe_allow_html=True)
    
    claims = []
    if case.claims:
        for i, claim in enumerate(case.claims):
            with st.expander(f"Claim {i+1}: {claim.title}"):
                claim_title = st.text_input(f"Claim Title {i+1}", value=claim.title, key=f"claim_title_{i}")
                claim_desc = st.text_area(f"Claim Description {i+1}", value=claim.description, key=f"claim_desc_{i}")
                claim_amount = st.text_input(f"Amount Claimed {i+1}", value=claim.amount_claimed or "", key=f"claim_amount_{i}")
                
                claims.append(Claim(
                    title=claim_title,
                    description=claim_desc,
                    amount_claimed=claim_amount or None
                ))
    else:
        st.info("No claims extracted. You can add claims manually if needed.")
    
    # Edit evidence
    st.markdown('<div class="section-header">📄 Evidence</div>', unsafe_allow_html=True)
    
    evidence = []
    if case.evidence:
        for i, evid in enumerate(case.evidence):
            with st.expander(f"Evidence {i+1}: {evid.type}"):
                evid_type = st.selectbox(
                    f"Evidence Type {i+1}",
                    EVIDENCE_TYPES,
                    index=EVIDENCE_TYPES.index(evid.type) if evid.type in EVIDENCE_TYPES else 0,
                    key=f"evid_type_{i}"
                )
                evid_desc = st.text_area(f"Evidence Description {i+1}", value=evid.description, key=f"evid_desc_{i}")
                evid_status = st.selectbox(
                    f"Evidence Status {i+1}",
                    ["pending", "available", "pending_verification"],
                    index=["pending", "available", "pending_verification"].index(evid.status),
                    key=f"evid_status_{i}"
                )
                
                evidence.append(Evidence(
                    type=evid_type,
                    description=evid_desc,
                    status=evid_status
                ))
    else:
        st.info("No evidence extracted. You can add evidence items manually if needed.")
    
    # Key legal issues
    st.markdown('<div class="section-header">🔑 Key Legal Issues</div>', unsafe_allow_html=True)
    
    issues_text = st.text_area(
        "Key Legal Issues (one per line)",
        value="\n".join(case.key_legal_issues) if case.key_legal_issues else "",
        height=100,
        key="legal_issues"
    )
    key_legal_issues = [issue.strip() for issue in issues_text.split("\n") if issue.strip()]
    
    # Create updated case object
    updated_case = CaseIntake(
        case_title=case_title,
        jurisdiction=jurisdiction,
        case_type=case_type,
        claimant=Claimant(
            name=claimant_name,
            contact=claimant_contact or None,
            represented_by=claimant_represented or None
        ),
        defendant=Defendant(
            name=defendant_name,
            contact=defendant_contact or None,
            represented_by=defendant_represented or None
        ),
        date_of_incident=date_of_incident,
        date_of_filing=date_of_filing,
        claims=claims,
        evidence=evidence,
        case_summary=case_summary,
        relief_sought=relief_sought,
        key_legal_issues=key_legal_issues,
        confidence_score=case.confidence_score
    )
    
    return updated_case


def main():
    """Main application function"""
    st.markdown('<div class="main-header">⚖️ Legal Case Intake Form (RAG Grounded)</div>', unsafe_allow_html=True)
    st.markdown("*Extract and validate legal case information with grounding in actual statutes and case law*")
    
    # Sidebar for RAG status and settings
    with st.sidebar:
        st.markdown("### ⚙️ System Status")
        
        # Initialize extractor
        extractor = GroundedCaseExtractor()
        rag_status = extractor.get_rag_status()
        
        if rag_status['status'] == 'Ready':
            st.success(f"✓ RAG System Ready")
            st.info(f"Documents in knowledge base: {rag_status['total_documents']}")
        else:
            st.warning(f"⚠️ RAG Status: {rag_status['status']}")
            if rag_status['total_documents'] == 0:
                st.error("Knowledge base empty. Please run setup_knowledge_base.py first.")
        
        st.divider()
        st.markdown("### 📖 About RAG Grounding")
        st.markdown("""
        This system uses **Retrieval Augmented Generation (RAG)** to:
        - ✓ Prevent AI hallucinations
        - ✓ Ground responses in real laws and statutes
        - ✓ Provide legal references for extracted information
        - ✓ Ensure accuracy of legal analysis
        
        **Tech Stack:**
        - Embedding: sentence-transformers (CPU)
        - Vector DB: ChromaDB (local)
        - Framework: LangChain
        """)
    
    # Main input section
    st.markdown('<div class="section-header">📥 Case Narrative Input</div>', unsafe_allow_html=True)
    
    # Sample narrative
    sample_narrative = """Mr. Sharma has a neighbor, Mr. Patel, who owns a shop next to his house. 
On January 15, 2023, Patel's shop caught fire due to faulty electrical wiring. The fire spread to Sharma's house, 
causing damages worth approximately ₹50,000. Despite multiple requests, Patel has refused to compensate for the damages. 
Sharma consulted with his lawyer, Ms. Das, who suggested filing a case for negligence and recovery of damages. 
Sharma filed the case on March 1, 2023 in the District Court. Evidence includes photographs of the damaged property, 
a report from the fire department, and witness statements from neighbors."""
    
    col1, col2 = st.columns([4, 1])
    with col2:
        if st.button("📄 Load Sample"):
            st.session_state.original_narrative = sample_narrative
            st.rerun()
    
    user_narrative = st.text_area(
        "Enter the case narrative (in your own words, Hinglish/English accepted)",
        value=st.session_state.original_narrative,
        height=200,
        placeholder="Describe the case in detail. Include parties involved, dates, events, claims, and any evidence..."
    )
    
    # Jurisdiction and Case Type selection
    col1, col2 = st.columns(2)
    with col1:
        selected_jurisdiction = st.selectbox("Select Jurisdiction", JURISDICTIONS)
    with col2:
        selected_case_type = st.selectbox("Select Case Type", CASE_TYPES)
    
    # Submit button
    st.divider()
    
    submit_col1, submit_col2, submit_col3 = st.columns([1, 1, 2])
    
    with submit_col1:
        if st.button("🚀 Extract Case Info (RAG Grounded)", type="primary", use_container_width=True):
            # Validate input
            is_valid, message = validate_narrative(user_narrative)
            
            if not is_valid:
                st.error(f"⚠️ {message}")
            else:
                st.session_state.original_narrative = user_narrative
                
                with st.spinner("🔍 Analyzing case narrative with RAG grounding..."):
                    try:
                        # Use grounded extractor
                        extracted_case, grounding_info = extractor.extract_case_info_with_grounding(
                            narrative=user_narrative,
                            jurisdiction=selected_jurisdiction,
                            case_type=selected_case_type
                        )
                        
                        if extracted_case:
                            st.session_state.extracted_case = extracted_case
                            st.session_state.grounding_info = grounding_info
                            st.markdown(
                                '<div class="success-box">✓ Case information extracted successfully with RAG grounding!</div>',
                                unsafe_allow_html=True
                            )
                            st.rerun()
                        else:
                            st.markdown(
                                '<div class="error-box">✗ Failed to extract case information. Please try again.</div>',
                                unsafe_allow_html=True
                            )
                    except Exception as e:
                        st.markdown(
                            f'<div class="error-box">✗ Error: {str(e)}</div>',
                            unsafe_allow_html=True
                        )
    
    with submit_col2:
        if st.button("🔄 Reset Form", use_container_width=True):
            st.session_state.extracted_case = None
            st.session_state.original_narrative = ""
            st.session_state.show_edit = False
            st.session_state.grounding_info = None
            st.rerun()
    
    # Display and edit extracted case
    if st.session_state.extracted_case:
        st.divider()
        
        # Display grounding info first
        if st.session_state.grounding_info:
            display_grounding_info(st.session_state.grounding_info)
        
        # Create tabs for different views
        tab1, tab2, tab3 = st.tabs(["📋 View Extracted Data", "✏️ Edit Details", "📥 Export"])
        
        with tab1:
            st.markdown('<div class="section-header">Extracted Case Information</div>', unsafe_allow_html=True)
            
            # Display confidence score
            if st.session_state.extracted_case.confidence_score:
                confidence = st.session_state.extracted_case.confidence_score
                col1, col2 = st.columns([1, 3])
                with col1:
                    st.metric("Confidence Score", f"{confidence:.0%}")
            
            # Display key information
            col1, col2 = st.columns(2)
            
            with col1:
                st.write("**Case Title:**")
                st.write(st.session_state.extracted_case.case_title)
                
                st.write("\n**Jurisdiction:**")
                st.write(st.session_state.extracted_case.jurisdiction)
                
                st.write("\n**Case Type:**")
                st.write(st.session_state.extracted_case.case_type)
            
            with col2:
                st.write("**Date of Incident:**")
                st.write(st.session_state.extracted_case.date_of_incident or "Not provided")
                
                st.write("\n**Date of Filing:**")
                st.write(st.session_state.extracted_case.date_of_filing or "Not provided")
            
            # Parties
            st.markdown('**Claimant/Plaintiff:**')
            st.json(st.session_state.extracted_case.claimant.model_dump())
            
            st.markdown('**Defendant/Respondent:**')
            st.json(st.session_state.extracted_case.defendant.model_dump())
            
            # Summary and relief
            st.markdown('**Case Summary:**')
            st.write(st.session_state.extracted_case.case_summary)
            
            st.markdown('**Relief Sought:**')
            st.write(st.session_state.extracted_case.relief_sought)
            
            # Claims
            if st.session_state.extracted_case.claims:
                st.markdown('**Legal Claims:**')
                for i, claim in enumerate(st.session_state.extracted_case.claims, 1):
                    st.json(claim.model_dump())
            
            # Evidence
            if st.session_state.extracted_case.evidence:
                st.markdown('**Evidence:**')
                for i, evid in enumerate(st.session_state.extracted_case.evidence, 1):
                    st.json(evid.model_dump())
            
            # Key legal issues
            if st.session_state.extracted_case.key_legal_issues:
                st.markdown('**Key Legal Issues:**')
                for issue in st.session_state.extracted_case.key_legal_issues:
                    st.write(f"• {issue}")
        
        with tab2:
            # Edit mode
            edited_case = edit_case_details(st.session_state.extracted_case)
            
            if st.button("💾 Save Changes", type="primary"):
                st.session_state.extracted_case = edited_case
                st.markdown(
                    '<div class="success-box">✓ Changes saved successfully!</div>',
                    unsafe_allow_html=True
                )
        
        with tab3:
            st.markdown('<div class="section-header">📥 Export Data</div>', unsafe_allow_html=True)
            
            # Export as JSON
            json_data = safe_json_dump(st.session_state.extracted_case)
            
            col1, col2 = st.columns(2)
            
            with col1:
                st.write("**JSON Format:**")
                st.code(json_data, language="json")
                
                st.download_button(
                    label="📥 Download as JSON",
                    data=json_data,
                    file_name=f"case_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json",
                    mime="application/json"
                )
            
            with col2:
                st.write("**Summary:**")
                summary_text = f"""Case: {st.session_state.extracted_case.case_title}
Jurisdiction: {st.session_state.extracted_case.jurisdiction}
Case Type: {st.session_state.extracted_case.case_type}

Claimant: {st.session_state.extracted_case.claimant.name}
Defendant: {st.session_state.extracted_case.defendant.name}

Number of Claims: {len(st.session_state.extracted_case.claims)}
Number of Evidence Items: {len(st.session_state.extracted_case.evidence)}

Extracted at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}

RAG Grounding: {'✓ Grounded in legal documents' if st.session_state.grounding_info and st.session_state.grounding_info['relevant_laws'] else '⚠ Limited grounding'}
"""
                st.text_area("Summary", value=summary_text, height=250, disabled=True)


if __name__ == "__main__":
    main()
