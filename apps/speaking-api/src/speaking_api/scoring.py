"""Gemini scores a Speaking part from its audio, evidence first (like scoring-api rubric.py).

Audio goes to the Gemini API as inline WAV, not through speech-to-text, so pace, hesitation and
intonation reach the judge. One call per Part keeps a test inside the free tier's daily caps.
"""

import asyncio
import logging
import os
import random
import re

import httpx
from google import genai
from google.genai import errors, types
from pydantic import BaseModel, ValidationError

from speaking_api.prompts import SCORING_SYSTEM, SCORING_USER
from speaking_api.schemas import CRITERIA, Answer, EvidenceSpan

log = logging.getLogger(__name__)
DEFAULT_MODELS = "gemini-3.6-flash,gemini-3.8-flash,gemini-3.7-flash,gemini-3.5-flash"
MAX_OUTPUT_TOKENS = 8192
TIMEOUT_S = 120.0
MAX_ATTEMPTS = 3
_RETRYABLE = {429, 500, 502, 503, 504}
PART_LABEL = {"part1": "Part 1", "part2": "Part 2", "part3": "Part 3"}


class ScoringError(RuntimeError):
    pass


class _Answer(BaseModel):
    question: str
    start_s: float
    end_s: float
    transcript: str


class _Evidence(BaseModel):
    quote: str
    observation: str


class _Judgement(BaseModel):
    evidence: list[_Evidence]
    analysis: str
    band: int


class _SpeakingJudgement(BaseModel):
    answers: list[_Answer]
    fluency_coherence: _Judgement
    lexical_resource: _Judgement
    grammatical_range_accuracy: _Judgement
    pronunciation: _Judgement


def scoring_models() -> list[str]:
    raw = os.environ.get("SPEAKING_MODELS", DEFAULT_MODELS)
    return [m.strip() for m in raw.split(",") if m.strip()]


def locate(quote: str, text: str) -> tuple[int, int] | None:
    """Find a quote in the transcript, tolerating case and whitespace differences."""
    words = quote.split()
    if not words:
        return None
    pattern = r"\s+".join(re.escape(w) for w in words)
    m = re.search(pattern, text, re.IGNORECASE)
    return (m.start(), m.end()) if m else None


def evidence(judgement: _Judgement, transcript: str) -> list[EvidenceSpan]:
    spans = []
    for e in judgement.evidence:
        at = locate(e.quote, transcript)
        spans.append(
            EvidenceSpan(
                quote=e.quote,
                observation=e.observation,
                start=at[0] if at else None,
                end=at[1] if at else None,
                verified=at is not None,
            )
        )
    return spans


def answers_of(judgement: _SpeakingJudgement) -> list[Answer]:
    return [
        Answer(
            question=a.question,
            start_s=max(0.0, a.start_s),
            end_s=max(a.start_s, a.end_s),
            transcript=a.transcript.strip(),
        )
        for a in judgement.answers
        if a.transcript.strip()
    ]


async def _call(
    client: genai.Client, model: str, wav: bytes, part: str, questions: list[str]
) -> _SpeakingJudgement:
    config = types.GenerateContentConfig(
        system_instruction=SCORING_SYSTEM,
        response_mime_type="application/json",
        response_schema=_SpeakingJudgement,
        max_output_tokens=MAX_OUTPUT_TOKENS,
    )
    text = SCORING_USER.format(
        part_label=PART_LABEL[part], questions="\n".join(f"- {q}" for q in questions)
    )
    contents: list[str | types.Part] = [
        types.Part.from_bytes(data=wav, mime_type="audio/wav"),
        text,
    ]
    response = await asyncio.wait_for(
        client.aio.models.generate_content(model=model, contents=contents, config=config),
        timeout=TIMEOUT_S,
    )
    if isinstance(response.parsed, _SpeakingJudgement):
        return response.parsed
    return _SpeakingJudgement.model_validate_json(response.text or "")


async def judge(
    client: genai.Client, wav: bytes, part: str, questions: list[str]
) -> tuple[_SpeakingJudgement, str]:
    """The first model that returns a valid judgement, with retries; ScoringError otherwise."""
    last: Exception | None = None
    for model in scoring_models():
        for attempt in range(1, MAX_ATTEMPTS + 1):
            try:
                return await _call(client, model, wav, part, questions), model
            except errors.APIError as e:
                last = e
                if e.code not in _RETRYABLE:
                    break
            except (ValidationError, TimeoutError, httpx.TransportError) as e:
                last = e
            log.warning("%s attempt %d failed: %r", model, attempt, last)
            await asyncio.sleep(2**attempt + random.uniform(0, 1))  # noqa: S311 - jitter
    raise ScoringError(f"no Gemini model could score the audio: {last!r}")


def clamp_band(band: int) -> int:
    return min(9, max(0, band))


__all__ = ["CRITERIA", "ScoringError", "answers_of", "evidence", "judge", "locate"]
