"""The second Pronunciation estimate: OpenPronounce on a hosted endpoint, called over HTTPS.

Nothing here loads a model. Each answer is cut from the candidate's audio by Gemini's timestamps
and scored against Gemini's transcript of it (what the candidate meant to say). Calibration maps
both estimates onto speechocean762's 0-10 scale, then to the band scale (ADR-0005).
"""

import io
import json
import logging
import wave
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import httpx
import numpy as np

from speaking_api.schemas import Answer

log = logging.getLogger(__name__)
ARTIFACT = Path(__file__).resolve().parents[2] / "artifacts" / "pronunciation-calibration.json"
TIMEOUT_S = 180.0  # the free Space sleeps when idle; the first call wakes it
MIN_CLIP_S, MAX_CLIP_S = 1.5, 40.0
BAND_PER_POINT = 0.9  # speechocean762 0-10 -> band 0-9: an assumption until examiner data exists


@dataclass
class Clip:
    answer: Answer
    wav: bytes

    @property
    def seconds(self) -> float:
        return self.answer.end_s - self.answer.start_s


@dataclass
class EndpointScore:
    score: float  # OpenPronounce 0-100
    errors: list[dict[str, Any]]


def pcm_to_wav(pcm: bytes, sample_rate: int) -> bytes:
    """16-bit mono PCM -> WAV bytes."""
    buf = io.BytesIO()
    with wave.open(buf, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(sample_rate)
        w.writeframes(pcm)
    return buf.getvalue()


def clips(pcm: bytes, sample_rate: int, answers: list[Answer]) -> list[Clip]:
    """One WAV per answer long enough to judge, capped so a free CPU Space can keep up."""
    out = []
    samples = len(pcm) // 2
    for a in answers:
        if a.end_s - a.start_s < MIN_CLIP_S:
            continue
        start = min(samples, int(a.start_s * sample_rate))
        end = min(samples, int(min(a.end_s, a.start_s + MAX_CLIP_S) * sample_rate))
        if end > start:
            out.append(Clip(a, pcm_to_wav(pcm[start * 2 : end * 2], sample_rate)))
    return out


async def score_clip(http: httpx.AsyncClient, url: str, token: str, clip: Clip) -> EndpointScore:
    response = await http.post(
        f"{url.rstrip('/')}/pronunciation",
        files={"file": ("answer.wav", clip.wav, "audio/wav")},
        data={"expected_text": clip.answer.transcript},
        headers={"Authorization": f"Bearer {token}"},
        timeout=TIMEOUT_S,
    )
    response.raise_for_status()
    body = response.json()
    return EndpointScore(score=float(body["score"]), errors=list(body.get("errors", [])))


def weighted_score(results: list[tuple[Clip, EndpointScore]]) -> float | None:
    """Duration-weighted mean, so a long answer counts more than a one-word one."""
    total = sum(c.seconds for c, _ in results)
    if not total:
        return None
    return sum(c.seconds * s.score for c, s in results) / total


@dataclass
class Calibration:
    version: str
    gemini: tuple[list[float], list[float]]  # isotonic knots: band -> speechocean762 total
    openpronounce: tuple[list[float], list[float]]  # isotonic knots: 0-100 -> total

    @staticmethod
    def _band(knots: tuple[list[float], list[float]], value: float) -> float:
        total = float(np.interp(value, knots[0], knots[1]))
        return min(9.0, max(0.0, total * BAND_PER_POINT))

    def gemini_band(self, band: float) -> float:
        return self._band(self.gemini, band)

    def openpronounce_band(self, score: float) -> float:
        return self._band(self.openpronounce, score)


def load_calibration(path: Path = ARTIFACT) -> Calibration | None:
    if not path.exists():
        return None
    data = json.loads(path.read_text())
    knots = {k: (data[k]["x"], data[k]["y"]) for k in ("gemini", "openpronounce")}
    return Calibration(data["version"], knots["gemini"], knots["openpronounce"])


def blend(gemini: float, openpronounce: float | None) -> int:
    """Same rule as the Writing band: the mean of the two estimates, rounded half up."""
    value = gemini if openpronounce is None else (gemini + openpronounce) / 2
    return int(min(9, max(0, np.floor(value + 0.5))))
