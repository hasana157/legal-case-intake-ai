"""
Pydantic models for legal case intake form validation
"""
from typing import List, Optional
from datetime import date
from pydantic import BaseModel, Field


class Claimant(BaseModel):
    """Model for plaintiff/claimant information"""
    name: str = Field(..., description="Name of the claimant")
    contact: Optional[str] = Field(None, description="Contact information")
    represented_by: Optional[str] = Field(None, description="Legal representative if any")


class Defendant(BaseModel):
    """Model for defendant/respondent information"""
    name: str = Field(..., description="Name of the defendant")
    contact: Optional[str] = Field(None, description="Contact information")
    represented_by: Optional[str] = Field(None, description="Legal representative if any")


class Claim(BaseModel):
    """Model for individual legal claims"""
    title: str = Field(..., description="Title of the claim")
    description: str = Field(..., description="Detailed description of the claim")
    amount_claimed: Optional[str] = Field(None, description="Monetary amount if applicable")


class Evidence(BaseModel):
    """Model for evidence details"""
    type: str = Field(..., description="Type of evidence (document, witness, physical, digital, etc.)")
    description: str = Field(..., description="Description of the evidence")
    status: str = Field(default="pending", description="Status of evidence (pending, available, pending_verification)")


class CaseIntake(BaseModel):
    """Main case intake form model"""
    case_title: str = Field(..., description="Title/name of the case")
    jurisdiction: str = Field(..., description="Legal jurisdiction")
    case_type: str = Field(..., description="Type of case (Civil, Criminal, Family, Corporate, etc.)")
    
    # Parties involved
    claimant: Claimant = Field(..., description="Claimant/Plaintiff information")
    defendant: Defendant = Field(..., description="Defendant/Respondent information")
    
    # Case details
    date_of_incident: Optional[date] = Field(None, description="Date when the incident occurred")
    date_of_filing: Optional[date] = Field(None, description="Date when case was filed")
    
    # Legal information
    claims: List[Claim] = Field(default_factory=list, description="List of legal claims")
    evidence: List[Evidence] = Field(default_factory=list, description="List of available evidence")
    
    # Additional details
    case_summary: str = Field(..., description="Brief summary of the case in plain language")
    relief_sought: str = Field(..., description="What the claimant is asking for")
    key_legal_issues: List[str] = Field(default_factory=list, description="Main legal issues involved")
    
    # Metadata
    extracted_by_ai: bool = Field(default=True, description="Whether this was AI-extracted")
    confidence_score: Optional[float] = Field(None, description="AI confidence score (0-1)")


class EditableCase(BaseModel):
    """Model for user-editable case data after AI extraction"""
    original_narrative: str
    extracted_data: CaseIntake
