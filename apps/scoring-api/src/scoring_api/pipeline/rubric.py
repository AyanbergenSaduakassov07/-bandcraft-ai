"""Stage 3: Gemini rubric scoring with evidence-before-score output and quote verification."""

import asyncio
import logging
import math
import random
import re

from google import genai
from google.genai import errors, types
from pydantic import BaseModel, ValidationError

from scoring_api.pipeline.prompts import SYSTEM_PROMPT, build_user_prompt
from scoring_api.schemas import CRITERIA, CriterionScore, EvidenceSpan, RubricResult, TaskType

log = logging.getLogger(__name__)

MAX_OUTPUT_TOKENS = 8_192  # room for thinking tokens plus ~2k of JSON
MAX_ATTEMPTS = 3
CALL_TIMEOUT_S = 120
_RETRYABLE_STATUS = {429, 500, 502, 503, 504}


class RubricError(RuntimeError):
    """Gemini could not produce a valid judgement after all retries."""


# Response schema. Field order is the generation order: evidence, then analysis, then band.
class _Evidence(BaseModel):
    quote: str
    observation: str


class _Judgement(BaseModel):
    evidence: list[_Evidence]
    analysis: str
    band: int


class _RubricJudgement(BaseModel):
    task_achievement_response: _Judgement
    coherence_cohesion: _Judgement
    lexical_resource: _Judgement
    grammatical_range_accuracy: _Judgement


def overall_band(bands: list[int]) -> float:
    """IELTS rule: mean of the four criteria; .25 rounds up to .5, .75 up to the next band."""
    return math.floor(sum(bands) / len(bands) * 2 + 0.5) / 2


_STRAIGHT_QUOTES = str.maketrans({"‘": "'", "’": "'", "“": '"', "”": '"'})


def locate(quote: str, script: str) -> tuple[int, int] | None:
    """Find a quote in the Script, tolerating whitespace, curly quotes and '...' elisions."""
    quote = quote.translate(_STRAIGHT_QUOTES)
    fragments = [f.strip(" \"'") for f in re.split(r"\.{3}|…", quote)]
    fragments = [f for f in fragments if f]
    if not fragments:
        return None
    start, pos = None, 0
    for fragment in fragments:
        words = [re.escape(w) for w in fragment.split()]
        pattern = r"\s+".join(words).replace("'", "['’]").replace('"', '["“”]')
        match = re.compile(pattern, re.I).search(script, pos)
        if not match:
            return None
        start = match.start() if start is None else start
        pos = match.end()
    return (start, pos) if start is not None else None


def _to_score(judgement: _Judgement, script: str) -> CriterionScore:
    spans = []
    for ev in judgement.evidence:
        found = locate(ev.quote, script)
        spans.append(
            EvidenceSpan(
                quote=ev.quote,
                observation=ev.observation,
                start=found[0] if found else None,
                end=found[1] if found else None,
                verified=found is not None,
            )
        )
    return CriterionScore(
        band=min(9, max(0, judgement.band)),
        analysis=judgement.analysis,
        evidence=spans,
        evidence_verified=any(s.verified for s in spans),
    )


async def _call(client: genai.Client, model: str, contents: str) -> _RubricJudgement:
    config = types.GenerateContentConfig(
        system_instruction=SYSTEM_PROMPT,
        response_mime_type="application/json",
        response_schema=_RubricJudgement,
        max_output_tokens=MAX_OUTPUT_TOKENS,
    )
    response = await asyncio.wait_for(
        client.aio.models.generate_content(model=model, contents=contents, config=config),
        timeout=CALL_TIMEOUT_S,
    )
    if isinstance(response.parsed, _RubricJudgement):
        return response.parsed
    return _RubricJudgement.model_validate_json(response.text or "")


async def score_rubric(
    task_type: TaskType, prompt: str, script: str, *, client: genai.Client, model: str
) -> RubricResult:
    contents = build_user_prompt(task_type, prompt, script)
    for attempt in range(1, MAX_ATTEMPTS + 1):
        try:
            judgement = await _call(client, model, contents)
            break
        except errors.APIError as e:
            if e.code not in _RETRYABLE_STATUS or attempt == MAX_ATTEMPTS:
                raise RubricError(f"Gemini API error {e.code}: {e.message}") from e
            log.warning(
                "gemini attempt %d/%d failed: %s %s", attempt, MAX_ATTEMPTS, e.code, e.message
            )
        except (ValidationError, TimeoutError) as e:
            if attempt == MAX_ATTEMPTS:
                raise RubricError(f"No valid judgement after {MAX_ATTEMPTS} attempts: {e}") from e
            log.warning(
                "gemini attempt %d/%d unusable: %s", attempt, MAX_ATTEMPTS, type(e).__name__
            )
        # Exponential backoff with jitter: ~2s, ~4s.
        await asyncio.sleep(2**attempt + random.uniform(0, 1))  # noqa: S311 - jitter, not crypto

    criteria = {c: _to_score(getattr(judgement, c), script) for c in CRITERIA}
    unverified = [c for c, s in criteria.items() if not s.evidence_verified]
    if unverified:
        log.warning("no verbatim evidence found for %s", ", ".join(unverified))
    return RubricResult(
        model=model,
        criteria=criteria,
        overall_raw=overall_band([s.band for s in criteria.values()]),
    )


async def score_with_fallback(
    task_type: TaskType, prompt: str, script: str, *, client: genai.Client, models: list[str]
) -> RubricResult:
    """Free-tier models go down under load independently; try each in order before giving up."""
    last: RubricError | None = None
    for model in models:
        try:
            return await score_rubric(task_type, prompt, script, client=client, model=model)
        except RubricError as e:
            log.warning("model %s unavailable, trying next: %s", model, e)
            last = e
    raise last or RubricError("no models configured")
