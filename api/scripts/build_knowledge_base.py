"""
build_knowledge_base.py
Master ingestion orchestrator. Combines California statutes + case law
into a single persistent Qdrant collection with 500+ real entries.

Usage (from case_intake_app directory):
    # With CAP API key (recommended for full corpus):
    CAP_API_KEY=<your_key> api\venv\Scripts\python api\scripts\build_knowledge_base.py

    # Without API key (uses curated 60-case fallback + 50 statutes):
    api\venv\Scripts\python api\scripts\build_knowledge_base.py

Register for a free CAP API key at: https://case.law
"""
import sys
import os
import uuid
import logging
from pathlib import Path

# Make sure the package root is on the path
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from qdrant_client import QdrantClient
from qdrant_client.models import Distance, VectorParams, PointStruct
from sentence_transformers import SentenceTransformer

from api.scripts.ingest_ca_statutes import load_california_statutes, FALLBACK_STATUTES
from api.scripts.ingest_cap_cases import fetch_cap_cases

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(message)s",
)
logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------
COLLECTION_NAME = "caselaw_authorities"
EMBEDDING_MODEL = "sentence-transformers/all-MiniLM-L6-v2"
_DATA_DIR = str(Path(__file__).parent.parent / "qdrant_data")
CAP_API_KEY = os.environ.get("CAP_API_KEY", "")
SCRAPE_STATUTES = os.environ.get("SCRAPE_STATUTES", "0") == "1"

# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
def main():
    logger.info("=== Legal Knowledge Base Ingestion ===")
    logger.info("Data dir: %s", _DATA_DIR)

    # 1. Load embedding model
    logger.info("Loading embedding model: %s", EMBEDDING_MODEL)
    model = SentenceTransformer(EMBEDDING_MODEL)

    # 2. Connect to Qdrant
    logger.info("Connecting to Qdrant...")
    client = QdrantClient(path=_DATA_DIR)

    # 3. Recreate collection
    if client.collection_exists(COLLECTION_NAME):
        logger.info("Dropping existing collection: %s", COLLECTION_NAME)
        client.delete_collection(COLLECTION_NAME)

    client.create_collection(
        collection_name=COLLECTION_NAME,
        vectors_config=VectorParams(size=384, distance=Distance.COSINE),
    )
    logger.info("Created fresh collection: %s", COLLECTION_NAME)

    # 4. Gather all entries
    all_entries = []

    # ── Statutes ──────────────────────────────────────────────────────────────
    if SCRAPE_STATUTES:
        logger.info("Scraping California statutes from leginfo.legislature.ca.gov ...")
        statute_count = 0
        for entry in load_california_statutes(delay=0.5):
            all_entries.append(entry)
            statute_count += 1
            logger.info("  Statute [%d]: %s", statute_count, entry["citation"])
        logger.info("Statutes fetched from web: %d", statute_count)
    else:
        logger.info("Using curated fallback statutes (%d entries)", len(FALLBACK_STATUTES))
        all_entries.extend(FALLBACK_STATUTES)

    # ── Case law ──────────────────────────────────────────────────────────────
    logger.info("Loading California case law (CAP API key present: %s)...", bool(CAP_API_KEY))
    case_count = 0
    for entry in fetch_cap_cases(api_key=CAP_API_KEY or None, limit=400):
        all_entries.append(entry)
        case_count += 1
        if case_count % 25 == 0:
            logger.info("  Cases loaded: %d", case_count)

    logger.info("Total case law chunks loaded: %d", case_count)
    logger.info("TOTAL ENTRIES TO INGEST: %d", len(all_entries))

    if len(all_entries) < 50:
        logger.error("Insufficient entries — ingestion aborted. Check sources.")
        sys.exit(1)

    # 5. Embed & upsert in batches
    BATCH = 50
    points = []
    for i, entry in enumerate(all_entries):
        text = entry.get("text", "")
        if not text.strip():
            continue

        vector = model.encode(text).tolist()
        point_id = str(uuid.uuid4())

        payload = {
            "text": text,
            "case_name": entry.get("case_name", ""),
            "citation": entry.get("citation", ""),
            "court": entry.get("court", ""),
            "decision_date": entry.get("decision_date", ""),
            "jurisdiction": entry.get("jurisdiction", "California"),
            "source_type": entry.get("source_type", "case"),
            "chunk_index": entry.get("chunk_index", 0),
        }
        points.append(PointStruct(id=point_id, vector=vector, payload=payload))

        # Upsert batch
        if len(points) >= BATCH:
            client.upsert(collection_name=COLLECTION_NAME, points=points)
            logger.info("  Upserted batch up to entry %d / %d", i + 1, len(all_entries))
            points = []

    # Final batch
    if points:
        client.upsert(collection_name=COLLECTION_NAME, points=points)
        logger.info("  Upserted final batch of %d points", len(points))

    # 6. Verify
    count = client.count(collection_name=COLLECTION_NAME)
    logger.info("=== INGESTION COMPLETE ===")
    logger.info("Total points in Qdrant: %d", count.count)
    logger.info("Jurisdiction: California (landlord-tenant / small-claims)")

    if count.count >= 500:
        logger.info("TARGET MET: 500+ entries in knowledge base.")
    elif count.count >= 100:
        logger.info("PARTIAL: %d entries present. Consider adding CAP API key for full corpus.", count.count)
    else:
        logger.warning("LOW COVERAGE: only %d entries. Add more sources.", count.count)

    return count.count


if __name__ == "__main__":
    main()
