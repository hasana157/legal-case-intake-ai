# =============================================================================
# evals/fixtures.py
# Milestone 6 — Extended evaluation fixtures (15 cases, 6 jurisdictions,
# all claim types). Used by grounding_eval.py and ragas_eval.py.
#
# Each fixture also carries a `relevance_labels` dict mapping hypothetical
# case citation strings to a 0/1 relevance judgment for MRR/NDCG computation.
# =============================================================================

from __future__ import annotations

import sys
from pathlib import Path

_ROOT = Path(__file__).resolve().parents[1]
if str(_ROOT) not in sys.path:
    sys.path.insert(0, str(_ROOT))

from api.models.structured_case import (
    ClaimTypeEnum, EvidenceItem, EvidenceType, KeyDate, Party,
    PartyRole, RawIntake,
)

# ---------------------------------------------------------------------------
# Helper
# ---------------------------------------------------------------------------

def _make(
    parties, claim_type, jurisdiction, key_dates, narrative, evidence=None
) -> RawIntake:
    return RawIntake(
        parties=parties,
        claim_type=claim_type,
        jurisdiction=jurisdiction,
        key_dates=key_dates,
        narrative=narrative,
        evidence=evidence or [],
    )


# ===========================================================================
# TENANCY — California (3 cases)
# ===========================================================================

CASE_01 = _make(
    parties=[Party(name="Maria Gonzalez", role=PartyRole.plaintiff),
              Party(name="Sunset Property Management LLC", role=PartyRole.defendant)],
    claim_type=ClaimTypeEnum.tenancy,
    jurisdiction="California",
    key_dates=[KeyDate(label="Move-out date", date="2024-01-31")],
    narrative=(
        "I rented an apartment from Sunset Property Management LLC starting January 1, 2023. "
        "I paid a security deposit of $2,400. I moved out on January 31, 2024 giving 30 days "
        "written notice. The apartment was left in clean condition with move-out photos. "
        "The landlord has not returned my deposit and has not provided an itemised deduction "
        "statement within 21 days as required by California Civil Code Section 1950.5. "
        "I sent a certified demand letter on March 1, 2024 but received no response."
    ),
    evidence=[EvidenceItem(description="Move-out photos", type=EvidenceType.photo)],
)
CASE_01_LABELS = {"case_id": "CASE-01", "jurisdiction": "California",
                  "expected_claim_type": "tenancy"}

CASE_02 = _make(
    parties=[Party(name="Kevin Park", role=PartyRole.plaintiff),
              Party(name="Harbor View Rentals", role=PartyRole.defendant)],
    claim_type=ClaimTypeEnum.tenancy,
    jurisdiction="California",
    key_dates=[KeyDate(label="Lockout date", date="2024-03-10")],
    narrative=(
        "My landlord Harbor View Rentals changed the locks on March 10, 2024 without "
        "prior notice or court order, locking me out of my unit while I still had an "
        "active month-to-month lease. This constitutes an unlawful self-help eviction "
        "under California law. I have been unable to access my personal belongings for "
        "over a week. I am seeking emergency injunctive relief and damages."
    ),
)
CASE_02_LABELS = {"case_id": "CASE-02", "jurisdiction": "California",
                  "expected_claim_type": "tenancy"}

CASE_03 = _make(
    parties=[Party(name="Amy Chen", role=PartyRole.plaintiff),
              Party(name="Pacific Realty Group", role=PartyRole.defendant)],
    claim_type=ClaimTypeEnum.tenancy,
    jurisdiction="California",
    key_dates=[KeyDate(label="Lease start", date="2022-06-01"),
               KeyDate(label="Notice date", date="2024-02-01")],
    narrative=(
        "I have lived in my rent-stabilized unit since June 2022. On February 1, 2024 "
        "Pacific Realty Group served me a 60-day notice claiming they intend to occupy "
        "the unit for a family member. I believe this is a pretext to remove me and raise "
        "rents above the local rent stabilisation ordinance limit. "
        "The landlord has a history of harassing long-term tenants."
    ),
)
CASE_03_LABELS = {"case_id": "CASE-03", "jurisdiction": "California",
                  "expected_claim_type": "tenancy"}


# ===========================================================================
# CONTRACT — Texas (2 cases)
# ===========================================================================

CASE_04 = _make(
    parties=[Party(name="David Chen", role=PartyRole.plaintiff),
              Party(name="Texan Supplies Co.", role=PartyRole.defendant)],
    claim_type=ClaimTypeEnum.small_claims,
    jurisdiction="Texas",
    key_dates=[KeyDate(label="Order date", date="2024-02-10"),
               KeyDate(label="Expected delivery", date="2024-03-01")],
    narrative=(
        "On February 10, 2024 I ordered office furniture totalling $3,200 from Texan "
        "Supplies Co. The confirmation stated delivery within 15 business days. No "
        "delivery was made by March 1, 2024. I sent cancellation in writing on "
        "March 20, 2024 and demanded a full refund of $3,200. As of filing, no "
        "refund has been issued. I have order confirmation, cancellation notice, "
        "and bank statement showing the charge."
    ),
    evidence=[EvidenceItem(description="Order confirmation email", type=EvidenceType.digital),
              EvidenceItem(description="Bank statement", type=EvidenceType.document)],
)
CASE_04_LABELS = {"case_id": "CASE-04", "jurisdiction": "Texas",
                  "expected_claim_type": "small_claims"}

CASE_05 = _make(
    parties=[Party(name="Sandra Okonkwo", role=PartyRole.plaintiff),
              Party(name="Lone Star Contractors LLC", role=PartyRole.defendant)],
    claim_type=ClaimTypeEnum.contract,
    jurisdiction="Texas",
    key_dates=[KeyDate(label="Contract signed", date="2023-09-15"),
               KeyDate(label="Completion deadline", date="2024-01-31")],
    narrative=(
        "I hired Lone Star Contractors to remodel my kitchen for $28,000, with work "
        "to be completed by January 31, 2024. The contractor abandoned the project in "
        "December 2023 after receiving $20,000 in payments, leaving the kitchen unusable. "
        "I was forced to hire a second contractor at an additional cost of $15,000 to "
        "complete the work. I am seeking $15,000 in excess completion costs plus "
        "$7,000 for the delay damages."
    ),
)
CASE_05_LABELS = {"case_id": "CASE-05", "jurisdiction": "Texas",
                  "expected_claim_type": "contract"}


# ===========================================================================
# EMPLOYMENT — Federal (3 cases)
# ===========================================================================

CASE_06 = _make(
    parties=[Party(name="Priya Sharma", role=PartyRole.plaintiff),
              Party(name="TechCorp Industries Inc.", role=PartyRole.defendant)],
    claim_type=ClaimTypeEnum.employment,
    jurisdiction="Federal",
    key_dates=[KeyDate(label="Termination date", date="2024-05-20"),
               KeyDate(label="EEOC filing", date="2024-07-01")],
    narrative=(
        "I was employed as a Senior Software Engineer at TechCorp from March 2021. "
        "In April 2024 I disclosed my pregnancy. Within two weeks I was placed on a "
        "performance improvement plan despite a 'meets expectations' review in March 2024. "
        "I was terminated May 20, 2024 — no male colleague placed on a PIP during the same "
        "period was terminated. I filed an EEOC charge on July 1, 2024 (Charge No. 999-2024-12345)."
    ),
    evidence=[EvidenceItem(description="March 2024 performance review", type=EvidenceType.document),
              EvidenceItem(description="EEOC charge confirmation", type=EvidenceType.document)],
)
CASE_06_LABELS = {"case_id": "CASE-06", "jurisdiction": "Federal",
                  "expected_claim_type": "employment"}

CASE_07 = _make(
    parties=[Party(name="Marcus Thompson", role=PartyRole.plaintiff),
              Party(name="National Retail Corp", role=PartyRole.defendant)],
    claim_type=ClaimTypeEnum.employment,
    jurisdiction="Federal",
    key_dates=[KeyDate(label="Demotion date", date="2024-01-15")],
    narrative=(
        "I am a 58-year-old store manager who was demoted on January 15, 2024 and replaced "
        "by a 31-year-old with less experience after 22 years of service. My manager told "
        "me the company was looking to 'bring in fresh energy.' Three other employees over "
        "50 were also demoted or forced out during the same restructuring. I believe this "
        "constitutes age discrimination under the ADEA."
    ),
)
CASE_07_LABELS = {"case_id": "CASE-07", "jurisdiction": "Federal",
                  "expected_claim_type": "employment"}

CASE_08 = _make(
    parties=[Party(name="Fatima Al-Rashid", role=PartyRole.plaintiff),
              Party(name="Metro Hospital System", role=PartyRole.defendant)],
    claim_type=ClaimTypeEnum.employment,
    jurisdiction="Federal",
    key_dates=[KeyDate(label="Request for accommodation", date="2023-11-01"),
               KeyDate(label="Termination", date="2024-02-28")],
    narrative=(
        "I worked as a registered nurse and requested a reasonable accommodation in "
        "November 2023 to avoid rotating night shifts due to a documented disability. "
        "The hospital denied my request without engaging in any interactive process. "
        "I was terminated February 28, 2024 under the pretext of 'scheduling inflexibility.' "
        "I believe this violates the ADA. I have a letter from my physician documenting "
        "the disability and my accommodation request in writing."
    ),
)
CASE_08_LABELS = {"case_id": "CASE-08", "jurisdiction": "Federal",
                  "expected_claim_type": "employment"}


# ===========================================================================
# PERSONAL INJURY — Florida (2 cases)
# ===========================================================================

CASE_09 = _make(
    parties=[Party(name="Robert Williams", role=PartyRole.plaintiff),
              Party(name="Sunshine Grocery Inc.", role=PartyRole.defendant)],
    claim_type=ClaimTypeEnum.personal_injury,
    jurisdiction="Florida",
    key_dates=[KeyDate(label="Incident date", date="2024-04-12")],
    narrative=(
        "On April 12, 2024 I slipped on a wet floor in the produce section of Sunshine "
        "Grocery with no wet floor sign present. I suffered a fractured left wrist and "
        "bruised ribs. The store manager acknowledged a mop bucket had spilled 20 minutes "
        "earlier. My medical bills total $18,500 and I missed six weeks of work at $900/week."
    ),
    evidence=[EvidenceItem(description="Emergency room records", type=EvidenceType.document),
              EvidenceItem(description="Witness contact information", type=EvidenceType.witness)],
)
CASE_09_LABELS = {"case_id": "CASE-09", "jurisdiction": "Florida",
                  "expected_claim_type": "personal_injury"}

CASE_10 = _make(
    parties=[Party(name="Carmen Delgado", role=PartyRole.plaintiff),
              Party(name="South Beach Hotels LLC", role=PartyRole.defendant)],
    claim_type=ClaimTypeEnum.personal_injury,
    jurisdiction="Florida",
    key_dates=[KeyDate(label="Incident date", date="2024-06-20")],
    narrative=(
        "On June 20, 2024 I fell in the hotel's outdoor pool area due to a broken "
        "lounge chair that collapsed under me. I suffered a herniated disc at L4-L5 "
        "requiring surgery scheduled for August 2024. Hotel staff had received two "
        "prior complaints about the same chair. I have medical records, an incident "
        "report filed at the hotel, and photos of the broken chair."
    ),
)
CASE_10_LABELS = {"case_id": "CASE-10", "jurisdiction": "Florida",
                  "expected_claim_type": "personal_injury"}


# ===========================================================================
# FAMILY — New York (2 cases)
# ===========================================================================

CASE_11 = _make(
    parties=[Party(name="Sarah Thompson", role=PartyRole.plaintiff),
              Party(name="James Thompson", role=PartyRole.defendant)],
    claim_type=ClaimTypeEnum.family,
    jurisdiction="New York",
    key_dates=[KeyDate(label="Original custody order", date="2022-06-15"),
               KeyDate(label="Relocation date", date="2024-09-01")],
    narrative=(
        "The original custody order grants joint legal custody with primary physical custody "
        "to me and visitation to James every other weekend. In August 2024 James informed me "
        "he would relocate to Texas for a new job effective September 1, 2024 making the "
        "visitation schedule impossible. The children, aged 8 and 11, wish to remain in "
        "New York where they attend school."
    ),
)
CASE_11_LABELS = {"case_id": "CASE-11", "jurisdiction": "New York",
                  "expected_claim_type": "family"}

CASE_12 = _make(
    parties=[Party(name="Elena Petrov", role=PartyRole.plaintiff),
              Party(name="Viktor Petrov", role=PartyRole.defendant)],
    claim_type=ClaimTypeEnum.family,
    jurisdiction="New York",
    key_dates=[KeyDate(label="Separation date", date="2023-10-01"),
               KeyDate(label="Asset transfer date", date="2024-01-15")],
    narrative=(
        "Viktor and I separated in October 2023 after 14 years of marriage. "
        "In January 2024 Viktor transferred the family home (valued at $850,000) "
        "to his brother for $1 to conceal it from equitable distribution proceedings. "
        "I discovered this transfer on February 1, 2024 through a public property "
        "records search. I am seeking to void the fraudulent transfer and have the "
        "asset included in equitable distribution."
    ),
)
CASE_12_LABELS = {"case_id": "CASE-12", "jurisdiction": "New York",
                  "expected_claim_type": "family"}


# ===========================================================================
# PROPERTY — Illinois (2 cases)
# ===========================================================================

CASE_13 = _make(
    parties=[Party(name="Brian Foster", role=PartyRole.plaintiff),
              Party(name="Westside Developers LLC", role=PartyRole.defendant)],
    claim_type=ClaimTypeEnum.property,
    jurisdiction="Illinois",
    key_dates=[KeyDate(label="Purchase closing", date="2023-08-30"),
               KeyDate(label="Defect discovery", date="2024-01-10")],
    narrative=(
        "I purchased a single-family home from Westside Developers LLC on August 30, 2023. "
        "In January 2024 I discovered the basement floods during heavy rain due to a "
        "defective drainage system that was known to the developer. The seller's disclosure "
        "stated 'no known water intrusion issues.' I have obtained a contractor's expert "
        "report confirming pre-existing construction defects. Repair costs are estimated at $45,000."
    ),
)
CASE_13_LABELS = {"case_id": "CASE-13", "jurisdiction": "Illinois",
                  "expected_claim_type": "property"}

CASE_14 = _make(
    parties=[Party(name="Rosa Hernandez", role=PartyRole.plaintiff),
              Party(name="City of Chicago", role=PartyRole.defendant)],
    claim_type=ClaimTypeEnum.property,
    jurisdiction="Illinois",
    key_dates=[KeyDate(label="Notice of violation", date="2024-03-01"),
               KeyDate(label="Demolition order", date="2024-04-15")],
    narrative=(
        "The City of Chicago issued a demolition order for my commercial property on "
        "April 15, 2024 based on a building code violation notice from March 1, 2024. "
        "I was given only 30 days to contest and the hearing officer denied my request "
        "for an extension without explanation. The building has been in my family for "
        "40 years and I dispute the severity of the violations. I am seeking a temporary "
        "restraining order and a fair hearing."
    ),
)
CASE_14_LABELS = {"case_id": "CASE-14", "jurisdiction": "Illinois",
                  "expected_claim_type": "property"}


# ===========================================================================
# NEGLIGENCE — Washington (1 case)
# ===========================================================================

CASE_15 = _make(
    parties=[Party(name="Tyler Brooks", role=PartyRole.plaintiff),
              Party(name="Pacific Northwest Logistics Co.", role=PartyRole.defendant)],
    claim_type=ClaimTypeEnum.personal_injury,
    jurisdiction="Washington",
    key_dates=[KeyDate(label="Accident date", date="2024-05-03"),
               KeyDate(label="Police report date", date="2024-05-03")],
    narrative=(
        "On May 3, 2024 a delivery truck owned by Pacific Northwest Logistics ran a red "
        "light and struck my vehicle at an intersection in Seattle. The driver was cited "
        "at the scene for running a red light. I suffered a concussion and two fractured "
        "ribs. My vehicle was totaled (value $22,000). Medical expenses to date are "
        "$31,000 and I have been unable to work for three months (lost income $18,000). "
        "I have the police report, dashcam footage, and three independent witness statements."
    ),
    evidence=[EvidenceItem(description="Police report", type=EvidenceType.document),
              EvidenceItem(description="Dashcam footage", type=EvidenceType.video)],
)
CASE_15_LABELS = {"case_id": "CASE-15", "jurisdiction": "Washington",
                  "expected_claim_type": "negligence"}


# ===========================================================================
# Master list
# ===========================================================================

ALL_EVAL_CASES = [
    (CASE_01, CASE_01_LABELS),
    (CASE_02, CASE_02_LABELS),
    (CASE_03, CASE_03_LABELS),
    (CASE_04, CASE_04_LABELS),
    (CASE_05, CASE_05_LABELS),
    (CASE_06, CASE_06_LABELS),
    (CASE_07, CASE_07_LABELS),
    (CASE_08, CASE_08_LABELS),
    (CASE_09, CASE_09_LABELS),
    (CASE_10, CASE_10_LABELS),
    (CASE_11, CASE_11_LABELS),
    (CASE_12, CASE_12_LABELS),
    (CASE_13, CASE_13_LABELS),
    (CASE_14, CASE_14_LABELS),
    (CASE_15, CASE_15_LABELS),
]
