"""
seed_qdrant.py — Seeds local Qdrant DB with mock legal case authorities.
Run once to populate the caselaw_authorities collection before starting the API.
Usage: api\venv\Scripts\python api\seed_qdrant.py (from case_intake_app dir)
"""
import os
from pathlib import Path
from qdrant_client import QdrantClient
from qdrant_client.models import Distance, VectorParams, PointStruct
from sentence_transformers import SentenceTransformer

# Initialize model and client
print("Loading embedding model (all-MiniLM-L6-v2)...")
model = SentenceTransformer("sentence-transformers/all-MiniLM-L6-v2")
print("Connecting to local Qdrant...")
_data_dir = str(Path(__file__).parent / "qdrant_data")
client = QdrantClient(path=_data_dir)

collection_name = "caselaw_authorities"

# Recreate collection
print(f"Recreating collection: {collection_name}...")
if client.collection_exists(collection_name):
    client.delete_collection(collection_name)

client.create_collection(
    collection_name=collection_name,
    vectors_config=VectorParams(size=384, distance=Distance.COSINE),
)

# ──────────────────────────────────────────────────────────────────────────────
# Mock case law data — multi-jurisdiction, multi-claim
# ──────────────────────────────────────────────────────────────────────────────
cases = [
    # ── California: Contract / Tenancy ────────────────────────────────────────
    {
        "id": 1,
        "text": (
            "To prevail on a breach of contract claim, plaintiff must establish: "
            "(1) the existence of a contract, (2) plaintiff's performance or excuse "
            "for non-performance, (3) defendant's breach, and (4) resulting damages."
        ),
        "case_name": "Carma Developers Inc. v. Marathon Dev. California, Inc.",
        "citation": "2 Cal.4th 342 (1992)",
        "court": "California Supreme Court",
        "decision_date": "1992-01-01",
        "jurisdiction": "California",
    },
    {
        "id": 2,
        "text": (
            "Damages for breach of contract must be clearly ascertainable in both "
            "their nature and origin. Speculative or uncertain damages are not recoverable. "
            "The standard requires reasonable certainty, not absolute certainty."
        ),
        "case_name": "Acoustics, Inc. v. Trepte Construction Co.",
        "citation": "14 Cal.App.3d 887 (1971)",
        "court": "California Court of Appeal",
        "decision_date": "1971-01-01",
        "jurisdiction": "California",
    },
    {
        "id": 3,
        "text": (
            "A landlord must return a security deposit within 21 days after the "
            "tenant vacates the rental premises. Failure to do so, or to provide an "
            "itemized statement of deductions, may subject the landlord to statutory "
            "penalties of up to twice the deposit amount under Civil Code 1950.5."
        ),
        "case_name": "Granberry v. Islay Investments",
        "citation": "9 Cal.4th 738 (1995)",
        "court": "California Supreme Court",
        "decision_date": "1995-01-01",
        "jurisdiction": "California",
    },
    {
        "id": 4,
        "text": (
            "Where a tenant abandons the leased premises before the end of the lease term, "
            "the landlord has a duty to mitigate damages by making reasonable efforts to "
            "re-let the property. Failure to mitigate reduces any damages award."
        ),
        "case_name": "Civ. Code § 1951.2 — Abandonment and Mitigation of Damages",
        "citation": "Cal. Civ. Code § 1951.2 (2023)",
        "court": "California Legislature",
        "decision_date": "2023-01-01",
        "jurisdiction": "California",
    },
    {
        "id": 5,
        "text": (
            "An unlawful detainer action is the exclusive remedy for a landlord seeking "
            "to recover possession of a residential dwelling. The landlord must serve "
            "a proper 3-day notice to pay or quit before commencing eviction proceedings."
        ),
        "case_name": "Kwok v. Bergren",
        "citation": "130 Cal.App.3d 596 (1982)",
        "court": "California Court of Appeal",
        "decision_date": "1982-01-01",
        "jurisdiction": "California",
    },
    # ── New York: Contract / Small Claims / Tenancy ───────────────────────────
    {
        "id": 6,
        "text": (
            "In New York, a breach of contract claim requires: (1) formation of a contract "
            "between the parties, (2) plaintiff's performance, (3) defendant's failure to perform, "
            "and (4) resulting damages. The statute of limitations is six years from breach."
        ),
        "case_name": "Palmetto Partners, L.P. v. AJW Qualified Partners, LLC",
        "citation": "83 A.D.3d 804 (N.Y. App. Div. 2011)",
        "court": "New York Appellate Division",
        "decision_date": "2011-01-01",
        "jurisdiction": "New York",
    },
    {
        "id": 7,
        "text": (
            "A landlord in New York must return a security deposit within 14 days after "
            "the tenant vacates. The landlord must provide an itemized statement of any "
            "deductions. Failure to comply forfeits the right to retain any portion "
            "of the deposit."
        ),
        "case_name": "N.Y. Gen. Oblig. Law § 7-108 — Security Deposit Return",
        "citation": "N.Y. Gen. Oblig. Law § 7-108 (2022)",
        "court": "New York Legislature",
        "decision_date": "2022-01-01",
        "jurisdiction": "New York",
    },
    # ── Texas: Tenancy & Landlord-Tenant (Mold, Repairs, Leases) ──────────────
    {
        "id": 8,
        "text": (
            "Under Texas Property Code § 92.056, a landlord has a statutory duty to repair "
            "or remedy any condition that materially affects the physical health or safety "
            "of an ordinary tenant, including toxic mold, active water leaks, sewage backup, "
            "or structural damage, provided the tenant sent written notice by certified mail."
        ),
        "case_name": "Tex. Prop. Code § 92.056 — Landlord Duty to Repair or Remedy",
        "citation": "Tex. Prop. Code Ann. § 92.056 (2023)",
        "court": "Texas Legislature",
        "decision_date": "2023-01-01",
        "jurisdiction": "Texas",
    },
    {
        "id": 9,
        "text": (
            "If a landlord fails to remedy a condition affecting physical health and safety "
            "after receiving written notice under Texas Property Code § 92.056, the tenant "
            "may terminate the lease, deduct repair costs, or obtain judicial remedies including "
            "statutory damages of one month's rent plus $500, actual damages, and attorney fees."
        ),
        "case_name": "Philadelphia Indemnity Ins. Co. v. White",
        "citation": "490 S.W.3d 468 (Tex. 2016)",
        "court": "Texas Supreme Court",
        "decision_date": "2016-01-01",
        "jurisdiction": "Texas",
    },
    {
        "id": 10,
        "text": (
            "Under Texas Property Code § 92.103, a landlord must refund the security deposit "
            "or provide an itemized list of deductions within 30 days after the tenant moves out. "
            "Failure to do so in bad faith makes the landlord liable for 3x deposit amount plus $100."
        ),
        "case_name": "Tex. Prop. Code § 92.103 — Return of Security Deposit",
        "citation": "Tex. Prop. Code Ann. § 92.103 (2023)",
        "court": "Texas Legislature",
        "decision_date": "2023-01-01",
        "jurisdiction": "Texas",
    },
    {
        "id": 11,
        "text": (
            "Texas follows the at-will employment doctrine, meaning either party may "
            "terminate employment at any time for any legal reason, absent a written contract."
        ),
        "case_name": "Sabine Pilot Service, Inc. v. Hauck",
        "citation": "687 S.W.2d 733 (Tex. 1985)",
        "court": "Texas Supreme Court",
        "decision_date": "1985-01-01",
        "jurisdiction": "Texas",
    },
    # ── Illinois: Small Claims / Property ────────────────────────────────────
    {
        "id": 12,
        "text": (
            "Illinois small claims court has jurisdiction over money damages not "
            "exceeding $10,000. The plaintiff bears the burden of proving the claim "
            "by a preponderance of the evidence."
        ),
        "case_name": "735 ILCS 5/2-209 — Illinois Small Claims Jurisdiction",
        "citation": "735 ILCS 5/2-209 (2023)",
        "court": "Illinois Legislature",
        "decision_date": "2023-01-01",
        "jurisdiction": "Illinois",
    },
]

print(f"Embedding and indexing {len(cases)} cases...")
points = []
for case in cases:
    vector = model.encode(case["text"]).tolist()
    payload = {
        "text": case["text"],
        "case_name": case["case_name"],
        "citation": case["citation"],
        "court": case["court"],
        "decision_date": case["decision_date"],
        "jurisdiction": case["jurisdiction"],
    }
    points.append(PointStruct(id=case["id"], vector=vector, payload=payload))

client.upsert(collection_name=collection_name, points=points)

print(f"Successfully indexed {len(cases)} cases into: {_data_dir}")
print("Jurisdictions covered: California, New York, Texas, Illinois")
