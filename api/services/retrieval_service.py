# =============================================================================
# api/services/retrieval_service.py
# Milestone 3 — Jurisdiction-Grounded Retrieval Layer
# Uses Qdrant Cloud and sentence-transformers to retrieve relevant case law.
# =============================================================================

import os
import logging
from typing import List, Tuple

from qdrant_client import QdrantClient
from qdrant_client.models import Filter, FieldCondition, MatchValue
from sentence_transformers import SentenceTransformer

from api.models.structured_case import StructuredCaseV2
from api.models.retrieval import RetrievedAuthorityV2, RetrievalResponse

logger = logging.getLogger("opposing_simulator.retrieval")

# ── Initialization ─────────────────────────────────────────────────────────────

# Load the embedding model (runs locally on CPU).
# Caching the model in memory so it's not reloaded on every request.
try:
    _embedding_model = SentenceTransformer("sentence-transformers/all-MiniLM-L6-v2")
except Exception as e:
    logger.error("Failed to load sentence-transformers model. Ensure PyTorch and sentence-transformers are installed.")
    _embedding_model = None

def get_qdrant_client() -> QdrantClient:
    """
    Initializes the Qdrant client based on environment variables.
    - If QDRANT_URL is set: connect to Qdrant Cloud.
    - If not set: in-memory mode (no real data available).
    A 5-second timeout is enforced to prevent blocking the SSE stream.
    """
    url = os.getenv("QDRANT_URL")
    api_key = os.getenv("QDRANT_API_KEY")
    
    if url:
        return QdrantClient(
            url=url,
            api_key=api_key,
            timeout=5.0,  # D1: Fail fast — don't block SSE stream on Qdrant downtime
        )
    else:
        logger.warning(
            "QDRANT_URL not configured — using in-memory mode. "
            "No ingested case law will be found."
        )
        return QdrantClient(location=":memory:")

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
    """
    global _qdrant_client
    if _qdrant_client is None:
        _qdrant_client = get_qdrant_client()
        
    if _embedding_model is None:
        raise RuntimeError("Embedding model is not loaded.")

    # 1. Construct the query string
    # We do not just embed the raw narrative. We focus on the extracted legal facts.
    facts_str = " ".join(structured_case.disputed_facts)
    claim_type_label = structured_case.claim_type.value.replace("_", " ")
    
    query_text = f"Claim: {claim_type_label}. Facts: {facts_str}"
    # CRITIC 3: Log only case_id and metadata — not the query text (derived from disputed_facts)
    logger.info(
        "Retrieval query | case_id=%s | claim_type=%s | jurisdiction=%s",
        structured_case.case_id,
        claim_type_label,
        structured_case.jurisdiction,
    )

    # 2. Embed the query
    query_vector = _embedding_model.encode([query_text])[0].tolist()

    # 3. Metadata Filtering (CRITIC 2: Strict Jurisdiction Isolation)
    jurisdiction_filter = Filter(
        must=[
            FieldCondition(
                key="jurisdiction",
                match=MatchValue(value=structured_case.jurisdiction)
            )
        ]
    )

    # 4. Search
    try:
        results = _qdrant_client.search(
            collection_name=COLLECTION_NAME,
            query_vector=query_vector,
            query_filter=jurisdiction_filter,
            limit=k,
            score_threshold=score_threshold
        )
    except Exception as e:
        # D1: Qdrant downtime or collection not found — log metadata only, never case text
        # CRITIC 2: Caller (main.py) surfaces a calm message to the user
        logger.error(
            "Qdrant search failed | case_id=%s | error_type=%s",
            structured_case.case_id,
            type(e).__name__,
        )
        # Return a safe graceful response rather than crashing
        return RetrievalResponse(
            case_id=structured_case.case_id,
            authorities=[],
            insufficient_grounding=True,
            message=(
                f"Retrieval service temporarily unavailable ({type(e).__name__}). "
                "The simulation will proceed with general legal principles only."
            )
        )

    # 5. Format response
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

    # CRITIC 3: Insufficient Grounding flag
    insufficient_grounding = len(authorities) < 3
    
    message = f"Found {len(authorities)} relevant authorities in {structured_case.jurisdiction}."
    if insufficient_grounding:
        message += f" WARNING: Insufficient grounding (less than 3 results met the {score_threshold} threshold). The RAG simulation may be weak."

    logger.info(f"Retrieval complete for {structured_case.case_id} | Found: {len(authorities)} | Insufficient: {insufficient_grounding}")

    return RetrievalResponse(
        case_id=structured_case.case_id,
        authorities=authorities,
        insufficient_grounding=insufficient_grounding,
        message=message
    )
