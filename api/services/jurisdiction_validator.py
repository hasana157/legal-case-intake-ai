# =============================================================================
# api/services/jurisdiction_validator.py
# Milestone 2 — Jurisdiction validation service.
#
# Validates that a user-supplied jurisdiction string resolves to one of the
# canonical dataset entries. Returns the normalised name so downstream modules
# always receive consistent strings (e.g. "California" never "california" or
# "Califronia").
#
# The tolerance parameter in _fuzzy_match controls how many character edits
# are allowed — currently set to handle 2-character typos (covers the most
# common single-key typos on mobile/desktop keyboards).
# =============================================================================

from __future__ import annotations

import unicodedata

# =============================================================================
# Canonical jurisdiction list
# All 50 US states + DC + Federal + Puerto Rico + US Virgin Islands.
# Milestone 3 will extend this with province/territory lists for other
# common common-law countries (Canada, UK, Australia).
# =============================================================================

SUPPORTED_JURISDICTIONS: list[str] = [
    # US States (alphabetical)
    "Alabama", "Alaska", "Arizona", "Arkansas", "California", "Colorado",
    "Connecticut", "Delaware", "Florida", "Georgia", "Hawaii", "Idaho",
    "Illinois", "Indiana", "Iowa", "Kansas", "Kentucky", "Louisiana",
    "Maine", "Maryland", "Massachusetts", "Michigan", "Minnesota",
    "Mississippi", "Missouri", "Montana", "Nebraska", "Nevada",
    "New Hampshire", "New Jersey", "New Mexico", "New York",
    "North Carolina", "North Dakota", "Ohio", "Oklahoma", "Oregon",
    "Pennsylvania", "Rhode Island", "South Carolina", "South Dakota",
    "Tennessee", "Texas", "Utah", "Vermont", "Virginia", "Washington",
    "West Virginia", "Wisconsin", "Wyoming",
    # Special jurisdictions
    "District of Columbia",
    "Puerto Rico",
    "US Virgin Islands",
    "Federal",
]

# Build a lower-case lookup dict once at import time for O(1) exact-match.
_LOWER_MAP: dict[str, str] = {j.lower(): j for j in SUPPORTED_JURISDICTIONS}


# =============================================================================
# Internal helpers
# =============================================================================

def _normalise_string(s: str) -> str:
    """
    Lowercase + strip + collapse whitespace + remove accents.
    Ensures "  New  York " and "new york" both resolve to the same key.
    """
    s = s.strip().lower()
    # Collapse any internal runs of whitespace to a single space
    s = " ".join(s.split())
    # Remove diacritics (é → e) to handle copy-paste from international keyboards
    s = unicodedata.normalize("NFD", s)
    s = "".join(c for c in s if unicodedata.category(c) != "Mn")
    return s


def _levenshtein(a: str, b: str) -> int:
    """
    Standard Levenshtein edit distance between two strings.
    O(len(a) * len(b)) — acceptable here since jurisdiction strings are short.
    """
    if a == b:
        return 0
    if not a:
        return len(b)
    if not b:
        return len(a)

    rows = len(a) + 1
    cols = len(b) + 1
    dp = [[0] * cols for _ in range(rows)]

    for i in range(rows):
        dp[i][0] = i
    for j in range(cols):
        dp[0][j] = j

    for i in range(1, rows):
        for j in range(1, cols):
            cost = 0 if a[i - 1] == b[j - 1] else 1
            dp[i][j] = min(
                dp[i - 1][j] + 1,      # deletion
                dp[i][j - 1] + 1,      # insertion
                dp[i - 1][j - 1] + cost,  # substitution
            )
    return dp[rows - 1][cols - 1]


def _fuzzy_match(raw: str, tolerance: int = 2) -> str | None:
    """
    Try to match `raw` (already normalised) against the canonical list.
    Returns the canonical name if found within `tolerance` edit distance,
    otherwise None.

    tolerance=2 covers:
    - Single wrong key:        "califronia" → "california" (edit dist 2)
    - Missing space:           "newyork"    → "new york"   (edit dist 1)
    - Extra trailing char:     "texas."     → "texas"      (edit dist 1)
    """
    best_match: str | None = None
    best_dist = tolerance + 1  # start above threshold

    for canonical_lower, canonical in _LOWER_MAP.items():
        dist = _levenshtein(raw, canonical_lower)
        if dist < best_dist:
            best_dist = dist
            best_match = canonical

    return best_match if best_dist <= tolerance else None


# =============================================================================
# Public API
# =============================================================================

def validate_jurisdiction(jurisdiction_str: str) -> tuple[bool, str]:
    """
    Validate and normalise a jurisdiction string.

    Returns
    -------
    (is_valid, normalised_name)
        is_valid        — True if the string resolved to a known jurisdiction.
        normalised_name — The canonical name (e.g. "California") on success,
                          or the original stripped string on failure.

    Strategy (in order):
    1. Exact case-insensitive match (fastest path, covers all normal inputs).
    2. Fuzzy match within 2 edit-distance (covers typos like "Califronia").
    3. Fail: return (False, original_stripped).

    Examples
    --------
    >>> validate_jurisdiction("california")
    (True, "California")
    >>> validate_jurisdiction("  New  York  ")
    (True, "New York")
    >>> validate_jurisdiction("Califronia")
    (True, "California")
    >>> validate_jurisdiction("InvalidPlace")
    (False, "InvalidPlace")
    """
    if not jurisdiction_str or not jurisdiction_str.strip():
        return False, ""

    normalised = _normalise_string(jurisdiction_str)

    # 1. Exact match
    if normalised in _LOWER_MAP:
        return True, _LOWER_MAP[normalised]

    # 2. Fuzzy match
    fuzzy = _fuzzy_match(normalised, tolerance=2)
    if fuzzy:
        return True, fuzzy

    # 3. No match
    return False, jurisdiction_str.strip()


def list_supported_jurisdictions() -> list[str]:
    """Return the full list of canonical jurisdiction names (sorted)."""
    return sorted(SUPPORTED_JURISDICTIONS)
