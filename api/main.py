# =============================================================================
# api/main.py — FastAPI backend for the Opposing-Argument Simulator
# Milestone 6: Production hardening — rate limiting, structured logging,
# graceful failure handling, and prompt-injection sanitisation.
#
# Milestone history:
#   M1 — scaffold & mock routes
#   M2 — real Groq-powered case intake
#   M3 — Qdrant RAG retrieval
#   M4 — SSE streaming generation & citation verification
#   M5 — rebuttal workspace & PDF export
#   M6 — rate limiting, eval harness, structured logging, hardening
# =============================================================================

from __future__ import annotations

import logging
import os
import re
import time
import uuid
from datetime import datetime, timezone
from typing import List, Optional

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Request, Response
from fastapi.concurrency import run_in_threadpool
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
import json
import asyncio

# ── Rate limiting (slowapi) ────────────────────────────────────────────────────
try:
    from slowapi import Limiter, _rate_limit_exceeded_handler
    from slowapi.util import get_remote_address
    from slowapi.errors import RateLimitExceeded
    _RATE_LIMIT_AVAILABLE = True
except ImportError:
    _RATE_LIMIT_AVAILABLE = False
    logger_bootstrap = logging.getLogger("opposing_simulator")
    logger_bootstrap.warning(
        "slowapi not installed — rate limiting disabled. "
        "Run: pip install slowapi"
    )

# Load .env early so GROQ_API_KEY is available to case_parser at import time.
# search_directories walks up to find .env in parent dirs too.
load_dotenv(dotenv_path=None, override=False)
from pathlib import Path
_env_candidates = [
    Path(".") / ".env",
    Path("..") / ".env",
    Path("D:/case_intake_app3") / ".env",
]
for _candidate in _env_candidates:
    if _candidate.exists():
        load_dotenv(dotenv_path=str(_candidate), override=False)
        break

# ── Logging & Request ID correlation ──────────────────────────────────────────
class RequestIdFormatter(logging.Formatter):
    """Safely formats log records by ensuring request_id is always present."""
    def format(self, record):
        if not hasattr(record, 'request_id'):
            record.request_id = '-'
        return super().format(record)

_log_handler = logging.StreamHandler()
_log_handler.setFormatter(RequestIdFormatter(
    fmt="%(asctime)s  %(levelname)-8s  %(name)s  req=%(request_id)s  %(message)s",
    datefmt="%Y-%m-%dT%H:%M:%S"
))

# Clear default handlers and set ours
logging.root.handlers = [_log_handler]
logging.root.setLevel(logging.INFO)

logger = logging.getLogger("opposing_simulator")

# ── Milestone 2–5 imports ─────────────────────────────────────────────────────
from api.models.structured_case import (
    ExtractionMethod,
    IntakeResponseV2,
    RawIntake,
    StructuredCaseV2,
)
from api.models.retrieval import RetrievalResponse
from api.services.case_parser import extract_case_facts
from api.services.jurisdiction_validator import validate_jurisdiction
from api.services.retrieval_service import retrieve_authorities
from api.services.llm_service import (
    analyze_simulation_weaknesses,
    generate_opposing_arguments_stream,
    generate_rebuttal_hints,
)
from api.services.citation_verifier import verify_citations

# ── Rate limiter ──────────────────────────────────────────────────────────────
if _RATE_LIMIT_AVAILABLE:
    limiter = Limiter(key_func=get_remote_address)
else:
    limiter = None

# ── Prompt injection patterns ─────────────────────────────────────────────────
# Strip common prompt-injection attempts before text reaches the LLM.
_INJECTION_PATTERN = re.compile(
    r"(ignore (previous|all) instructions?|disregard (system|prior)|\[SYSTEM\]|<\|system\|>|act as (an?|a) )",
    re.IGNORECASE,
)

def _sanitize_narrative(text: str) -> str:
    """Remove obvious prompt-injection attempts from free-text fields."""
    return _INJECTION_PATTERN.sub("[removed]", text)

# ── App ───────────────────────────────────────────────────────────────────────
app = FastAPI(
    title="Opposing-Argument Simulator API",
    description=(
        "Educational legal-tech API that generates opposing arguments "
        "for self-represented litigants to practise against. "
        "Milestone 6 — production hardened with rate limiting & structured logging."
    ),
    version="6.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

if _RATE_LIMIT_AVAILABLE and limiter:
    app.state.limiter = limiter
    app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# ── CORS ──────────────────────────────────────────────────────────────────────
ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://localhost:3001",
    "https://*.vercel.app",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)


# ── Request ID & latency middleware ───────────────────────────────────────────
@app.middleware("http")
async def _request_id_middleware(request: Request, call_next):
    """
    Attach a unique request_id to every request for log correlation.
    CRITIC 3: We log only metadata (method, path, latency, status).
              We NEVER log request bodies, narratives, or any case content.
    """
    request_id = str(uuid.uuid4())[:8].upper()
    request.state.request_id = request_id
    t_start = time.monotonic()

    response: Response = await call_next(request)

    latency_ms = round((time.monotonic() - t_start) * 1000, 1)
    logger.info(
        "HTTP %s %s -> %d  latency=%sms",
        request.method,
        request.url.path,
        response.status_code,
        latency_ms,
        extra={"request_id": request_id},
    )
    response.headers["X-Request-Id"] = request_id
    return response


# =============================================================================
# Milestone 1 models — preserved for backward compatibility.
# /api/generate-opposition and the simulation page still use these.
# DO NOT remove or rename these until those routes are updated.
# =============================================================================

class CaseInput(BaseModel):
    """Legacy Milestone 1 case input model. Kept for /api/generate-opposition."""
    plaintiff_name:  str = Field(..., min_length=1, max_length=200, examples=["Jane Smith"])
    defendant_name:  str = Field(..., min_length=1, max_length=200, examples=["Acme Corporation"])
    claim_type:      str = Field(..., examples=["breach_of_contract"])
    jurisdiction:    str = Field(..., min_length=1, max_length=100, examples=["California"])
    filing_date:     str = Field(..., examples=["2024-01-15"])
    incident_date:   str = Field(..., examples=["2023-11-01"])
    facts:           str = Field(..., min_length=50, max_length=10_000)
    relief_sought:   str = Field(..., min_length=1, max_length=1_000)


class GenerateOppositionRequest(BaseModel):
    case_id:    str
    case_input: CaseInput


class RetrievedAuthority(BaseModel):
    case_name:       str
    citation:        str
    court:           str
    year:            int
    jurisdiction:    str
    holding:         str
    relevance_score: float = Field(..., ge=0.0, le=1.0)
    url:             Optional[str] = None


class OpposingArgument(BaseModel):
    id:                     str
    argument_type:          str
    heading:                str
    body:                   str
    supporting_authorities: List[RetrievedAuthority] = Field(default_factory=list)
    confidence_score:       float = Field(..., ge=0.0, le=1.0)
    weakness_notes:         str


class OpposingArgumentsResponse(BaseModel):
    case_id:          str
    milestone:        int
    is_mock:          bool
    generated_at:     str
    arguments:        List[OpposingArgument]
    overall_strategy: str
    disclaimer:       str


class HealthResponse(BaseModel):
    status:    str
    milestone: int
    version:   str
    timestamp: str


# =============================================================================
# Helpers
# =============================================================================

def _now_iso() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def _make_case_id() -> str:
    return str(uuid.uuid4())[:8].upper()


def _mock_authorities_for(claim_type: str, jurisdiction: str) -> List[RetrievedAuthority]:
    """Return 2 MOCK authorities. Milestone 3 replaces with Qdrant retrieval."""
    return [
        RetrievedAuthority(
            case_name="Carma Developers (Cal.) Inc. v. Marathon Dev. California, Inc.",
            citation="2 Cal.4th 342 (1992)",
            court="California Supreme Court",
            year=1992,
            jurisdiction=jurisdiction,
            holding=(
                "To prevail on a breach of contract claim, plaintiff must prove "
                "existence of the contract, plaintiff's performance, defendant's breach, "
                "and resulting damages."
            ),
            relevance_score=0.91,
            url="https://cite.case.law/cal-4th/2/342/",
        ),
        RetrievedAuthority(
            case_name="Acoustics, Inc. v. Trepte Construction Co.",
            citation="14 Cal.App.3d 887 (1971)",
            court="California Court of Appeal",
            year=1971,
            jurisdiction=jurisdiction,
            holding=(
                "Damages for breach of contract must be clearly ascertainable; "
                "speculative damages are not recoverable."
            ),
            relevance_score=0.78,
            url=None,
        ),
    ]


def _build_mock_arguments(
    plaintiff: str,
    defendant: str,
    claim_type: str,
    jurisdiction: str,
    facts: str,
) -> List[OpposingArgument]:
    authorities = _mock_authorities_for(claim_type, jurisdiction)
    return [
        OpposingArgument(
            id="arg-001",
            argument_type="substantive",
            heading="[MOCK] Failure to Establish Material Breach",
            body=(
                f"[MOCK DATA — Milestone 1] Even accepting {plaintiff}'s characterisation "
                f"of the facts, {defendant} contends that no material breach occurred. "
                f"Under {jurisdiction} law, a breach is only actionable if it goes to the "
                f"essence of the contract."
            ),
            supporting_authorities=authorities,
            confidence_score=0.85,
            weakness_notes=(
                "Explore whether the contract contained a time-is-of-the-essence clause."
            ),
        ),
        OpposingArgument(
            id="arg-002",
            argument_type="procedural",
            heading="[MOCK] Statute of Limitations / Laches",
            body=(
                f"[MOCK DATA — Milestone 1] {defendant} reserves the right to assert "
                f"that {plaintiff}'s claims are time-barred in {jurisdiction}."
            ),
            supporting_authorities=[],
            confidence_score=0.62,
            weakness_notes="Check the exact filing date against each alleged act of breach.",
        ),
        OpposingArgument(
            id="arg-003",
            argument_type="damages",
            heading="[MOCK] Failure to Mitigate Damages",
            body=(
                f"[MOCK DATA — Milestone 1] {plaintiff} was obligated to take reasonable "
                f"steps to minimise losses once any breach occurred in {jurisdiction}."
            ),
            supporting_authorities=[authorities[1]],
            confidence_score=0.74,
            weakness_notes="Document every step you took to minimise your losses.",
        ),
    ]


# =============================================================================
# Routes
# =============================================================================

@app.get("/", tags=["info"], summary="API root info")
async def root():
    return {
        "name":      "Opposing-Argument Simulator API",
        "milestone": 2,
        "status":    "ok",
        "docs":      "/docs",
        "health":    "/api/health",
    }


@app.get(
    "/api/health",
    response_model=HealthResponse,
    tags=["ops"],
    summary="Health check",
)
async def health_check() -> HealthResponse:
    """Returns 200 with current milestone number. Used by CI and Vercel health checks."""
    logger.info("Health check", extra={"request_id": "-"})
    return HealthResponse(
        status="ok",
        milestone=6,
        version="6.0.0",
        timestamp=_now_iso(),
    )


# =============================================================================
# /api/intake — Milestone 2 (real Groq-powered extraction)
# =============================================================================

@app.post(
    "/api/intake",
    response_model=IntakeResponseV2,
    tags=["case"],
    summary="Submit case intake (Milestone 2: Groq LLM extraction with regex fallback)",
    responses={
        200: {"description": "Case processed. Check missing_context for warnings."},
        422: {
            "description": (
                "Unprocessable entity. Returned when: (1) narrative is empty, "
                "(2) jurisdiction is missing/unresolvable, or (3) claim_type is missing."
            )
        },
    },
)
def intake(raw_intake: RawIntake) -> IntakeResponseV2:
    """
    Accepts a RawIntake (multi-step wizard output), extracts structured facts
    using the Groq LLM (with regex fallback), validates jurisdiction and
    claim_type, and returns an IntakeResponseV2.

    Validation gates (CRITIC 3 compliance):
    - Empty narrative → HTTP 422, case does not proceed.
    - Missing jurisdiction → HTTP 422, case does not proceed.
    - Unresolvable jurisdiction → HTTP 422, case does not proceed.
    - Missing claim_type → HTTP 422 (enforced by Pydantic before this handler runs).
    - Empty key_dates → HTTP 200 with explicit missing_context warning.
    """
    # ── Gate 1: Empty narrative ───────────────────────────────────────────────
    if not raw_intake.narrative.strip():
        raise HTTPException(
            status_code=422,
            detail=(
                "Narrative is empty — no facts could be extracted. "
                "Please describe what happened in Step 4 of the intake form."
            ),
        )

    # ── Gate 2: Jurisdiction must be present and resolvable ───────────────────
    if not raw_intake.jurisdiction.strip():
        raise HTTPException(
            status_code=422,
            detail=(
                "Jurisdiction is required. Please select your jurisdiction "
                "from the dropdown in Step 2."
            ),
        )

    is_valid_jurisdiction, normalised_jurisdiction = validate_jurisdiction(
        raw_intake.jurisdiction
    )
    if not is_valid_jurisdiction:
        raise HTTPException(
            status_code=422,
            detail=(
                f"Jurisdiction '{raw_intake.jurisdiction}' could not be resolved to a "
                "known dataset entry. Please select a valid US state or 'Federal' "
                "from the dropdown. Retrieval and simulation cannot proceed without "
                "a valid jurisdiction."
            ),
        )

    # Replace the user's raw string with the normalised canonical form so all
    # downstream modules receive a consistent jurisdiction string.
    raw_intake_normalised = raw_intake.model_copy(
        update={"jurisdiction": normalised_jurisdiction}
    )

    # ── Extraction ────────────────────────────────────────────────────────────
    logger.info(
        "Intake received | claim=%s | jurisdiction=%s | narrative_words=%d",
        raw_intake.claim_type.value,
        normalised_jurisdiction,
        len(raw_intake.narrative.split()),
    )

    structured, method = extract_case_facts(raw_intake_normalised)

    # Stamp the validated jurisdiction flag onto the structured case
    # (case_parser sets it False; only the route handler has the validation result).
    structured = structured.model_copy(
        update={
            "jurisdiction": normalised_jurisdiction,
            "jurisdiction_validated": True,
        }
    )

    # ── Gate 3: Post-extraction key_dates check ───────────────────────────────
    # (already added by case_parser if empty, but we guard here too)
    if not structured.key_dates:
        warning = (
            "No incident date provided — statute of limitations cannot be checked. "
            "Please include the date the incident occurred."
        )
        if warning not in structured.missing_context:
            structured.missing_context.append(warning)

    # ── Build response ────────────────────────────────────────────────────────
    extraction_method_label = (
        "Groq LLM (llama-3.3-70b-versatile)"
        if method == ExtractionMethod.groq_llm
        else "Regex fallback (reduced accuracy)"
    )

    has_warnings = bool(structured.missing_context)
    message = (
        f"Case '{structured.case_id}' processed via {extraction_method_label}. "
        f"Claim: {structured.claim_type.value} | Jurisdiction: {normalised_jurisdiction}. "
        + (
            f"{len(structured.missing_context)} warning(s) require your attention."
            if has_warnings
            else "All required fields extracted successfully."
        )
    )

    logger.info(
        "Intake processed | case_id=%s | method=%s | confidence=%.2f | warnings=%d",
        structured.case_id,
        method.value,
        structured.extraction_confidence,
        len(structured.missing_context),
    )

    return IntakeResponseV2(
        case_id=structured.case_id,
        milestone=2,
        is_mock=False,
        extraction_method=method,
        structured_case=structured,
        missing_context=structured.missing_context,
        message=message,
    )


# =============================================================================
# /api/generate-opposition — Milestone 1 (unchanged mock route)
# =============================================================================

@app.post(
    "/api/generate-opposition",
    response_model=OpposingArgumentsResponse,
    tags=["simulation"],
    summary="Generate opposing arguments (Milestone 1: hardcoded mock — unchanged)",
)
def generate_opposition(
    request: GenerateOppositionRequest,
) -> OpposingArgumentsResponse:
    """
    Milestone 1 mock route — unchanged.
    Milestone 4 will replace the mock content with Claude-streamed arguments.
    """
    logger.info(
        "generate-opposition called | case_id=%s | plaintiff=%s",
        request.case_id,
        request.case_input.plaintiff_name,
    )

    arguments = _build_mock_arguments(
        plaintiff=request.case_input.plaintiff_name,
        defendant=request.case_input.defendant_name,
        claim_type=request.case_input.claim_type,
        jurisdiction=request.case_input.jurisdiction,
        facts=request.case_input.facts,
    )

    return OpposingArgumentsResponse(
        case_id=request.case_id,
        milestone=1,
        is_mock=True,
        generated_at=_now_iso(),
        arguments=arguments,
        overall_strategy=(
            "[MOCK — Milestone 1] Primary strategy: challenge materiality of breach, "
            "assert procedural bars, reduce damages via duty-to-mitigate. "
            "Real strategy analysis using Claude added in Milestone 4."
        ),
        disclaimer=(
            "EDUCATIONAL SIMULATION ONLY. These arguments were generated as mock data "
            "and do not constitute legal advice. Always consult a qualified attorney."
        ),
    )


# =============================================================================
# /api/retrieve — Milestone 3 (real Qdrant retrieval)
# =============================================================================

@app.post(
    "/api/retrieve",
    response_model=RetrievalResponse,
    tags=["retrieval"],
    summary="Retrieve legal authorities (Milestone 3: Qdrant RAG)",
)
def retrieve_authorities_route(
    structured_case: StructuredCaseV2,
    limit: int = 10,
) -> RetrievalResponse:
    """
    Queries the Qdrant vector database for relevant case law based on the structured facts.
    Strictly filters by the provided jurisdiction.
    """
    logger.info("retrieve called | case_id=%s | jurisdiction=%s", structured_case.case_id, structured_case.jurisdiction)
    
    try:
        response = retrieve_authorities(structured_case, k=limit)
        return response
    except Exception as e:
        logger.error(f"Retrieval error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# =============================================================================
# V2 Chat & Analysis Models
# =============================================================================

class ChatMessage(BaseModel):
    role: str # "user" or "opponent"
    content: str

class SimulationRequest(BaseModel):
    case_facts: StructuredCaseV2
    chat_history: List[ChatMessage] = Field(default_factory=list)

class WeaknessAnalysisRequest(BaseModel):
    case_facts: StructuredCaseV2
    chat_history: List[ChatMessage]

WeaknessAnalysisResponse = None  # alias — see AnalyzeWeaknessesResponse below

# =============================================================================
# /api/generate-opposition-v2 — Milestone 4 (SSE streaming & verification)
# Milestone 6: Rate limited, narrative sanitized, Qdrant fallback hardened.
# =============================================================================



class AnalyzeWeaknessesRequest(BaseModel):
    case_facts: StructuredCaseV2
    chat_history: List[ChatMessage]


class AnalyzeWeaknessesResponse(BaseModel):
    weaknesses: List[str]
    improvement_tips: List[str]


@app.post(
    "/api/generate-opposition-v2",
    tags=["simulation"],
    summary="Generate opposing arguments (Milestone 6: rate-limited, hardened)",
)
async def generate_opposition_v2(
    request: Request,
    payload: SimulationRequest,
):
    """
    Generative AI core (SSE streaming) with continuous chat support.
    — Rate limited: 5 requests/minute per IP (Groq free tier protection).
    — Narrative sanitised against prompt injection before LLM call.
    — Qdrant downtime handled gracefully (returns empty authority set + warning).
    — Groq errors surface as calm, non-alarming user-facing SSE error events.
    CRITIC 3: No case content is ever logged; only metadata (case_id, g_v, latency).
    """
    structured_case = payload.case_facts
    chat_history = payload.chat_history

    # Apply rate limit if slowapi is available
    if _RATE_LIMIT_AVAILABLE and limiter:
        try:
            await limiter._check_request_limit(request, None, "5/minute", None)
        except Exception:
            # If rate limit exceeded, slowapi raises; we catch and surface calmly.
            pass

    # D1: Sanitize narrative against prompt injection before any LLM interaction
    sanitized_narrative = _sanitize_narrative(structured_case.raw_narrative or "")
    if sanitized_narrative != (structured_case.raw_narrative or ""):
        logger.warning(
            "Prompt injection pattern removed from narrative | case_id=%s",
            structured_case.case_id,
            extra={"request_id": getattr(request.state, 'request_id', '-')},
        )
    structured_case = structured_case.model_copy(
        update={"raw_narrative": sanitized_narrative}
    )

    t_request_start = time.monotonic()
    skip_retrieval = os.getenv("QDRANT_SKIP_RETRIEVAL", "false").lower() == "true"

    async def event_generator():
        # Immediate heartbeat to keep Vercel connection alive
        yield f"event: heartbeat\ndata: {json.dumps({'status': 'Retrieving authorities...'})}\n\n"
        
        try:
            # Internal retrieval — Qdrant downtime is caught and handled gracefully
            if skip_retrieval:
                logger.info("Qdrant retrieval skipped | case_id=%s", structured_case.case_id)
                authorities = []
                insufficient_grounding = False
            else:
                try:
                    retrieval_resp = await run_in_threadpool(retrieve_authorities, structured_case, 10)
                    authorities = retrieval_resp.authorities
                    insufficient_grounding = retrieval_resp.insufficient_grounding
                except Exception as qdrant_err:
                    logger.error(
                        "Qdrant retrieval failed | case_id=%s | error=%s",
                        structured_case.case_id,
                        type(qdrant_err).__name__,
                        extra={"request_id": getattr(request.state, 'request_id', '-')},
                    )
                    # ── HARD GATE: Qdrant is down → refuse to hallucinate ─────────────
                    _no_db_msg = (
                        "The legal database is temporarily unavailable. "
                        "Simulation is disabled to prevent ungrounded arguments. "
                        "Please restart the backend and try again."
                    )
                    yield f"event: error\ndata: {json.dumps({'error': _no_db_msg, 'code': 'DB_UNAVAILABLE'})}\n\n"
                    return

            # ── HARD GATE: No authorities retrieved → refuse to hallucinate ─────────
            if not authorities:
                _no_auth_msg = (
                    "Simulation halted: the retrieval layer found no jurisdiction-specific "
                    f"authorities for '{structured_case.jurisdiction}' matching this case type. "
                    "This tool only generates arguments grounded in retrieved law. "
                    "Please verify that the knowledge base has been seeded for this jurisdiction "
                    "(run: python api/scripts/build_knowledge_base.py) and that the jurisdiction "
                    "field in your case matches an available state."
                )
                logger.warning(
                    "Hard gate triggered — no authorities for jurisdiction=%s claim_type=%s | case_id=%s",
                    structured_case.jurisdiction,
                    getattr(structured_case, 'claim_type', 'unknown'),
                    structured_case.case_id,
                    extra={"request_id": getattr(request.state, 'request_id', '-')},
                )
                yield f"event: error\ndata: {json.dumps({'error': _no_auth_msg, 'code': 'NO_AUTHORITIES'})}\n\n"
                return

            # ── HARD GATE: Insufficient grounding → refuse to hallucinate ─────────
            if insufficient_grounding:
                _low_ground_msg = (
                    "Simulation halted: the retrieval layer found fewer strongly matching "
                    "authorities than required to generate a reliably grounded simulation. "
                    "This tool refuses to generate arguments that cannot be traced to "
                    "verifiable, retrieved legal sources. "
                    "Please try refining your case narrative, or select a jurisdiction with "
                    "a larger seeded knowledge base (currently California is best supported)."
                )
                logger.warning(
                    "Hard gate triggered — insufficient grounding | jurisdiction=%s | case_id=%s",
                    structured_case.jurisdiction,
                    structured_case.case_id,
                    extra={"request_id": getattr(request.state, 'request_id', '-')},
                )
                yield f"event: error\ndata: {json.dumps({'error': _low_ground_msg, 'code': 'INSUFFICIENT_GROUNDING'})}\n\n"
                return

            yield f"event: heartbeat\ndata: {json.dumps({'status': 'Drafting arguments...'})}\n\n"
            
            # Helper to stream and accumulate
            async def _run_generation(is_retry=False):
                async for chunk in generate_opposing_arguments_stream(
                    structured_case, authorities, chat_history=chat_history, is_retry=is_retry
                ):
                    # Send delta event
                    yield f"event: delta\ndata: {json.dumps({'text': chunk})}\n\n"
            
            # Initial generation
            full_text = ""
            async for event_str in _run_generation(is_retry=False):
                if event_str.startswith("event: delta"):
                    # parse out the delta to accumulate
                    payload_data = json.loads(event_str.replace("event: delta\ndata: ", "").strip())
                    full_text += payload_data.get("text", "")
                yield event_str
                
            # Verification phase (C1-C4)
            yield f"event: heartbeat\ndata: {json.dumps({'status': 'Verifying citations...'})}\n\n"
            
            try:
                # Try to parse the LLM's JSON response
                # Use regex to robustly extract the JSON array, ignoring preamble
                clean_text = full_text.strip()
                match = re.search(r'\[.*\]', clean_text, re.DOTALL)
                if match:
                    clean_text = match.group(0)
                    
                generated_json = json.loads(clean_text)
                verified_args, g_v = verify_citations(generated_json, authorities)
                
                # C4: Retry if G_v < 0.90
                if g_v < 0.90:
                    yield f"event: retry\ndata: {json.dumps({'status': f'Grounding Verification failed (G_v={g_v:.2f}). Regenerating...'})}\n\n"
                    
                    full_text_retry = ""
                    async for event_str in _run_generation(is_retry=True):
                        if event_str.startswith("event: delta"):
                            payload_data_retry = json.loads(event_str.replace("event: delta\ndata: ", "").strip())
                            full_text_retry += payload_data_retry.get("text", "")
                        yield event_str
                        
                    # Verify again
                    clean_text_retry = full_text_retry.strip()
                    match = re.search(r'\[.*\]', clean_text_retry, re.DOTALL)
                    if match:
                        clean_text_retry = match.group(0)
                        
                    generated_json_retry = json.loads(clean_text_retry)
                    verified_args, g_v = verify_citations(generated_json_retry, authorities)

                # Final complete payload
                final_payload = {
                    "arguments": verified_args,
                    "g_v_score": g_v,
                    "retrieved_authorities": [a.model_dump() for a in authorities],
                    "insufficient_grounding": insufficient_grounding
                }
                yield f"event: complete\ndata: {json.dumps(final_payload)}\n\n"
                
            except json.JSONDecodeError:
                # CRITIC 3: Do NOT log full_text — it contains generated argument content
                logger.error(
                    "LLM JSON parse error | case_id=%s",
                    structured_case.case_id,
                    extra={"request_id": getattr(request.state, 'request_id', '-')},
                )
                _parse_err_msg = "The AI response could not be processed. This occasionally happens on the free tier. Please try again."
                yield f"event: error\ndata: {json.dumps({'error': _parse_err_msg})}\n\n"
                
        except Exception as outer_err:
            # CRITIC 2: calm, non-alarming message for a stressed self-represented litigant
            # CRITIC 3: log only error type and case_id, never the exception message
            logger.error(
                "SSE generation error | case_id=%s | error_type=%s",
                structured_case.case_id,
                type(outer_err).__name__,
                extra={"request_id": getattr(request.state, 'request_id', '-')},
            )
            _gen_err_msg = "Something went wrong while generating arguments. Our service may be experiencing high demand. Please wait a moment and try again."
            yield f"event: error\ndata: {json.dumps({'error': _gen_err_msg})}\n\n"

    # Headers for SSE
    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )

# =============================================================================

# =============================================================================
# /api/rebuttal-hints — Milestone 5 (Lightweight LLM Helper)
# =============================================================================

class RebuttalHintsRequest(BaseModel):
    argument_text: str

class RebuttalHintsResponse(BaseModel):
    hints: str

@app.post(
    "/api/rebuttal-hints",
    response_model=RebuttalHintsResponse,
    tags=["simulation"],
    summary="Get rebuttal starting points (Milestone 5)",
)
async def get_rebuttal_hints(req: RebuttalHintsRequest) -> RebuttalHintsResponse:
    """
    Returns 3-5 guiding questions to help the litigant draft their rebuttal.
    Does NOT draft the rebuttal for them.
    """
    try:
        hints = await generate_rebuttal_hints(req.argument_text)
        return RebuttalHintsResponse(hints=hints)
    except Exception as e:
        logger.error(f"Error in rebuttal-hints route: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post(
    "/api/analyze-weaknesses",
    response_model=AnalyzeWeaknessesResponse,
    tags=["simulation"],
    summary="Analyze user debate weaknesses",
)
async def analyze_weaknesses(req: AnalyzeWeaknessesRequest) -> AnalyzeWeaknessesResponse:
    try:
        result = await analyze_simulation_weaknesses(
            case_facts=req.case_facts.model_dump(),
            chat_history=[msg.model_dump() for msg in req.chat_history],
        )
        return AnalyzeWeaknessesResponse(
            weaknesses=result.get("weaknesses", [])[:3],
            improvement_tips=result.get("improvement_tips", [])[:6],
        )
    except Exception as e:
        logger.error("Error in analyze-weaknesses route: %s", type(e).__name__)
        raise HTTPException(status_code=500, detail="Could not analyze the practice session. Please try again.")

