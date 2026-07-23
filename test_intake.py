import sys
import os
sys.path.insert(0, os.path.abspath("api"))

import asyncio
from api.models.structured_case import RawIntake, Party, PartyRole, ClaimTypeEnum, KeyDate
from api.services.case_parser import extract_case_facts

raw = RawIntake(
    parties=[Party(name="hasana", role=PartyRole.plaintiff), Party(name="ABC Electronics", role=PartyRole.defendant)],
    claim_type=ClaimTypeEnum.contract,
    jurisdiction="Federal",
    key_dates=[KeyDate(label="Contract signed", date="2026-01-15")],
    narrative="On January 15, 2026, I entered into a written agreement with ABC Electronics...",
    evidence=[]
)

try:
    print("Extracting...")
    res = extract_case_facts(raw)
    print("Success!", res)
except Exception as e:
    import traceback
    traceback.print_exc()
