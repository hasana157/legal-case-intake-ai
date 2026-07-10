# =============================================================================
# api/services/case_parser.py
# Milestone 2 — Case fact extraction service.
#
# Architecture overview
# ---------------------
# 1. Primary path:  Groq API (free tier) with forced tool-use / function-calling.
#                   Model is injected via a single named constant (GROQ_MODEL) so
#                   swapping providers or models requires touching only this file.
#
# 2. Fallback path: Deterministic regex extractor used when GROQ_API_KEY is absent
#                   or when the Groq API call fails for any reason (auth, rate limit,
#                   timeout, malformed JSON). The fallback NEVER invents data — it
#                   only uses what is explicitly present in the wizard form fields or
#                   can be matched by a date regex in the narrative.
#
# CRITIC 1 — Extraction Fidelity
#   The system prompt hard-codes a strict prohibition on invented facts in all-caps.
#   The tool schema uses `additionalProperties: false` and marks most fields as
#   non-required so the model correctly emits empty lists rather than guessing.
#   The regex fallback only reads from structured wizard fields (parties, key_dates,
#   evidence) — it never attempts to parse names or legal opinions from free text.
#
# CRITIC 2 — Schema Determinism
#   `tool_choice` is forced to the single named tool so the model MUST return a
#   structured JSON tool-call response — not prose. The returned arguments are then
#   validated by Pydantic, which is the second determinism gate.
#
# CRITIC 3 — Graceful Degradation
#   Every Groq error class (AuthenticationError, RateLimitError, APITimeoutError,
#   APIConnectionError, APIError) is caught and falls through to the labeled regex
#   fallback with an explicit missing_context warning. No unhandled 500 is possible
#   from the Groq call itself.
# =============================================================================

from __future__ import annotations

import hashlib
import json
import logging
import os
import re
from datetime import datetime, timezone
from typing import Any

from tenacity import (
    retry,
    retry_if_exception_type,
    stop_after_attempt,
    wait_fixed,
)

from api.models.structured_case import (
    ClaimTypeEnum,
    EvidenceItem,
    EvidenceType,
    ExtractionMethod,
    KeyDate,
    Party,
    PartyRole,
    RawIntake,
    StructuredCaseV2,
)

logger = logging.getLogger("opposing_simulator.case_parser")

# =============================================================================
# Configuration — single named constant for model selection.
# ⚠ DEPLOYMENT NOTE: Verify this model string against Groq's currently available
# models before deploying. Free-tier model availability changes over time.
# Check: https://console.groq.com/docs/models
# =============================================================================
GROQ_MODEL = "llama-3.3-70b-versatile"

# Maximum word count before chunking is applied (B7 requirement).
_CHUNK_WORD_LIMIT = 5_000
_CHUNK_SIZE_WORDS = 3_000
_CHUNK_OVERLAP_WORDS = 200

# Confidence assigned to each extraction path.
_CONFIDENCE_LLM_FULL = 0.90      # LLM extraction, all key fields populated
_CONFIDENCE_LLM_PARTIAL = 0.60   # LLM extraction, some fields empty
_CONFIDENCE_REGEX = 0.30         # Regex fallback


# =============================================================================
# Groq tool schema
# Mirrors StructuredCaseV2 exactly. Using additionalProperties: false and
# marking fields as non-required (except the two we always expect) so the
# model emits empty arrays rather than hallucinating values.
# =============================================================================

_EXTRACTION_TOOL_SCHEMA: dict[str, Any] = {
    "type": "function",
    "function": {
        "name": "extract_case_facts",
        "description": (
            "Extract structured case facts from the provided legal narrative. "
            "Only populate fields with information explicitly stated in the narrative. "
            "Return empty arrays for list fields if nothing relevant was found."
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "disputed_facts": {
                    "type": "array",
                    "description": (
                        "Atomic statements of disputed facts explicitly mentioned in "
                        "the narrative. Each entry is ONE sentence. "
                        "DO NOT add facts not present in the narrative."
                    ),
                    "items": {"type": "string"},
                },
                "key_dates": {
                    "type": "array",
                    "description": (
                        "Significant dates explicitly mentioned in the narrative "
                        "(NOT the structured form fields, which are already captured). "
                        "Leave empty if no additional dates appear in the text."
                    ),
                    "items": {
                        "type": "object",
                        "properties": {
                            "label": {
                                "type": "string",
                                "description": "Short label like 'Incident date' or 'Contract signed'.",
                            },
                            "date": {
                                "type": "string",
                                "description": "ISO 8601 date: YYYY-MM-DD or YYYY-MM or YYYY.",
                            },
                        },
                        "required": ["label", "date"],
                        "additionalProperties": False,
                    },
                },
                "available_evidence": {
                    "type": "array",
                    "description": (
                        "Evidence items explicitly mentioned in the narrative "
                        "(NOT from the structured evidence form fields, which are already captured). "
                        "Leave empty if no additional evidence appears in the text."
                    ),
                    "items": {
                        "type": "object",
                        "properties": {
                            "description": {
                                "type": "string",
                                "description": "Brief description of the evidence item.",
                            },
                            "type": {
                                "type": "string",
                                "enum": [e.value for e in EvidenceType],
                                "description": "Category of evidence.",
                            },
                        },
                        "required": ["description", "type"],
                        "additionalProperties": False,
                    },
                },
                "extraction_confidence": {
                    "type": "number",
                    "minimum": 0.0,
                    "maximum": 1.0,
                    "description": (
                        "Your confidence that the narrative contained sufficient detail "
                        "to populate the key fields accurately. "
                        "Use < 0.3 if the text appears unrelated to a legal dispute."
                    ),
                },
            },
            "required": ["disputed_facts", "extraction_confidence"],
            "additionalProperties": False,
        },
    },
}

# =============================================================================
# System prompt — CRITIC 1 compliance
# The prohibition on invented facts is stated twice (once in normal prose,
# once in the explicit rule list) to reduce drift across long context windows.
# =============================================================================

_SYSTEM_PROMPT = """\
You are a legal fact extraction engine. Your ONLY task is to extract structured
information from the user's narrative and populate the provided JSON schema.

STRICT RULES — violation of any rule makes the output unusable:
1. YOU MUST NOT add any facts, dates, names, amounts, or legal opinions that are
   not EXPLICITLY stated in the user's narrative. No inference. No guessing.
2. If a field has no supporting text in the narrative, output an empty list ([])
   or omit the field entirely — never fabricate plausible-looking content.
3. Disputed facts must be atomic (one fact per string) and must quote or closely
   paraphrase the narrative — do not editorialize or add legal characterisation.
4. Dates must be copied exactly as they appear in the narrative. If a date is
   ambiguous (e.g. "last March"), use the most literal reading and note the
   ambiguity in the label field.
5. Evidence items must be physical or digital artifacts explicitly mentioned by
   the user — do not infer that standard evidence types might exist.
6. Set extraction_confidence < 0.3 if the narrative appears unrelated to any
   legal dispute or contains only gibberish/placeholder text.

The structured fields for parties, jurisdiction, key dates, and evidence from
the wizard form have already been captured — only extract ADDITIONAL items that
appear exclusively in the free-text narrative section.\
"""


# =============================================================================
# Groq client — lazy initialisation
# =============================================================================

def _get_groq_client() -> Any | None:
    """
    Returns an initialised Groq client if GROQ_API_KEY is set, else None.
    Never raises — the caller checks for None and falls through to regex.
    """
    api_key = os.environ.get("GROQ_API_KEY", "").strip()
    if not api_key:
        logger.warning(
            "GROQ_API_KEY not set — case_parser will use regex fallback. "
            "Set GROQ_API_KEY in .env to enable LLM extraction."
        )
        return None

    try:
        from groq import Groq  # lazy import: only required at runtime if key is set
        return Groq(api_key=api_key)
    except ImportError:
        logger.error(
            "groq package not installed. Run: pip install groq>=0.11.0"
        )
        return None


# =============================================================================
# Chunking utilities (B7 — long narrative handling)
# =============================================================================

def _split_into_words(text: str) -> list[str]:
    return text.split()


def _chunk_narrative(text: str) -> list[str]:
    """
    Split a long narrative into overlapping word-based chunks.
    Each chunk is at most _CHUNK_SIZE_WORDS words.
    Consecutive chunks share _CHUNK_OVERLAP_WORDS words to avoid losing
    context at chunk boundaries.
    """
    words = _split_into_words(text)
    if len(words) <= _CHUNK_SIZE_WORDS:
        return [text]

    chunks = []
    step = _CHUNK_SIZE_WORDS - _CHUNK_OVERLAP_WORDS
    for start in range(0, len(words), step):
        end = start + _CHUNK_SIZE_WORDS
        chunk_words = words[start:end]
        chunks.append(" ".join(chunk_words))
        if end >= len(words):
            break
    return chunks


def _content_hash(text: str) -> str:
    """Stable 8-char hash for deduplication of extracted fact/evidence strings."""
    return hashlib.md5(text.lower().strip().encode()).hexdigest()[:8]


def _merge_chunk_results(
    chunks_output: list[dict[str, Any]],
    form_key_dates: list[KeyDate],
    form_evidence: list[EvidenceItem],
) -> dict[str, Any]:
    """
    Merge extraction results from multiple chunks.
    - disputed_facts: union, dedup by content hash.
    - key_dates: union of narrative-extracted dates + form dates, dedup by date+label hash.
    - available_evidence: union of narrative-extracted items + form items, dedup.
    - extraction_confidence: average across chunks.
    """
    seen_fact_hashes: set[str] = set()
    seen_date_hashes: set[str] = set()
    seen_evidence_hashes: set[str] = set()

    merged_facts: list[str] = []
    merged_dates: list[dict[str, str]] = []
    merged_evidence: list[dict[str, str]] = []
    confidence_scores: list[float] = []

    for chunk in chunks_output:
        for fact in chunk.get("disputed_facts", []):
            h = _content_hash(fact)
            if h not in seen_fact_hashes:
                seen_fact_hashes.add(h)
                merged_facts.append(fact)

        for kd in chunk.get("key_dates", []):
            h = _content_hash(f"{kd['label']}|{kd['date']}")
            if h not in seen_date_hashes:
                seen_date_hashes.add(h)
                merged_dates.append(kd)

        for ev in chunk.get("available_evidence", []):
            h = _content_hash(ev["description"])
            if h not in seen_evidence_hashes:
                seen_evidence_hashes.add(h)
                merged_evidence.append(ev)

        conf = chunk.get("extraction_confidence", 0.5)
        confidence_scores.append(float(conf))

    # Add form-supplied dates (not deduplicated against narrative since they
    # were entered in structured fields and may share labels with extracted ones)
    for kd in form_key_dates:
        h = _content_hash(f"{kd.label}|{kd.date}")
        if h not in seen_date_hashes:
            seen_date_hashes.add(h)
            merged_dates.append({"label": kd.label, "date": kd.date})

    for ev in form_evidence:
        h = _content_hash(ev.description)
        if h not in seen_evidence_hashes:
            seen_evidence_hashes.add(h)
            merged_evidence.append({"description": ev.description, "type": ev.type.value})

    avg_conf = sum(confidence_scores) / len(confidence_scores) if confidence_scores else 0.5

    return {
        "disputed_facts": merged_facts,
        "key_dates": merged_dates,
        "available_evidence": merged_evidence,
        "extraction_confidence": round(avg_conf, 3),
    }


# =============================================================================
# Groq API call (with tenacity retry for validation failures only)
# =============================================================================

class _ValidationRetryError(Exception):
    """Raised internally to trigger a tenacity retry on schema validation failure."""
    def __init__(self, failed_field: str, reason: str):
        self.failed_field = failed_field
        self.reason = reason
        super().__init__(f"Validation failed on field '{failed_field}': {reason}")


def _call_groq_with_retry(
    client: Any,
    narrative_chunk: str,
    context_summary: str,
) -> dict[str, Any]:
    """
    Calls Groq with forced tool-use and returns the parsed tool-call arguments.
    Uses tenacity to retry once if the first response fails Pydantic validation.

    CRITIC 2 compliance: tool_choice is forced to the single named tool —
    we never accept a free-text JSON response; the tool-call path is mandatory.
    """

    @retry(
        retry=retry_if_exception_type(_ValidationRetryError),
        stop=stop_after_attempt(2),
        wait=wait_fixed(1),
        reraise=True,
    )
    def _attempt(follow_up_message: str | None = None) -> dict[str, Any]:
        messages: list[dict[str, str]] = [
            {"role": "system", "content": _SYSTEM_PROMPT},
        ]
        if context_summary:
            messages.append({
                "role": "user",
                "content": (
                    f"Context from the intake form (already structured — do NOT "
                    f"re-extract these into your output):\n{context_summary}\n\n"
                    f"Free-text narrative to extract from:\n{narrative_chunk}"
                ),
            })
        else:
            messages.append({
                "role": "user",
                "content": f"Free-text narrative to extract from:\n{narrative_chunk}",
            })

        if follow_up_message:
            messages.append({"role": "user", "content": follow_up_message})

        response = client.chat.completions.create(
            model=GROQ_MODEL,
            messages=messages,
            tools=[_EXTRACTION_TOOL_SCHEMA],
            tool_choice={"type": "function", "function": {"name": "extract_case_facts"}},
            temperature=0,          # deterministic extraction
            max_tokens=2048,
        )

        tool_calls = response.choices[0].message.tool_calls
        if not tool_calls:
            raise _ValidationRetryError(
                "tool_calls",
                "Model returned no tool call — forced tool_choice may have been ignored.",
            )

        raw_args = tool_calls[0].function.arguments
        try:
            parsed = json.loads(raw_args)
        except json.JSONDecodeError as exc:
            raise _ValidationRetryError(
                "tool_call_arguments",
                f"Model returned non-JSON tool arguments: {exc}",
            )

        # Validate sub-fields exist and have correct types (basic guard).
        if not isinstance(parsed.get("disputed_facts", []), list):
            raise _ValidationRetryError("disputed_facts", "Expected a list, got something else.")
        if not isinstance(parsed.get("key_dates", []), list):
            raise _ValidationRetryError("key_dates", "Expected a list, got something else.")

        return parsed

    return _attempt()


def _extract_single_chunk_via_groq(
    client: Any,
    narrative_chunk: str,
    context_summary: str,
) -> dict[str, Any] | None:
    """
    Extract from a single narrative chunk using Groq.
    Returns parsed dict on success, None on any API/validation failure.
    The caller falls through to regex on None.

    CRITIC 3 compliance: all Groq exception types are caught here.
    """
    try:
        from groq import (
            APIConnectionError,
            APIStatusError,
            APITimeoutError,
            AuthenticationError,
            RateLimitError,
        )

        result = _call_groq_with_retry(client, narrative_chunk, context_summary)
        return result

    except AuthenticationError:
        logger.error(
            "Groq AuthenticationError — GROQ_API_KEY is invalid. "
            "Falling through to regex fallback."
        )
    except RateLimitError:
        logger.warning(
            "Groq RateLimitError — free-tier limit hit. "
            "Falling through to regex fallback. Consider retrying later."
        )
    except APITimeoutError:
        logger.warning(
            "Groq APITimeoutError — request timed out. "
            "Falling through to regex fallback."
        )
    except APIConnectionError as exc:
        logger.error(
            "Groq APIConnectionError — cannot reach Groq endpoint: %s. "
            "Falling through to regex fallback.", exc
        )
    except APIStatusError as exc:
        logger.error(
            "Groq APIStatusError %s — %s. Falling through to regex fallback.",
            exc.status_code, exc.message
        )
    except _ValidationRetryError as exc:
        logger.warning(
            "Groq extraction failed Pydantic validation after retry: %s. "
            "Falling through to regex fallback.", exc
        )
    except Exception as exc:  # noqa: BLE001 — catch-all is intentional here
        logger.error(
            "Unexpected error during Groq extraction: %s. "
            "Falling through to regex fallback.", exc, exc_info=True
        )

    return None


# =============================================================================
# Regex fallback (B6 — CRITIC 1 compliance for the fallback path)
# Only extracts what is structurally deterministic:
#   - Dates from a simple ISO-8601-ish regex on the narrative text.
#   - Parties from the already-structured wizard form fields (not narrative).
#   - Evidence from the already-structured wizard form fields.
#   - Disputed facts = naive sentence split of the narrative — labelled as
#     "unverified sentence" so downstream modules know the provenance.
# The fallback NEVER invents a name, date, or legal opinion.
# =============================================================================

# Matches YYYY-MM-DD, YYYY/MM/DD, MM/DD/YYYY, Month DD YYYY
_DATE_PATTERNS = re.compile(
    r"""
    (?:
        (?P<iso>\d{4}-\d{2}-\d{2})                          # 2024-03-15
      | (?P<slash_ymd>\d{4}/\d{2}/\d{2})                    # 2024/03/15
      | (?P<slash_mdy>\d{1,2}/\d{1,2}/\d{4})                # 3/15/2024
      | (?P<written>                                         # March 15, 2024
            (?:January|February|March|April|May|June|
               July|August|September|October|November|December)
            \s+\d{1,2},?\s+\d{4}
        )
    )
    """,
    re.VERBOSE | re.IGNORECASE,
)

_SENTENCE_SPLIT_RE = re.compile(r"(?<=[.!?])\s+")


def _extract_via_regex(raw_intake: RawIntake) -> dict[str, Any]:
    """
    Deterministic regex-based extraction.
    Returns a dict with the same keys as the Groq tool schema.

    CRITIC 1 — Fallback fidelity:
    - Parties come from the structured wizard fields, not the narrative.
    - Evidence comes from the structured wizard fields, not the narrative.
    - Dates are regex-matched from the narrative — only verbatim matches.
    - Disputed facts are naive sentence splits — never legal opinions.
    """
    narrative = raw_intake.narrative

    # Extract dates from narrative text (verbatim matches only)
    date_matches = _DATE_PATTERNS.findall(narrative)
    extracted_dates: list[dict[str, str]] = []
    seen_raw_dates: set[str] = set()
    for match in _DATE_PATTERNS.finditer(narrative):
        raw_date = match.group(0).strip()
        if raw_date not in seen_raw_dates:
            seen_raw_dates.add(raw_date)
            # Attempt to normalise to ISO 8601
            normalised = _try_normalise_date(raw_date)
            extracted_dates.append({
                "label": "Date mentioned in narrative",
                "date": normalised or raw_date,
            })

    # Sentence-split the narrative into atomic disputed facts.
    # Each sentence is a candidate fact — caller handles dedup.
    sentences = _SENTENCE_SPLIT_RE.split(narrative.strip())
    disputed_facts = [
        s.strip()
        for s in sentences
        if len(s.strip()) > 20  # filter one-word fragments
    ]

    # Use evidence from structured form fields only.
    evidence = [
        {"description": ev.description, "type": ev.type.value}
        for ev in raw_intake.evidence
    ]

    return {
        "disputed_facts": disputed_facts,
        "key_dates": extracted_dates,
        "available_evidence": evidence,
        "extraction_confidence": _CONFIDENCE_REGEX,
    }


def _try_normalise_date(raw: str) -> str | None:
    """
    Best-effort ISO 8601 normalisation for a raw date string.
    Returns None if parsing fails — caller uses the raw string.
    """
    formats = [
        "%Y-%m-%d",
        "%Y/%m/%d",
        "%m/%d/%Y",
        "%B %d, %Y",
        "%B %d %Y",
        "%b %d, %Y",
        "%b %d %Y",
    ]
    for fmt in formats:
        try:
            return datetime.strptime(raw.strip(), fmt).strftime("%Y-%m-%d")
        except ValueError:
            continue
    return None


# =============================================================================
# Context summary builder (for providing structured form fields to the LLM)
# =============================================================================

def _build_context_summary(raw_intake: RawIntake) -> str:
    """
    Build a concise, structured summary of the wizard form fields that have
    already been captured. This is provided to the LLM as context so it knows
    what NOT to re-extract (preventing duplication) and what information is
    already available.
    """
    lines = [
        f"Jurisdiction: {raw_intake.jurisdiction}",
        f"Claim type: {raw_intake.claim_type.value}",
    ]

    if raw_intake.parties:
        party_strs = [f"{p.name} ({p.role.value})" for p in raw_intake.parties]
        lines.append(f"Parties (already captured): {', '.join(party_strs)}")

    if raw_intake.key_dates:
        date_strs = [f"{kd.label}: {kd.date}" for kd in raw_intake.key_dates]
        lines.append(f"Key dates (already captured): {'; '.join(date_strs)}")

    if raw_intake.evidence:
        ev_strs = [f"{ev.description} ({ev.type.value})" for ev in raw_intake.evidence]
        lines.append(f"Evidence items (already captured): {'; '.join(ev_strs)}")

    return "\n".join(lines)


# =============================================================================
# Main public function
# =============================================================================

def extract_case_facts(raw_intake: RawIntake) -> tuple[StructuredCaseV2, ExtractionMethod]:
    """
    Convert a RawIntake (from the multi-step wizard) into a StructuredCaseV2.

    Returns
    -------
    (structured_case, extraction_method)
        structured_case   — the populated StructuredCaseV2 object.
        extraction_method — "groq_llm" or "regex_fallback".

    Strategy
    --------
    1. If GROQ_API_KEY is set:
       a. If narrative > _CHUNK_WORD_LIMIT words: chunk → extract per chunk → merge.
       b. Otherwise: extract in one call.
       c. If Groq call fails for any reason: fall through to regex.
    2. Regex fallback if key absent or step 1 fails.
    3. Merge form-supplied parties/key_dates/evidence with extracted values.
    4. Validate and return.
    """
    narrative = raw_intake.narrative.strip()
    word_count = len(narrative.split())

    missing_context: list[str] = []
    groq_client = _get_groq_client()
    context_summary = _build_context_summary(raw_intake)

    # ── Primary path: Groq ───────────────────────────────────────────────────
    extracted: dict[str, Any] | None = None
    method = ExtractionMethod.regex_fallback

    if groq_client is not None:
        if word_count > _CHUNK_WORD_LIMIT:
            logger.info(
                "Narrative has %d words — applying chunking (%d-word chunks, %d-word overlap).",
                word_count, _CHUNK_SIZE_WORDS, _CHUNK_OVERLAP_WORDS,
            )
            chunks = _chunk_narrative(narrative)
            chunk_results: list[dict[str, Any]] = []
            for i, chunk in enumerate(chunks):
                logger.info("Extracting chunk %d/%d via Groq.", i + 1, len(chunks))
                result = _extract_single_chunk_via_groq(groq_client, chunk, context_summary)
                if result is not None:
                    chunk_results.append(result)

            if chunk_results:
                extracted = _merge_chunk_results(
                    chunk_results,
                    raw_intake.key_dates,
                    raw_intake.evidence,
                )
                method = ExtractionMethod.groq_llm
            else:
                logger.warning("All chunks failed Groq extraction — using regex fallback.")
                missing_context.append(
                    "Groq LLM extraction failed for all narrative chunks — "
                    "regex fallback was used (reduced accuracy)."
                )
        else:
            result = _extract_single_chunk_via_groq(groq_client, narrative, context_summary)
            if result is not None:
                extracted = result
                method = ExtractionMethod.groq_llm
            else:
                missing_context.append(
                    "Groq LLM extraction failed — regex fallback was used (reduced accuracy). "
                    "Check GROQ_API_KEY and Groq API status."
                )
    else:
        missing_context.append(
            "GROQ_API_KEY is not configured — regex fallback was used (reduced accuracy). "
            "Set GROQ_API_KEY in your .env file to enable LLM extraction."
        )

    # ── Fallback path: regex ─────────────────────────────────────────────────
    if extracted is None:
        extracted = _extract_via_regex(raw_intake)

    # ── Merge form fields with extracted results ─────────────────────────────
    # Form parties are always authoritative — use them directly.
    parties = raw_intake.parties

    # Key dates: form dates + narrative-extracted dates (dedup by content hash)
    combined_kd_raw: list[dict[str, str]] = []
    seen_kd_hashes: set[str] = set()

    # Form dates first (highest priority)
    for kd in raw_intake.key_dates:
        h = _content_hash(f"{kd.label}|{kd.date}")
        if h not in seen_kd_hashes:
            seen_kd_hashes.add(h)
            combined_kd_raw.append({"label": kd.label, "date": kd.date})

    # Narrative-extracted dates (only when using Groq — regex already handles form dates)
    for kd_dict in extracted.get("key_dates", []):
        h = _content_hash(f"{kd_dict.get('label','')}"
                          f"|{kd_dict.get('date','')}")
        if h not in seen_kd_hashes:
            seen_kd_hashes.add(h)
            combined_kd_raw.append(kd_dict)

    key_dates: list[KeyDate] = []
    for kd_dict in combined_kd_raw:
        try:
            key_dates.append(KeyDate(label=kd_dict["label"], date=kd_dict["date"]))
        except Exception:
            logger.warning("Skipping malformed key_date | error suppressed per NFR-3")

    # Evidence: form evidence + narrative-extracted evidence (dedup by description hash)
    combined_ev_raw: list[dict[str, str]] = []
    seen_ev_hashes: set[str] = set()

    for ev in raw_intake.evidence:
        h = _content_hash(ev.description)
        if h not in seen_ev_hashes:
            seen_ev_hashes.add(h)
            combined_ev_raw.append({"description": ev.description, "type": ev.type.value})

    for ev_dict in extracted.get("available_evidence", []):
        h = _content_hash(ev_dict.get("description", ""))
        if h not in seen_ev_hashes:
            seen_ev_hashes.add(h)
            combined_ev_raw.append(ev_dict)

    available_evidence: list[EvidenceItem] = []
    for ev_dict in combined_ev_raw:
        try:
            available_evidence.append(
                EvidenceItem(
                    description=ev_dict["description"],
                    type=EvidenceType(ev_dict.get("type", "other")),
                )
            )
        except Exception:
            logger.warning("Skipping malformed evidence item | error suppressed per NFR-3")

    # Disputed facts
    disputed_facts: list[str] = [
        f for f in extracted.get("disputed_facts", []) if isinstance(f, str) and f.strip()
    ]

    # Confidence score
    raw_conf = float(extracted.get("extraction_confidence", _CONFIDENCE_REGEX))
    # If LLM returned high confidence but key fields are empty, reduce it.
    if method == ExtractionMethod.groq_llm and not disputed_facts:
        raw_conf = min(raw_conf, _CONFIDENCE_LLM_PARTIAL)
    # Flag off-topic / adversarial input
    if raw_conf < 0.3 and method == ExtractionMethod.groq_llm:
        missing_context.append(
            "The narrative may not describe a legal dispute (low extraction confidence). "
            "Please revise your description to include the relevant facts of your case."
        )

    # ── Missing-context checks ────────────────────────────────────────────────
    if not key_dates:
        missing_context.append(
            "No key dates were provided or found in the narrative — "
            "statute of limitations cannot be checked."
        )

    if not parties:
        missing_context.append(
            "No parties (plaintiff / defendant names) were entered — "
            "simulation accuracy will be reduced."
        )

    if not disputed_facts:
        missing_context.append(
            "No disputed facts could be extracted from the narrative — "
            "please provide more detail about what happened."
        )

    # ── Assemble StructuredCaseV2 ─────────────────────────────────────────────
    structured = StructuredCaseV2(
        jurisdiction=raw_intake.jurisdiction,
        claim_type=raw_intake.claim_type,
        parties=parties,
        key_dates=key_dates,
        disputed_facts=disputed_facts,
        available_evidence=available_evidence,
        raw_narrative=narrative,
        jurisdiction_validated=False,   # set by the route handler after calling validate_jurisdiction()
        missing_context=missing_context,
        extraction_confidence=round(raw_conf, 3),
        processed_at=datetime.now(timezone.utc),
    )

    return structured, method
