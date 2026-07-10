# =============================================================================
# api/models/structured_case.py
# Milestone 2 — Canonical Pydantic V2 data models for the Case Intake &
# Fact Structuring pipeline.
#
# These are the CANONICAL contracts between frontend, API, and all downstream
# milestone modules (retrieval, simulation, rebuttal). Field names and types
# are frozen after Milestone 2 — later milestones may only ADD optional fields.
# =============================================================================

from __future__ import annotations

import uuid
from datetime import datetime, timezone
from enum import Enum
from typing import List, Optional

from pydantic import BaseModel, Field, field_validator


# =============================================================================
# Enumerations
# =============================================================================

class ClaimTypeEnum(str, Enum):
    """Supported legal claim categories.

    The `str` mixin ensures that serialisation always yields the string value
    (e.g. "contract") rather than the enum member name — safe for JSON output.
    """
    small_claims    = "small_claims"
    tenancy         = "tenancy"
    family          = "family"
    contract        = "contract"
    employment      = "employment"
    personal_injury = "personal_injury"
    property        = "property"
    other           = "other"


class PartyRole(str, Enum):
    """Role of a party in the legal dispute."""
    plaintiff   = "plaintiff"
    defendant   = "defendant"
    third_party = "third_party"


class EvidenceType(str, Enum):
    """Type / medium of a piece of available evidence."""
    document = "document"
    photo    = "photo"
    video    = "video"
    witness  = "witness"
    digital  = "digital"   # e.g. emails, texts, screenshots
    physical = "physical"  # e.g. physical objects
    other    = "other"


class ExtractionMethod(str, Enum):
    """Which extraction path was used to produce this StructuredCaseV2."""
    groq_llm       = "groq_llm"
    regex_fallback = "regex_fallback"


# =============================================================================
# Sub-models
# =============================================================================

class Party(BaseModel):
    """A named party in the dispute."""
    name: str = Field(
        ...,
        min_length=1,
        max_length=200,
        description="Full name or entity name of the party.",
        examples=["Jane Smith"],
    )
    role: PartyRole = Field(
        ...,
        description="Role of this party: plaintiff, defendant, or third_party.",
    )


class KeyDate(BaseModel):
    """A legally significant date associated with the dispute."""
    label: str = Field(
        ...,
        min_length=1,
        max_length=200,
        description="Human-readable label, e.g. 'Incident date' or 'Contract signed'.",
        examples=["Incident date"],
    )
    date: str = Field(
        ...,
        description=(
            "ISO 8601 date string (YYYY-MM-DD). "
            "If only year or month is known, use YYYY or YYYY-MM."
        ),
        examples=["2024-03-15"],
    )

    @field_validator("date")
    @classmethod
    def date_not_empty(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("date must not be blank")
        return v.strip()


class EvidenceItem(BaseModel):
    """A single piece of available evidence the user has mentioned."""
    description: str = Field(
        ...,
        min_length=1,
        max_length=500,
        description="Plain-language description of the evidence item.",
        examples=["Signed lease agreement dated March 2023"],
    )
    type: EvidenceType = Field(
        ...,
        description="Category of evidence.",
    )


# =============================================================================
# Core schema: StructuredCaseV2
# =============================================================================

class StructuredCaseV2(BaseModel):
    """
    The canonical structured representation of a litigant's case after
    extraction from their free-text narrative.

    This schema is the single source of truth for all downstream milestone
    modules (Milestone 3: retrieval, Milestone 4: simulation, Milestone 5:
    rebuttal scoring). Only add optional fields in later milestones.
    """

    # ── Identity ──────────────────────────────────────────────────────────────
    case_id: str = Field(
        default_factory=lambda: str(uuid.uuid4())[:8].upper(),
        description="Auto-generated short UUID for this case.",
        examples=["A3F2C1D0"],
    )

    # ── Core extracted fields ─────────────────────────────────────────────────
    jurisdiction: str = Field(
        ...,
        description=(
            "Jurisdiction string as entered/selected by the user. "
            "See jurisdiction_validated to know if it resolved to a known dataset."
        ),
        examples=["California"],
    )
    claim_type: ClaimTypeEnum = Field(
        ...,
        description="Standardised legal claim category.",
    )
    parties: List[Party] = Field(
        default_factory=list,
        description="All parties named in the dispute.",
    )
    key_dates: List[KeyDate] = Field(
        default_factory=list,
        description=(
            "Chronologically significant dates extracted from or provided alongside "
            "the narrative. Empty list if none were identifiable."
        ),
    )
    disputed_facts: List[str] = Field(
        default_factory=list,
        description=(
            "Concise, atomic statements of disputed facts extracted from the "
            "narrative. Each entry is a single fact — one sentence maximum."
        ),
    )
    available_evidence: List[EvidenceItem] = Field(
        default_factory=list,
        description="Evidence items mentioned by the user.",
    )

    # ── Raw input ─────────────────────────────────────────────────────────────
    raw_narrative: str = Field(
        ...,
        description="The original unmodified narrative text submitted by the user.",
    )

    # ── Validation metadata ───────────────────────────────────────────────────
    jurisdiction_validated: bool = Field(
        default=False,
        description=(
            "True if jurisdiction resolved to a known dataset entry "
            "(set by jurisdiction_validator.py). "
            "False if the string was present but unrecognised."
        ),
    )
    missing_context: List[str] = Field(
        default_factory=list,
        description=(
            "Human-readable warnings about missing or ambiguous data. "
            "Each entry is a self-contained message suitable for display to "
            "a non-technical user. Examples: "
            "'No incident date provided — statute of limitations cannot be checked'."
        ),
    )
    extraction_confidence: float = Field(
        default=0.0,
        ge=0.0,
        le=1.0,
        description=(
            "Confidence score for the extraction: 0.0 (very low — regex fallback) "
            "to 1.0 (high — LLM extraction with all fields populated). "
            "Used by downstream modules to weight retrieval and simulation."
        ),
    )

    # ── Audit ─────────────────────────────────────────────────────────────────
    processed_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        description="UTC timestamp of when extraction was completed.",
    )


# =============================================================================
# Input model: RawIntake
# Exactly mirrors the multi-step wizard form output from the frontend.
# =============================================================================

class RawIntake(BaseModel):
    """
    Raw wizard form data submitted by the litigant.
    Field names are stable — the frontend contract depends on them.
    """
    parties: List[Party] = Field(
        default_factory=list,
        description="Parties entered in Step 1 of the wizard.",
    )
    claim_type: ClaimTypeEnum = Field(
        ...,
        description="Claim type selected in Step 2.",
    )
    jurisdiction: str = Field(
        ...,
        min_length=1,
        max_length=100,
        description="Jurisdiction selected from the dropdown in Step 2.",
        examples=["California"],
    )
    key_dates: List[KeyDate] = Field(
        default_factory=list,
        description="Key dates entered in Step 3.",
    )
    narrative: str = Field(
        ...,
        min_length=1,
        max_length=50_000,
        description=(
            "Free-text narrative entered in Step 4. "
            "Narratives exceeding 5,000 words will be chunked before LLM extraction."
        ),
    )
    evidence: List[EvidenceItem] = Field(
        default_factory=list,
        description="Evidence items entered in Step 5.",
    )


# =============================================================================
# API response model: IntakeResponseV2
# =============================================================================

class IntakeResponseV2(BaseModel):
    """
    Full response from POST /api/intake (Milestone 2+).
    Wraps StructuredCaseV2 and surfaces extraction metadata at the top level
    so the frontend can display warnings and method badges without unwrapping
    the nested structured_case object.
    """
    case_id: str = Field(..., description="Echo of structured_case.case_id.")
    milestone: int = Field(default=2)
    is_mock: bool = Field(
        default=False,
        description="Always False in Milestone 2+; True was only used in Milestone 1.",
    )
    extraction_method: ExtractionMethod = Field(
        ...,
        description=(
            "Indicates which extraction path was used. "
            "'groq_llm' — full LLM extraction via Groq API. "
            "'regex_fallback' — deterministic regex extraction "
            "(used when GROQ_API_KEY is absent or the API call fails)."
        ),
    )
    structured_case: StructuredCaseV2 = Field(
        ...,
        description="The fully structured case object.",
    )
    missing_context: List[str] = Field(
        ...,
        description=(
            "Top-level echo of structured_case.missing_context for convenient "
            "frontend rendering — avoids requiring the UI to unwrap nested JSON."
        ),
    )
    message: str = Field(
        ...,
        description="Human-readable summary message for display in the success panel.",
    )
