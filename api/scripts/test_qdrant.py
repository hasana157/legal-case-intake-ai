import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from qdrant_client import QdrantClient
from qdrant_client.models import Filter, FieldCondition, MatchValue
from sentence_transformers import SentenceTransformer

_data_dir = str(Path(__file__).parent.parent / "qdrant_data")
client = QdrantClient(path=_data_dir)

print(f"Collections: {client.get_collections()}")
print(f"Count: {client.count('caselaw_authorities')}")

model = SentenceTransformer("sentence-transformers/all-MiniLM-L6-v2")
vector = model.encode(["tenant wants security deposit back"])[0].tolist()

jurisdiction_filter = Filter(
    must=[FieldCondition(key="jurisdiction", match=MatchValue(value="California"))]
)

results_obj = client.query_points(
    collection_name="caselaw_authorities",
    query=vector,
    query_filter=jurisdiction_filter,
    limit=5
)
results = results_obj.points

print(f"Results: {len(results)}")
for r in results:
    print(r.payload.get("jurisdiction"), r.score, r.payload.get("citation"))
