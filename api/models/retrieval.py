# =============================================================================
# api/models/retrieval.py
# Milestone 3 — Retrieval Layer
# Defines Pydantic models for case law retrieval from Qdrant.
# =============================================================================

from typing import List, Optional
from pydantic import BaseModel, Field

class RetrievedAuthorityV2(BaseModel):
    """
    Represents a single chunk of case law retrieved from the vector database.
    This provides the grounding for LLM argument generation in Milestone 4.
    """
    case_name: str = Field(..., description="Name of the case (e.g., Smith v. Jones)")
    citation: str = Field(..., description="Official citation string")
    court: str = Field(..., description="Court that decided the case")
    decision_date: str = Field(..., description="Date of the decision")
    matched_chunk_text: str = Field(..., description="The actual text extracted from the opinion")
    similarity_score: float = Field(..., description="Cosine similarity score from the vector database")
    jurisdiction: str = Field(..., description="Jurisdiction of the case (for verification)")

class RetrievalResponse(BaseModel):
    """
    The full response from the /api/retrieve endpoint.
    """
    case_id: str = Field(..., description="The ID of the structured case that was queried")
    authorities: List[RetrievedAuthorityV2] = Field(..., description="Ranked list of retrieved authorities")
    insufficient_grounding: bool = Field(
        ..., 
        description="True if fewer than 3 relevant authorities were found above the threshold."
    )
    message: str = Field(..., description="Status message describing the retrieval result")
