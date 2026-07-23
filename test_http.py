import sys
import os
sys.path.insert(0, os.path.abspath("api"))

from fastapi.testclient import TestClient
from api.main import app
import traceback

client = TestClient(app)

payload = {
    "parties": [
        {"name": "hasana", "role": "plaintiff"},
        {"name": "ABC Electronics", "role": "defendant"}
    ],
    "claim_type": "contract",
    "jurisdiction": "Federal",
    "key_dates": [
        {"label": "Contract signed", "date": "2026-01-15"},
        {"label": "payment due", "date": "2026-03-01"},
        {"label": "breach of contract", "date": "2026-03-15"}
    ],
    "narrative": "On January 15, 2026, I entered into a written agreement with ABC Electronics for the purchase and installation of computer equipment. Under the agreement, I paid the required amount in advance, and the defendant agreed to complete delivery and installation by March 1, 2026.\n\nThe defendant failed to deliver the equipment by the agreed deadline and did not provide a valid explanation. Despite multiple emails and phone calls requesting performance or a refund, the defendant neither fulfilled the contract nor returned my advance payment.",
    "evidence": []
}

try:
    response = client.post("/api/intake", json=payload)
    print("STATUS:", response.status_code)
    print("JSON:", response.json())
except Exception as e:
    print("EXCEPTION!")
    traceback.print_exc()
