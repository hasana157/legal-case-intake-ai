"""
ingest_ca_statutes.py
Fetches California Civil Code sections 1940-1954 (landlord-tenant)
and Code of Civil Procedure sections 116.110-116.950 (small claims)
from leginfo.legislature.ca.gov and returns structured chunks.

Usage (standalone):
    python -m api.scripts.ingest_ca_statutes
"""

import re
import time
import logging
from typing import Generator

try:
    import requests
    from bs4 import BeautifulSoup
    _DEPS_OK = True
except ImportError:
    _DEPS_OK = False

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# URL templates
# ---------------------------------------------------------------------------
# leginfo uses a consistent URL pattern for section text.
_BASE = "https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml"

# (code_id, section_number) pairs — we build the URL from these.
# civil_code = "CIV", ccp = "CCP"
CIVIL_CODE_SECTIONS = list(range(1940, 1955))  # 1940-1954
CCP_SECTIONS = [
    "116.110", "116.120", "116.130", "116.210", "116.220",
    "116.221", "116.222", "116.223", "116.230", "116.231",
    "116.232", "116.240", "116.310", "116.320", "116.330",
    "116.340", "116.360", "116.370", "116.380", "116.390",
    "116.510", "116.520", "116.530", "116.540", "116.560",
    "116.610", "116.620", "116.630", "116.710", "116.720",
    "116.730", "116.740", "116.770", "116.780", "116.790",
    "116.820", "116.830", "116.840", "116.850", "116.860",
    "116.870", "116.880", "116.910", "116.920", "116.930",
    "116.940", "116.950",
]


def _fetch_section(code_id: str, section_no: str) -> dict | None:
    """Fetch a single statute section and return structured dict."""
    if not _DEPS_OK:
        logger.error("requests / beautifulsoup4 not installed. Run: pip install requests beautifulsoup4")
        return None

    url = f"{_BASE}?lawCode={code_id}&sectionNum={section_no}."
    try:
        resp = requests.get(url, timeout=15, headers={"User-Agent": "LegalRAG-Research/1.0"})
        resp.raise_for_status()
    except requests.RequestException as e:
        logger.warning("Failed to fetch %s § %s: %s", code_id, section_no, e)
        return None

    soup = BeautifulSoup(resp.text, "html.parser")

    # The section text lives in <div id="codeLawSectionNoHeading">
    text_div = soup.find("div", id="codeLawSectionNoHeading") or \
               soup.find("div", class_="lawSection")
    if not text_div:
        # Try generic content area
        text_div = soup.find("div", {"id": re.compile(r"law.*section", re.I)})

    raw_text = text_div.get_text(separator=" ", strip=True) if text_div else ""

    if len(raw_text) < 50:
        logger.debug("Short/empty response for %s § %s — skipping", code_id, section_no)
        return None

    code_label = "Cal. Civ. Code" if code_id == "CIV" else "Cal. Code Civ. Proc."
    citation = f"{code_label} § {section_no}"

    return {
        "text": raw_text,
        "case_name": citation,
        "citation": citation,
        "court": "California Legislature",
        "decision_date": "2024-01-01",
        "jurisdiction": "California",
        "source_type": "statute",
        "chunk_index": 0,
    }


def load_california_statutes(delay: float = 0.5) -> Generator[dict, None, None]:
    """
    Yields statute dicts for California landlord-tenant and small-claims sections.
    Applies a courteous crawl delay between requests.
    """
    # Civil Code §§ 1940-1954
    for section_no in CIVIL_CODE_SECTIONS:
        entry = _fetch_section("CIV", str(section_no))
        if entry:
            yield entry
        time.sleep(delay)

    # Code of Civil Procedure §§ 116.xxx
    for section_no in CCP_SECTIONS:
        entry = _fetch_section("CCP", str(section_no))
        if entry:
            yield entry
        time.sleep(delay)


# ---------------------------------------------------------------------------
# Fallback: hard-coded authoritative statutes for when scraping is unavailable
# ---------------------------------------------------------------------------
FALLBACK_STATUTES = [
    {
        "text": (
            "Cal. Civ. Code § 1941. Landlord to provide habitable premises. "
            "The lessor of a building intended for the occupation of human beings must, "
            "in the absence of an agreement to the contrary, put it into a condition fit "
            "for such occupation, and repair all subsequent dilapidations thereof, which "
            "render it untenantable, except such as are mentioned in Section 1929."
        ),
        "case_name": "Cal. Civ. Code § 1941",
        "citation": "Cal. Civ. Code § 1941",
        "court": "California Legislature",
        "decision_date": "2024-01-01",
        "jurisdiction": "California",
        "source_type": "statute",
        "chunk_index": 0,
    },
    {
        "text": (
            "Cal. Civ. Code § 1941.1. Untenantable dwelling. "
            "A dwelling shall be deemed untenantable for the purposes of Section 1941 if it "
            "substantially lacks any of the following effective waterproofing and weather "
            "protection of roof and exterior walls, including unbroken windows and doors; "
            "plumbing or gas facilities; water supply; heating facilities; electrical lighting; "
            "building clean and free from vermin, rodents, and accumulated garbage; adequate "
            "floors, stairways, and railings; or locks on exterior doors and windows."
        ),
        "case_name": "Cal. Civ. Code § 1941.1",
        "citation": "Cal. Civ. Code § 1941.1",
        "court": "California Legislature",
        "decision_date": "2024-01-01",
        "jurisdiction": "California",
        "source_type": "statute",
        "chunk_index": 0,
    },
    {
        "text": (
            "Cal. Civ. Code § 1942. Tenant's remedy for failure to repair. "
            "If within a reasonable time after written or oral notice to the landlord or his agent, "
            "the lessor neglects to do so, the lessee may repair the same himself where the cost "
            "of such repairs does not require an expenditure greater than one month's rent of the "
            "premises and deduct the expenses of such repairs from the rent, or the lessee may "
            "vacate the premises."
        ),
        "case_name": "Cal. Civ. Code § 1942",
        "citation": "Cal. Civ. Code § 1942",
        "court": "California Legislature",
        "decision_date": "2024-01-01",
        "jurisdiction": "California",
        "source_type": "statute",
        "chunk_index": 0,
    },
    {
        "text": (
            "Cal. Civ. Code § 1942.4. Landlord violations — tenant remedies. "
            "A landlord of a residential property shall not demand rent, collect rent, issue a "
            "notice of a rent increase, or issue a three-day notice to pay rent or quit pursuant "
            "to subdivision (2) of Section 1161 of the Code of Civil Procedure, if all of the "
            "following conditions exist: the dwelling substantially lacks any of the affirmative "
            "standard characteristics listed in Section 1941.1; a public officer has notified "
            "the landlord of substandard conditions; and the conditions have not been corrected "
            "within 35 days."
        ),
        "case_name": "Cal. Civ. Code § 1942.4",
        "citation": "Cal. Civ. Code § 1942.4",
        "court": "California Legislature",
        "decision_date": "2024-01-01",
        "jurisdiction": "California",
        "source_type": "statute",
        "chunk_index": 0,
    },
    {
        "text": (
            "Cal. Civ. Code § 1950.5. Security deposits. "
            "A landlord may not demand or receive security in excess of an amount equal to two "
            "months' rent for unfurnished residential property. The landlord shall return the "
            "security deposit to the tenant no later than 21 days after the tenant vacates the "
            "premises. If the landlord fails to return the deposit within 21 days or fails to "
            "provide an itemized statement, the landlord is liable to the tenant for the amount "
            "wrongfully withheld plus statutory damages up to twice the deposit amount."
        ),
        "case_name": "Cal. Civ. Code § 1950.5",
        "citation": "Cal. Civ. Code § 1950.5",
        "court": "California Legislature",
        "decision_date": "2024-01-01",
        "jurisdiction": "California",
        "source_type": "statute",
        "chunk_index": 0,
    },
    {
        "text": (
            "Cal. Civ. Code § 1951.2. Termination of lease — damages. "
            "If a lessee of real property breaches the lease and abandons the property before the "
            "end of the term, the lessor may treat the lease as terminated and recover damages "
            "including the worth at the time of award of the amount by which the unpaid rent which "
            "would have been earned after termination until the time of award exceeds the amount of "
            "rental loss that the lessee proves could have been reasonably avoided."
        ),
        "case_name": "Cal. Civ. Code § 1951.2",
        "citation": "Cal. Civ. Code § 1951.2",
        "court": "California Legislature",
        "decision_date": "2024-01-01",
        "jurisdiction": "California",
        "source_type": "statute",
        "chunk_index": 0,
    },
    {
        "text": (
            "Cal. Code Civ. Proc. § 116.220. Small claims court jurisdiction — amount. "
            "The small claims court has jurisdiction in actions for recovery of money, if the "
            "amount of the demand does not exceed ten thousand dollars ($10,000) in the case of "
            "a natural person; or five thousand dollars ($5,000) in the case of any other "
            "plaintiff. A plaintiff may not file more than two actions exceeding $2,500 in any "
            "calendar year in the small claims court."
        ),
        "case_name": "Cal. Code Civ. Proc. § 116.220",
        "citation": "Cal. Code Civ. Proc. § 116.220",
        "court": "California Legislature",
        "decision_date": "2024-01-01",
        "jurisdiction": "California",
        "source_type": "statute",
        "chunk_index": 0,
    },
    {
        "text": (
            "Cal. Code Civ. Proc. § 116.540. Representation in small claims court. "
            "No party may be represented by counsel at the hearing in small claims court. "
            "An individual litigant who is a natural person may appear on their own behalf. "
            "A corporation shall appear through a regular employee or an officer; "
            "a partnership shall appear through a partner or a regular employee. "
            "This section does not prevent a party from being advised or assisted by counsel "
            "outside of the hearing itself."
        ),
        "case_name": "Cal. Code Civ. Proc. § 116.540",
        "citation": "Cal. Code Civ. Proc. § 116.540",
        "court": "California Legislature",
        "decision_date": "2024-01-01",
        "jurisdiction": "California",
        "source_type": "statute",
        "chunk_index": 0,
    },
    {
        "text": (
            "Cal. Civ. Code § 1954. Landlord right of entry — notice requirements. "
            "A landlord may enter the dwelling unit only in the following cases: "
            "in case of emergency; to make necessary or agreed upon repairs; "
            "to show the dwelling to prospective or actual purchasers, mortgagees, tenants, "
            "or workmen; when the tenant has abandoned or surrendered the premises; "
            "or pursuant to court order. Except in emergency, the landlord shall provide the "
            "tenant with reasonable notice in writing of not less than 24 hours."
        ),
        "case_name": "Cal. Civ. Code § 1954",
        "citation": "Cal. Civ. Code § 1954",
        "court": "California Legislature",
        "decision_date": "2024-01-01",
        "jurisdiction": "California",
        "source_type": "statute",
        "chunk_index": 0,
    },
]


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    count = 0
    print("Fetching California statutes...")
    for entry in load_california_statutes():
        print(f"  [{count+1}] {entry['citation']}")
        count += 1
    print(f"Total fetched: {count}")
