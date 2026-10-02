"""One Part's result: Gemini's evidence-first judgement plus the hosted pronunciation estimate."""

import asyncio
import logging
import math
from dataclasses import dataclass

import httpx
from google import genai

from speaking_api.pronunciation import (
    Calibration,
    Clip,
    EndpointScore,
    blend,
    clips,
    pcm_to_wav,
    score_clip,
    weighted_score,
)
from speaking_api.schemas import (
    CRITERIA,
    Answer,
    CriterionResult,
    EvidenceSpan,
    Part,
    PartResult,
    PronunciationPaths,
)
from speaking_api.scoring import answers_of, clamp_band, evidence, judge, locate

log = logging.getLogger(__name__)


@dataclass
class Endpoint:
    url: str
    token: str


def overall_band(bands: list[int]) -> float:
    """IELTS rounding of the mean: .25 rounds up to .5, .75 up to the next whole band."""
    mean = sum(bands) / len(bands)
    whole, frac = math.floor(mean), mean - math.floor(mean)
    return whole + (0.0 if frac < 0.25 else 0.5 if frac < 0.75 else 1.0)


def joined(answers: list[Answer]) -> tuple[str, list[int]]:
    """All answers as one transcript, with each answer's start offset in it."""
    offsets, parts, at = [], [], 0
    for a in answers:
        offsets.append(at)
        parts.append(a.transcript)
        at += len(a.transcript) + 2
    return "\n\n".join(parts), offsets


async def endpoint_scores(
    endpoint: Endpoint | None, parts: list[Clip]
) -> list[tuple[Clip, EndpointScore]]:
    """Every clip scored on the hosted endpoint; [] if it's not configured or doesn't answer."""
    if endpoint is None or not parts:
        return []
    try:
        async with httpx.AsyncClient() as http:
            scores = await asyncio.gather(
                *(score_clip(http, endpoint.url, endpoint.token, c) for c in parts)
            )
    except (httpx.HTTPError, KeyError, ValueError) as e:
        log.warning("pronunciation endpoint unavailable: %r", e)
        return []
    return list(zip(parts, scores, strict=True))


def phone_evidence(
    results: list[tuple[Clip, EndpointScore]], answers: list[Answer], offsets: list[int]
) -> list[EvidenceSpan]:
    spans = []
    for clip, score in results:
        base = offsets[answers.index(clip.answer)]
        for err in score.errors:
            word = str(err.get("word") or "")
            at = locate(word, clip.answer.transcript)
            heard = err.get("actual") or "nothing"
            spans.append(
                EvidenceSpan(
                    quote=word,
                    observation=f"Expected /{err.get('expected')}/, heard /{heard}/.",
                    start=base + at[0] if at else None,
                    end=base + at[1] if at else None,
                    verified=at is not None,
                    source="openpronounce",
                )
            )
    return spans


async def assess_part(
    client: genai.Client,
    pcm: bytes,
    sample_rate: int,
    part: Part,
    questions: list[str],
    endpoint: Endpoint | None,
    calibration: Calibration | None,
) -> PartResult:
    judgement, model = await judge(client, pcm_to_wav(pcm, sample_rate), part, questions)
    answers = answers_of(judgement)
    transcript, offsets = joined(answers)
    criteria = {
        c: CriterionResult(
            band=clamp_band(getattr(judgement, c).band),
            evidence=evidence(getattr(judgement, c), transcript),
        )
        for c in CRITERIA
    }
    results = await endpoint_scores(endpoint, clips(pcm, sample_rate, answers))
    raw = weighted_score(results)
    gemini_band = float(criteria["pronunciation"].band)
    if calibration:
        g = calibration.gemini_band(gemini_band)
        o = calibration.openpronounce_band(raw) if raw is not None else None
    else:  # uncalibrated: Gemini's band as given, OpenPronounce's 0-100 scaled to 0-9
        g, o = gemini_band, (raw * 9 / 100 if raw is not None else None)
    criteria["pronunciation"] = CriterionResult(
        band=blend(g, o),
        evidence=criteria["pronunciation"].evidence + phone_evidence(results, answers, offsets),
    )
    return PartResult(
        part=part,
        transcript=transcript,
        answers=answers,
        criteria=criteria,
        overall=overall_band([criteria[c].band for c in CRITERIA]),
        pronunciation_paths=PronunciationPaths(
            gemini=round(g, 2),
            openpronounce=round(o, 2) if o is not None else None,
            openpronounce_raw=round(raw, 1) if raw is not None else None,
            calibrated=calibration is not None,
        ),
        gemini_model=model,
        calibration_version=calibration.version if calibration else None,
    )
