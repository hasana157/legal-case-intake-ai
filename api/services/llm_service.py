# =============================================================================
# api/services/llm_service.py
# Milestone 4 — Generative Simulation Engine
# Handles streaming LLM calls to Groq and prompt construction.
# =============================================================================

import os
import json
import logging
from typing import AsyncGenerator, List, Any
from groq import AsyncGroq, APIError, RateLimitError, APITimeoutError
from groq.types.chat import ChatCompletionMessageParam

from api.models.structured_case import StructuredCaseV2
from api.models.retrieval import RetrievedAuthorityV2

logger = logging.getLogger("opposing_simulator.llm")

# =============================================================================
# Configuration
# Milestone 4 relies on a strong model for legal reasoning and JSON synthesis.
# =============================================================================
GROQ_GENERATION_MODEL = "llama-3.3-70b-versatile"

# Temperature for legal reasoning (low-to-moderate favors consistency)
# 0.2 provides deterministic structure while allowing synthesis of RAG facts.
TEMPERATURE = 0.2

# Capped to 1500 tokens to ensure streaming doesn't hit Vercel max limits 
# or Groq's free-tier rate limits abruptly.
MAX_TOKENS = 1500

_ADVERSARIAL_SYSTEM_PROMPT = """\
You are an expert opposing counsel representing the opposing party in a '{claim_type}' dispute in '{jurisdiction}'.
Your objective is to generate the strongest realistic counter-arguments, procedural objections, and counterevidence against the plaintiff's claim.

STRICT GROUNDING RULES:
1. You may ONLY use the legal authorities explicitly provided in the RETRIEVED AUTHORITIES section below.
2. If the retrieved authorities do not support a plausible counter-argument in a given category, state that explicitly rather than inventing one. THIS IS A HARD CONSTRAINT.
3. Every argument MUST cite at least one of the provided authorities.

OUTPUT FORMAT:
Produce a JSON array containing EXACTLY ONE argument representing your current statement in this debate.
Do not output markdown code blocks (e.g., ```json), just the raw JSON array.

[
  {
    "claim_text": "Detailed text of the argument, drafted persuasively. If a DEBATE HISTORY is provided, you must reply directly to the plaintiff's latest response, defending your position or exposing a weakness in their stance.",
    "supporting_authority": [
      {
        "citation": "Exact citation string from the retrieved authorities"
      }
    ],
    "confidence": "High", // Or Medium/Low
    "category": "substantive" // substantive, procedural, or evidentiary
  }
]
"""

def _get_async_groq_client() -> AsyncGroq:
    api_key = os.getenv("GROQ_API_KEY", "").strip()
    if not api_key:
        raise ValueError("GROQ_API_KEY is not configured.")
    return AsyncGroq(api_key=api_key)

def _build_messages(
    structured_case: StructuredCaseV2, 
    retrieved_authorities: List[RetrievedAuthorityV2],
    chat_history: List[Any] = None,
    is_retry: bool = False
) -> List[ChatCompletionMessageParam]:
    
    # Format retrieved authorities
    auth_texts = []
    for auth in retrieved_authorities:
        auth_texts.append(
            f"Case: {auth.case_name}\n"
            f"Citation: {auth.citation}\n"
            f"Text: {auth.matched_chunk_text}"
        )
    auth_block = "\n\n---\n\n".join(auth_texts) if auth_texts else "No authorities found."

    sys_prompt = (
        _ADVERSARIAL_SYSTEM_PROMPT
        .replace("{claim_type}", structured_case.claim_type.value)
        .replace("{jurisdiction}", structured_case.jurisdiction)
    )
    
    sys_prompt += f"\n\nRETRIEVED AUTHORITIES:\n{auth_block}"
    
    if chat_history:
        history_lines = []
        for msg in chat_history:
            role = getattr(msg, "role", None) or msg.get("role")
            content = getattr(msg, "content", None) or msg.get("content")
            role_label = "Opposing Counsel (You)" if role == "opponent" else "Plaintiff (User)"
            history_lines.append(f"{role_label}: {content}")
        sys_prompt += "\n\nDEBATE HISTORY:\n" + "\n".join(history_lines)
        sys_prompt += "\n\nNow, generate Opposing Counsel's next argument/rebuttal in the JSON format, responding directly to the Plaintiff's latest counter-argument."
    
    if is_retry:
        sys_prompt += "\n\nCRITICAL RETRY INSTRUCTION: Your previous response contained fabricated or slightly mismatched citations. You MUST ensure every citation matches the provided authorities exactly character-for-character."

    user_content = (
        f"Case Facts:\n"
        f"{json.dumps(structured_case.disputed_facts, indent=2)}\n\n"
        f"Available Evidence:\n"
        f"{json.dumps([e.model_dump() for e in structured_case.available_evidence], indent=2)}\n\n"
        f"Generate the JSON array of opposing arguments."
    )

    return [
        {"role": "system", "content": sys_prompt},
        {"role": "user", "content": user_content}
    ]

async def generate_opposing_arguments_stream(
    structured_case: StructuredCaseV2,
    retrieved_authorities: List[RetrievedAuthorityV2],
    chat_history: List[Any] = None,
    is_retry: bool = False
) -> AsyncGenerator[str, None]:
    """
    Streams the response from Groq. Yields raw text deltas.
    """
    client = _get_async_groq_client()
    messages = _build_messages(structured_case, retrieved_authorities, chat_history, is_retry)
    
    try:
        stream = await client.chat.completions.create(
            model=GROQ_GENERATION_MODEL,
            messages=messages,
            temperature=TEMPERATURE,
            max_tokens=MAX_TOKENS,
            stream=True
        )
        
        async for chunk in stream:
            delta = chunk.choices[0].delta.content
            if delta is not None:
                yield delta
                
    except RateLimitError:
        # CRITIC 2: calm message; CRITIC 3: no case content logged
        logger.warning(
            "Groq RateLimitError | model=%s | retry=%s",
            GROQ_GENERATION_MODEL,
            is_retry,
        )
        yield json.dumps([{
            "error": (
                "Our AI provider is currently experiencing high demand. "
                "Please wait 30 seconds and try again."
            )
        }])
    except APITimeoutError:
        # CRITIC 2: calm message
        logger.warning(
            "Groq APITimeoutError | model=%s | retry=%s",
            GROQ_GENERATION_MODEL,
            is_retry,
        )
        yield json.dumps([{
            "error": (
                "The AI response took too long to arrive. "
                "This occasionally happens on the free tier. Please try again."
            )
        }])
    except APIError as api_err:
        # CRITIC 3: log only the status code / error type, not the message body
        logger.error(
            "Groq APIError | status=%s | model=%s",
            getattr(api_err, 'status_code', 'unknown'),
            GROQ_GENERATION_MODEL,
        )
        yield json.dumps([{
            "error": (
                "The AI service returned an error. "
                "Please try again in a moment."
            )
        }])
    except Exception:
        # CRITIC 3: generic catch — do NOT log exception message (could echo user content)
        logger.error(
            "Unexpected LLM error | model=%s | retry=%s",
            GROQ_GENERATION_MODEL,
            is_retry,
        )
        yield json.dumps([{
            "error": (
                "An unexpected error occurred during generation. "
                "Please try again."
            )
        }])

# =============================================================================
# Milestone 5 — Rebuttal Hints LLM
# =============================================================================

_REBUTTAL_HINTS_SYSTEM_PROMPT = """\
You are an expert legal strategist coaching a self-represented litigant.
The user will provide an opposing argument they are facing.
Your job is to provide 3 to 5 guiding questions or strategic angles they should consider when drafting their rebuttal.

CRITICAL INSTRUCTION (CRITIC 2):
- DO NOT draft the actual rebuttal for them. 
- DO NOT write statements they could simply copy and paste verbatim as their answer.
- You must ONLY provide bulleted questions or exploratory angles that force the litigant to actively think about their own case facts.
- Keep the output extremely concise and direct.

OUTPUT FORMAT:
- A brief bulleted list of 3-5 questions.
- No introductory or concluding remarks.
"""

async def generate_rebuttal_hints(argument_text: str) -> str:
    """
    Generates rebuttal starting points (guiding questions only).
    CRITIC 3: argument_text is NOT logged — it may contain generated argument content.
    """
    client = _get_async_groq_client()
    messages = [
        {"role": "system", "content": _REBUTTAL_HINTS_SYSTEM_PROMPT},
        {"role": "user", "content": f"Opposing Argument:\n{argument_text}"}
    ]
    
    try:
        response = await client.chat.completions.create(
            model=GROQ_GENERATION_MODEL,
            messages=messages,
            temperature=0.4,
            max_tokens=300
        )
        return response.choices[0].message.content or "Could not generate hints."
    except RateLimitError:
        logger.warning("Groq RateLimitError in rebuttal hints | model=%s", GROQ_GENERATION_MODEL)
        return (
            "Our AI provider is currently experiencing high demand. "
            "Please wait a moment and try the Hints button again."
        )
    except Exception:
        # CRITIC 3: do NOT log the exception message — could contain argument text context
        logger.error("Rebuttal hints error | model=%s", GROQ_GENERATION_MODEL)
        return "Could not generate hints at this time. Please try again."

# =============================================================================
# Weaknesses & Improvement Strategy Analysis LLM
# =============================================================================

_WEAKNESSES_SYSTEM_PROMPT = """\
You are a senior litigation strategist reviewing a debate history between a self-represented litigant (Plaintiff) and opposing counsel (Defendant).
Identify the top 3 weaknesses in the user's arguments. Provide actionable advice on how to overcome these weaknesses in actual court.

OUTPUT FORMAT:
Return a JSON object with two fields:
- "weaknesses": an array of strings (the top 3 weaknesses)
- "improvement_tips": an array of strings (actionable advice for each weakness)

Do not output markdown code blocks (e.g. ```json), just the raw JSON.
"""

async def analyze_weaknesses(case_facts: StructuredCaseV2, chat_history: List[Any]) -> dict:
    """
    Reviews the debate history and returns strategic weaknesses and actionable tips.
    """
    client = _get_async_groq_client()
    
    history_lines = []
    for msg in chat_history:
        role = getattr(msg, "role", None) or msg.get("role")
        content = getattr(msg, "content", None) or msg.get("content")
        role_label = "Opposing Counsel" if role == "opponent" else "Plaintiff (User)"
        history_lines.append(f"{role_label}: {content}")
    history_text = "\n".join(history_lines)
    
    user_content = (
        f"Case Facts:\n"
        f"{json.dumps(case_facts.disputed_facts, indent=2)}\n\n"
        f"Debate Transcript:\n"
        f"{history_text}\n"
    )
    
    messages = [
        {"role": "system", "content": _WEAKNESSES_SYSTEM_PROMPT},
        {"role": "user", "content": user_content}
    ]
    
    try:
        response = await client.chat.completions.create(
            model=GROQ_GENERATION_MODEL,
            messages=messages,
            temperature=0.3,
            max_tokens=1000,
            response_format={"type": "json_object"}
        )
        return json.loads(response.choices[0].message.content)
    except Exception as e:
        logger.error(f"Error in weaknesses analysis: {e}")
        return {
            "weaknesses": [
                "Could not complete strategic analysis due to a temporary service error.",
                "Ensure your arguments reference specific dates and statutory periods.",
                "Verify whether proper written notice was provided to the opposing party."
            ],
            "improvement_tips": [
                "Try running the concluding analysis again in a few moments.",
                "Review the applicable state laws for security deposits or your specific claim type.",
                "Gather all communications, emails, or text messages showing notice was sent on time."
            ]
        }

