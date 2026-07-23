# =============================================================================
# api/services/retrieval_service.py
# Milestone 3 — Jurisdiction-Grounded Retrieval Layer
# Uses Qdrant Cloud and sentence-transformers to retrieve relevant case law.
# =============================================================================

import os
import logging
from pathlib import Path
from typing import List

from api.models.structured_case import StructuredCaseV2
from api.models.retrieval import RetrievedAuthorityV2, RetrievalResponse

logger = logging.getLogger("opposing_simulator.retrieval")

# ── Lazy package loading ────────────────────────────────────────────────────────
# qdrant-client and sentence-transformers are loaded lazily so the server
# can start and serve /api/intake even if these heavy packages are not yet
# installed.  They are only required at retrieval time.

_embedding_model = None
_EMBEDDING_MODEL_LOADED = False

def _get_embedding_model():
    global _embedding_model, _EMBEDDING_MODEL_LOADED
    if _EMBEDDING_MODEL_LOADED:
        return _embedding_model
    _EMBEDDING_MODEL_LOADED = True
    try:
        from sentence_transformers import SentenceTransformer
        _embedding_model = SentenceTransformer("sentence-transformers/all-MiniLM-L6-v2")
        logger.info("Sentence-transformers model loaded successfully.")
    except Exception as e:
        logger.error("Failed to load sentence-transformers model: %s. Retrieval will be unavailable.", type(e).__name__)
        _embedding_model = None
    return _embedding_model

def _get_qdrant_client():
    """
    Lazily initialises the Qdrant client based on environment variables.
    Returns None if qdrant-client is not installed.
    """
    try:
        from qdrant_client import QdrantClient
    except ImportError:
        logger.error("qdrant-client is not installed. Run: pip install qdrant-client")
        return None

    url = os.getenv("QDRANT_URL")
    api_key = os.getenv("QDRANT_API_KEY")

    if url:
        return QdrantClient(
            url=url,
            api_key=api_key,
            timeout=5.0,  # Fail fast — don't block SSE stream on Qdrant downtime
        )
    else:
        logger.warning(
            "QDRANT_URL not configured — using persistent local mode. "
        )
        _data_dir = str(Path(__file__).parent.parent / "qdrant_data")
        return QdrantClient(path=_data_dir)


_qdrant_client = None
COLLECTION_NAME = "caselaw_authorities"

# ── Core Service ───────────────────────────────────────────────────────────────

def retrieve_authorities(
    structured_case: StructuredCaseV2,
    k: int = 10,
    score_threshold: float = 0.60
) -> RetrievalResponse:
    """
    Queries the vector database for case law relevant to the structured case facts.

    CRITIC 2 (Jurisdiction Isolation): We apply a strict metadata filter BEFORE
    ranking to ensure we never retrieve cases from the wrong jurisdiction.

    CRITIC 3 (Retrieval Quality Guardrail): We enforce a score threshold, and
    if fewer than 3 qualifying cases are found, we flag insufficient grounding.

    Graceful degradation: if qdrant-client or sentence-transformers are not
    installed, returns an empty authority set with insufficient_grounding=True
    rather than crashing the server.
    """
    global _qdrant_client

    # ── Lazy-load dependencies ────────────────────────────────────────────────
    embedding_model = _get_embedding_model()
    if embedding_model is None:
        logger.warning("Embedding model unavailable — returning empty authorities.")
        return RetrievalResponse(
            case_id=structured_case.case_id,
            authorities=[],
            insufficient_grounding=True,
            message="Embedding model not available. The simulation will proceed with general legal principles only."
        )

    if _qdrant_client is None:
        _qdrant_client = _get_qdrant_client()

    if _qdrant_client is None:
        logger.warning("Qdrant client unavailable — returning empty authorities.")
        return RetrievalResponse(
            case_id=structured_case.case_id,
            authorities=[],
            insufficient_grounding=True,
            message="Retrieval service not available. The simulation will proceed with general legal principles only."
        )

    # ── Build query ───────────────────────────────────────────────────────────
    facts_str = " ".join(structured_case.disputed_facts)
    claim_type_label = structured_case.claim_type.value.replace("_", " ")
    query_text = f"Claim: {claim_type_label}. Facts: {facts_str}"

    logger.info(
        "Retrieval query | case_id=%s | claim_type=%s | jurisdiction=%s",
        structured_case.case_id,
        claim_type_label,
        structured_case.jurisdiction,
    )

    # ── Embed query ───────────────────────────────────────────────────────────
    query_vector = embedding_model.encode([query_text])[0].tolist()

    # ── Metadata filter (jurisdiction isolation) ──────────────────────────────
    try:
        from qdrant_client.models import Filter, FieldCondition, MatchValue
        jurisdiction_filter = Filter(
            must=[
                FieldCondition(
                    key="jurisdiction",
                    match=MatchValue(value=structured_case.jurisdiction)
                )
            ]
        )
    except ImportError:
        jurisdiction_filter = None

    # ── Search ────────────────────────────────────────────────────────────────
    try:
        if hasattr(_qdrant_client, "query_points"):
            query_res = _qdrant_client.query_points(
                collection_name=COLLECTION_NAME,
                query=query_vector,
                query_filter=jurisdiction_filter,
                limit=k,
                score_threshold=score_threshold
            )
            results = query_res.points
        else:
            results = _qdrant_client.search(
                collection_name=COLLECTION_NAME,
                query_vector=query_vector,
                query_filter=jurisdiction_filter,
                limit=k,
                score_threshold=score_threshold
            )
    except Exception as e:
        logger.error(
            "Qdrant search failed | case_id=%s | error_type=%s",
            structured_case.case_id,
            type(e).__name__,
        )
        return RetrievalResponse(
            case_id=structured_case.case_id,
            authorities=[],
            insufficient_grounding=True,
            message=(
                f"Retrieval service temporarily unavailable ({type(e).__name__}). "
                "The simulation will proceed with general legal principles only."
            )
        )

    # ── Format response ───────────────────────────────────────────────────────
    authorities: List[RetrievedAuthorityV2] = []
    for res in results:
        payload = res.payload or {}
        authorities.append(RetrievedAuthorityV2(
            case_name=payload.get("case_name", "Unknown Case"),
            citation=payload.get("citation", "Unknown Citation"),
            court=payload.get("court", "Unknown Court"),
            decision_date=payload.get("decision_date", "Unknown Date"),
            matched_chunk_text=payload.get("text", ""),
            similarity_score=res.score,
            jurisdiction=payload.get("jurisdiction", "Unknown Jurisdiction")
        ))

    insufficient_grounding = len(authorities) < 3
    message = f"Found {len(authorities)} relevant authorities in {structured_case.jurisdiction}."
    if insufficient_grounding:
        message += (
            f" WARNING: Insufficient grounding (less than 3 results met the "
            f"{score_threshold} threshold). The RAG simulation may be weak."
        )

    logger.info(
        "Retrieval complete | case_id=%s | found=%d | insufficient=%s",
        structured_case.case_id, len(authorities), insufficient_grounding
    )

    return RetrievalResponse(
        case_id=structured_case.case_id,
        authorities=authorities,
        insufficient_grounding=insufficient_grounding,
        message=message
    )
