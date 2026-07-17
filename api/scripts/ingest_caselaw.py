import os
import time
import uuid
import hashlib
from typing import List, Dict, Any
import logging

from dotenv import load_dotenv

# Try importing the required ML libraries
try:
    from datasets import load_dataset
    from sentence_transformers import SentenceTransformer
    from qdrant_client import QdrantClient
    from qdrant_client.models import (
        VectorParams,
        Distance,
        PointStruct,
    )
    from langchain_text_splitters import RecursiveCharacterTextSplitter
except ImportError:
    print("❌ Missing dependencies! Please run:")
    print("   pip install huggingface_hub datasets qdrant-client sentence-transformers langchain-text-splitters torch tqdm python-dotenv")
    exit(1)

# Set up simple logging
logging.basicConfig(level=logging.INFO, format='%(message)s')

# ──────────────────────────────────────────────────────────────────────────────
# CONFIGURATION — adjust these if needed
# ──────────────────────────────────────────────────────────────────────────────
COLLECTION_NAME    = "caselaw_authorities"
EMBEDDING_MODEL    = "all-MiniLM-L6-v2"
VECTOR_SIZE        = 384
MAX_CASES          = 50_000
BATCH_SIZE         = 64
EMBED_BATCH_SIZE   = 32
CHUNK_SIZE_CHARS   = 1800
CHUNK_OVERLAP_CHARS = 150
PROGRESS_INTERVAL  = 2_000

def main():
    print(f"==================================================")
    print(f"🏛️ Harvard CAP → Qdrant Ingestion Pipeline (Local)")
    print(f"==================================================\n")

    # Load environment variables from api/.env or root .env
    # We check a few possible paths depending on where the user runs the script from.
    env_paths = [".env", "api/.env", "../.env", "../../.env"]
    for path in env_paths:
        if os.path.exists(path):
            load_dotenv(path)
            print(f"✅ Loaded environment from {path}")
            break
    
    QDRANT_URL = os.environ.get('QDRANT_URL')
    QDRANT_API_KEY = os.environ.get('QDRANT_API_KEY')
    
    if not QDRANT_URL or not QDRANT_API_KEY:
        print("\n❌ Error: QDRANT_URL and QDRANT_API_KEY environment variables are missing.")
        print("Please set them in your .env file or export them in your terminal.")
        return

    print("\n1. Connecting to Qdrant Cloud...")
    qdrant_client = QdrantClient(url=QDRANT_URL, api_key=QDRANT_API_KEY, timeout=30)
    
    if qdrant_client.collection_exists(COLLECTION_NAME):
        info = qdrant_client.get_collection(COLLECTION_NAME)
        print(f"⚠️  Collection '{COLLECTION_NAME}' already exists ({info.points_count} vectors).")
        print("   Will upsert new data (existing IDs will be overwritten).")
    else:
        qdrant_client.create_collection(
            collection_name=COLLECTION_NAME,
            vectors_config=VectorParams(size=VECTOR_SIZE, distance=Distance.COSINE),
        )
        print(f"✅ Created collection '{COLLECTION_NAME}'")

    print(f"\n2. Loading embedding model '{EMBEDDING_MODEL}'...")
    print("   (This will use your Core i7 CPU. It might take a moment to load).")
    embedding_model = SentenceTransformer(EMBEDDING_MODEL)
    
    print("\n3. Loading Harvard CAP dataset stream...")
    dataset = load_dataset(
        "free-law/Caselaw_Access_Project",
        split="train",
        streaming=True,
        trust_remote_code=True,
    )
    
    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=CHUNK_SIZE_CHARS,
        chunk_overlap=CHUNK_OVERLAP_CHARS,
        separators=["\n\n", "\n", ". ", " ", ""],
    )

    # Simple heuristic claim-type tagger
    _CLAIM_KEYWORDS: Dict[str, List[str]] = {
        "tenancy":        ["landlord", "tenant", "lease", "eviction", "rent", "deposit", "premises"],
        "contract":       ["contract", "breach", "agreement", "consideration", "performance", "damages"],
        "small_claims":   ["small claims", "minor civil", "magistrate"],
        "family":         ["divorce", "custody", "alimony", "child support", "marital", "spouse"],
        "employment":     ["wrongful termination", "discrimination", "wage", "overtime", "harassment"],
        "personal_injury":["negligence", "tort", "injury", "liability", "damages", "accident"],
        "property":       ["property", "easement", "title", "deed", "trespass"],
    }

    def _detect_claim_type(text_lower: str) -> str:
        best, best_score = "other", 0
        for claim, keywords in _CLAIM_KEYWORDS.items():
            score = sum(1 for kw in keywords if kw in text_lower)
            if score > best_score:
                best, best_score = claim, score
        return best

    def _stable_id(seed: str) -> str:
        return str(uuid.UUID(hashlib.md5(seed.encode()).hexdigest()))

    def extract_chunks(case_data: Dict[str, Any]) -> List[Dict[str, Any]]:
        chunks: List[Dict[str, Any]] = []
        case_name     = case_data.get("name", "") or case_data.get("name_abbreviation", "Unknown Case")
        citations     = case_data.get("citations", []) or []
        citation      = citations[0].get("cite", "No Citation") if citations else "No Citation"
        court         = (case_data.get("court") or {}).get("name", "Unknown Court")
        decision_date = str(case_data.get("decision_date", "Unknown Date"))

        jur_obj    = case_data.get("jurisdiction") or {}
        jurisdiction = jur_obj.get("name_long") or jur_obj.get("name") or "Unknown"

        opinion_texts: List[str] = []
        casebody = case_data.get("casebody") or {}
        data     = casebody.get("data") or {}
        opinions = data.get("opinions") or []
        for op in opinions:
            text = (op.get("text") or "").strip()
            if text:
                opinion_texts.append(text)

        if not opinion_texts:
            flat = (case_data.get("opinion") or "").strip()
            if flat:
                opinion_texts.append(flat)

        if not opinion_texts:
            return chunks

        full_text = "\n\n".join(opinion_texts)
        claim_type = _detect_claim_type(full_text.lower())

        split_texts = text_splitter.split_text(full_text)
        for i, chunk_text in enumerate(split_texts):
            chunk_text = chunk_text.strip()
            if len(chunk_text) < 50:
                continue

            point_id = _stable_id(f"{citation}::{i}")
            chunks.append({
                "id": point_id,
                "text": chunk_text,
                "metadata": {
                    "case_name":     case_name,
                    "citation":      citation,
                    "court":         court,
                    "decision_date": decision_date,
                    "jurisdiction":  jurisdiction,
                    "claim_type":    claim_type,
                    "chunk_index":   i,
                },
            })
        return chunks

    case_count       = 0
    chunk_count      = 0
    skipped_count    = 0
    error_count      = 0
    points_batch: List[PointStruct] = []
    
    start_time = time.monotonic()
    print(f"\n🚀 Starting ingestion: target {MAX_CASES:,} cases")
    print("-" * 50)
    
    for case in dataset:
        if case_count >= MAX_CASES:
            break
        try:
            chunks = extract_chunks(case)
            if not chunks:
                skipped_count += 1
                continue

            texts      = [c["text"] for c in chunks]
            embeddings = embedding_model.encode(
                texts,
                batch_size=EMBED_BATCH_SIZE,
                show_progress_bar=False,
                normalize_embeddings=True,
            )

            for chunk, emb in zip(chunks, embeddings):
                points_batch.append(
                    PointStruct(
                        id=chunk["id"],
                        vector=emb.tolist(),
                        payload={
                            "text": chunk["text"],
                            **chunk["metadata"],
                        },
                    )
                )

            if len(points_batch) >= BATCH_SIZE:
                qdrant_client.upsert(
                    collection_name=COLLECTION_NAME,
                    points=points_batch,
                    wait=True,
                )
                chunk_count  += len(points_batch)
                points_batch  = []

            case_count += 1

            if case_count % PROGRESS_INTERVAL == 0:
                elapsed   = time.monotonic() - start_time
                rate      = case_count / elapsed
                remaining = (MAX_CASES - case_count) / rate if rate > 0 else 0
                print(f"✅ {case_count:>6,} cases | {chunk_count:>7,} vectors | {rate:.1f} cases/s | ~{remaining/60:.0f} min remaining")

        except Exception as exc:
            error_count += 1
            if error_count <= 5:
                print(f"⚠️ Error on case #{case_count + 1}: {type(exc).__name__}: {exc}")
            continue

    if points_batch:
        qdrant_client.upsert(collection_name=COLLECTION_NAME, points=points_batch, wait=True)
        chunk_count += len(points_batch)

    elapsed_total = time.monotonic() - start_time
    print("\n" + "=" * 50)
    print("🎉 INGESTION COMPLETE")
    print("=" * 50)
    print(f"  Cases processed :  {case_count:,}")
    print(f"  Vectors uploaded:  {chunk_count:,}")
    print(f"  Cases skipped   :  {skipped_count:,} (no usable text)")
    print(f"  Total time      :  {elapsed_total/60:.1f} minutes")
    print(f"  Avg rate        :  {case_count/elapsed_total:.2f} cases/sec")
    print("=" * 50)

if __name__ == "__main__":
    main()
