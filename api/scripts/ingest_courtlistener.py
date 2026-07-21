import hashlib
import os
import re
import time
import uuid
from html import unescape
from typing import Any

import requests
from dotenv import load_dotenv
from langchain_text_splitters import RecursiveCharacterTextSplitter
from qdrant_client import QdrantClient
from qdrant_client.models import Distance, PointStruct, VectorParams
from sentence_transformers import SentenceTransformer


COLLECTION_NAME = "caselaw_authorities"
EMBEDDING_MODEL = "all-MiniLM-L6-v2"
VECTOR_SIZE = 384

API_BASE = "https://www.courtlistener.com/api/rest/v4"
DEFAULT_COURTS = "scotus"
DEFAULT_JURISDICTION = "Federal"
DEFAULT_MAX_OPINIONS = 500
DEFAULT_BATCH_SIZE = 16
DEFAULT_EMBED_BATCH_SIZE = 32
DEFAULT_CHUNK_SIZE_CHARS = 1800
DEFAULT_CHUNK_OVERLAP_CHARS = 150


def _load_env() -> None:
    for path in [".env", "api/.env", "../.env", "../../.env"]:
        if os.path.exists(path):
            load_dotenv(path)
            print(f"Loaded environment from {path}")
            return


def _required_env(name: str) -> str:
    value = os.environ.get(name, "").strip()
    if not value:
        raise RuntimeError(f"{name} is missing from .env")
    return value


def _env_int(name: str, default: int) -> int:
    raw = os.environ.get(name, "").strip()
    if not raw:
        return default
    return int(raw.replace(",", ""))


def _stable_id(seed: str) -> str:
    return str(uuid.UUID(hashlib.md5(seed.encode("utf-8")).hexdigest()))


def _clean_html(value: str) -> str:
    text = re.sub(r"<br\s*/?>", "\n", value, flags=re.IGNORECASE)
    text = re.sub(r"</p\s*>", "\n\n", text, flags=re.IGNORECASE)
    text = re.sub(r"<[^>]+>", " ", text)
    text = unescape(text)
    return re.sub(r"\s+", " ", text).strip()


def _opinion_text(opinion: dict[str, Any]) -> str:
    for key in ["html_with_citations", "plain_text", "html", "xml_harvard"]:
        value = opinion.get(key)
        if isinstance(value, str) and value.strip():
            return _clean_html(value)
    return ""


def _citation_from_cluster(cluster: dict[str, Any]) -> str:
    citations = cluster.get("citations") or []
    if citations and isinstance(citations, list):
        first = citations[0]
        if isinstance(first, dict):
            return str(first.get("cite") or first.get("citation") or "No Citation")
        return str(first)
    return "No Citation"


def _cluster_url(opinion: dict[str, Any]) -> str:
    cluster = opinion.get("cluster")
    if isinstance(cluster, str):
        return cluster
    if isinstance(cluster, dict):
        return cluster.get("resource_uri") or ""
    return ""


def _get_json(
    session: requests.Session,
    url: str,
    params: dict[str, Any] | None = None,
    max_retries: int = 4,
) -> dict[str, Any]:
    for attempt in range(1, max_retries + 1):
        try:
            response = session.get(url, params=params, timeout=90)
            if response.status_code == 401:
                raise RuntimeError("CourtListener token was rejected. Check COURTLISTENER_API_TOKEN.")
            if response.status_code == 403:
                raise RuntimeError("CourtListener returned 403 Forbidden. Check token permissions or API limits.")
            if response.status_code == 400:
                raise RuntimeError(
                    "CourtListener rejected the query. Response body:\n"
                    f"{response.text[:1200]}"
                )
            if response.status_code in {429, 500, 502, 503, 504} and attempt < max_retries:
                wait_seconds = attempt * 5
                print(
                    f"CourtListener returned {response.status_code}; "
                    f"retrying in {wait_seconds}s..."
                )
                time.sleep(wait_seconds)
                continue
            response.raise_for_status()
            return response.json()
        except requests.exceptions.Timeout:
            if attempt == max_retries:
                raise
            wait_seconds = attempt * 5
            print(f"CourtListener timed out; retrying in {wait_seconds}s...")
            time.sleep(wait_seconds)

    raise RuntimeError("CourtListener request failed after retries.")


def _upsert_with_retry(
    qdrant_client: QdrantClient,
    points: list[PointStruct],
    batch_size: int,
    max_retries: int = 3,
) -> int:
    uploaded = 0
    for start in range(0, len(points), batch_size):
        batch = points[start:start + batch_size]
        for attempt in range(1, max_retries + 1):
            try:
                qdrant_client.upsert(
                    collection_name=COLLECTION_NAME,
                    points=batch,
                    wait=True,
                )
                uploaded += len(batch)
                break
            except Exception as exc:
                if attempt == max_retries:
                    raise
                wait_seconds = attempt * 3
                print(
                    f"Qdrant upload timed out/failed for {len(batch)} vectors "
                    f"({type(exc).__name__}); retrying in {wait_seconds}s..."
                )
                time.sleep(wait_seconds)
    return uploaded


def main() -> None:
    print("=" * 50)
    print("CourtListener -> Qdrant Ingestion Pipeline")
    print("=" * 50)

    _load_env()

    qdrant_url = _required_env("QDRANT_URL")
    qdrant_api_key = _required_env("QDRANT_API_KEY")
    courtlistener_token = _required_env("COURTLISTENER_API_TOKEN")

    courts = [
        court.strip()
        for court in os.environ.get("COURTLISTENER_COURTS", DEFAULT_COURTS).split(",")
        if court.strip()
    ]
    jurisdiction = os.environ.get("COURTLISTENER_JURISDICTION", DEFAULT_JURISDICTION).strip()
    query = os.environ.get("COURTLISTENER_QUERY", "").strip()
    max_opinions = _env_int("COURTLISTENER_MAX_OPINIONS", DEFAULT_MAX_OPINIONS)
    batch_size = _env_int("COURTLISTENER_BATCH_SIZE", DEFAULT_BATCH_SIZE)
    embed_batch_size = _env_int("COURTLISTENER_EMBED_BATCH_SIZE", DEFAULT_EMBED_BATCH_SIZE)

    print(f"Courts: {', '.join(courts)}")
    print(f"Jurisdiction tag: {jurisdiction}")
    print(f"Max opinions: {max_opinions:,}")
    if query:
        print(f"Query filter: {query}")

    print("\n1. Connecting to Qdrant Cloud...")
    qdrant_client = QdrantClient(url=qdrant_url, api_key=qdrant_api_key, timeout=120)
    if qdrant_client.collection_exists(COLLECTION_NAME):
        info = qdrant_client.get_collection(COLLECTION_NAME)
        print(f"Collection '{COLLECTION_NAME}' exists ({info.points_count} vectors).")
    else:
        qdrant_client.create_collection(
            collection_name=COLLECTION_NAME,
            vectors_config=VectorParams(size=VECTOR_SIZE, distance=Distance.COSINE),
        )
        print(f"Created collection '{COLLECTION_NAME}'.")

    print(f"\n2. Loading embedding model '{EMBEDDING_MODEL}'...")
    embedding_model = SentenceTransformer(EMBEDDING_MODEL)
    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=DEFAULT_CHUNK_SIZE_CHARS,
        chunk_overlap=DEFAULT_CHUNK_OVERLAP_CHARS,
        separators=["\n\n", "\n", ". ", " ", ""],
    )

    session = requests.Session()
    session.headers.update(
        {
            "Authorization": f"Token {courtlistener_token}",
            "User-Agent": "legal-case-intake-ai/1.0",
        }
    )

    cluster_cache: dict[str, dict[str, Any]] = {}
    points_batch: list[PointStruct] = []
    opinion_count = 0
    vector_count = 0
    skipped_count = 0
    start = time.monotonic()

    print("\n3. Fetching CourtListener opinions...")
    for court in courts:
        next_url = f"{API_BASE}/opinions/"
        params: dict[str, Any] | None = {
            "cluster__docket__court": court,
        }
        if query:
            params["q"] = query

        while next_url and opinion_count < max_opinions:
            page = _get_json(session, next_url, params=params)
            params = None

            for opinion in page.get("results", []):
                if opinion_count >= max_opinions:
                    break

                text = _opinion_text(opinion)
                if len(text) < 300:
                    skipped_count += 1
                    continue

                cluster_url = _cluster_url(opinion)
                cluster = {}
                if cluster_url:
                    if cluster_url not in cluster_cache:
                        cluster_cache[cluster_url] = _get_json(session, cluster_url)
                        time.sleep(0.05)
                    cluster = cluster_cache[cluster_url]

                case_name = (
                    cluster.get("case_name")
                    or cluster.get("case_name_full")
                    or opinion.get("case_name")
                    or f"CourtListener Opinion {opinion.get('id')}"
                )
                citation = _citation_from_cluster(cluster)
                court_name = court
                decision_date = (
                    cluster.get("date_filed")
                    or opinion.get("date_created")
                    or opinion.get("date_modified")
                    or "Unknown Date"
                )

                chunks = [
                    chunk.strip()
                    for chunk in text_splitter.split_text(text)
                    if len(chunk.strip()) >= 80
                ]
                if not chunks:
                    skipped_count += 1
                    continue

                embeddings = embedding_model.encode(
                    chunks,
                    batch_size=embed_batch_size,
                    show_progress_bar=False,
                    normalize_embeddings=True,
                )
                for i, (chunk, embedding) in enumerate(zip(chunks, embeddings)):
                    point_id = _stable_id(f"courtlistener::{opinion.get('id')}::{i}")
                    points_batch.append(
                        PointStruct(
                            id=point_id,
                            vector=embedding.tolist(),
                            payload={
                                "text": chunk,
                                "case_name": case_name,
                                "citation": citation,
                                "court": court_name,
                                "decision_date": str(decision_date),
                                "jurisdiction": jurisdiction,
                                "source": "CourtListener",
                                "opinion_id": opinion.get("id"),
                                "cluster_url": cluster_url,
                            },
                        )
                    )

                opinion_count += 1

                if len(points_batch) >= batch_size:
                    vector_count += _upsert_with_retry(
                        qdrant_client=qdrant_client,
                        points=points_batch,
                        batch_size=batch_size,
                    )
                    points_batch = []

                if opinion_count % 25 == 0:
                    elapsed = max(time.monotonic() - start, 1)
                    print(
                        f"{opinion_count:>5,} opinions | "
                        f"{vector_count + len(points_batch):>7,} vectors | "
                        f"{opinion_count / elapsed:.2f} opinions/s"
                    )

                time.sleep(0.05)

            next_url = page.get("next")

    if points_batch:
        vector_count += _upsert_with_retry(
            qdrant_client=qdrant_client,
            points=points_batch,
            batch_size=batch_size,
        )

    elapsed = time.monotonic() - start
    print("\n" + "=" * 50)
    print("INGESTION COMPLETE")
    print("=" * 50)
    print(f"Opinions processed: {opinion_count:,}")
    print(f"Vectors uploaded:   {vector_count:,}")
    print(f"Skipped opinions:   {skipped_count:,}")
    print(f"Total time:         {elapsed / 60:.1f} minutes")
    print("=" * 50)


if __name__ == "__main__":
    main()
