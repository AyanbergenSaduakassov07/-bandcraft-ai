"""Speaking scoring and session logic with Gemini, the endpoint and WebRTC all stubbed out."""

import asyncio
import io
import wave
from pathlib import Path
from typing import Any

import pytest

from speaking_api import assess as assess_mod
from speaking_api.assess import Endpoint, assess_part, joined, overall_band
from speaking_api.pronunciation import (
    Calibration,
    EndpointScore,
    blend,
    clips,
    pcm_to_wav,
    weighted_score,
)
from speaking_api.schemas import CRITERIA, PartResult
from speaking_api.scoring import (
    _Answer,
    _Evidence,
    _Judgement,
    _SpeakingJudgement,
    answers_of,
    evidence,
    locate,
)
from speaking_api.session import Session

RATE = 16_000
TRANSCRIPTS = ["I live in a flat near the river, um, with my sister.", "I study engineering."]


def pcm(seconds: float) -> bytes:
    return b"\x00\x01" * int(seconds * RATE)


def judgement(band: int = 6) -> _SpeakingJudgement:
    j = _Judgement(
        evidence=[_Evidence(quote="near the river", observation="x")], analysis="a", band=band
    )
    return _SpeakingJudgement(
        answers=[
            _Answer(question="q1", start_s=0.5, end_s=4.0, transcript=TRANSCRIPTS[0]),
            _Answer(question="q2", start_s=5.0, end_s=5.8, transcript=TRANSCRIPTS[1]),
        ],
        **dict.fromkeys(CRITERIA, j),
    )


def test_wav_and_clips_follow_gemini_timestamps() -> None:
    wav = pcm_to_wav(pcm(1.0), RATE)
    with wave.open(io.BytesIO(wav)) as w:
        assert (w.getframerate(), w.getnchannels(), w.getnframes()) == (RATE, 1, RATE)
    answers = answers_of(judgement())
    cut = clips(pcm(6.0), RATE, answers)
    assert [c.answer.transcript for c in cut] == [TRANSCRIPTS[0]]  # 0.8 s answer is too short
    with wave.open(io.BytesIO(cut[0].wav)) as w:
        assert w.getnframes() == int(3.5 * RATE)


def test_evidence_is_verified_against_the_transcript() -> None:
    transcript, offsets = joined(answers_of(judgement()))
    assert offsets == [0, len(TRANSCRIPTS[0]) + 2]
    [span] = evidence(judgement().fluency_coherence, transcript)
    assert span.verified and transcript[span.start : span.end] == "near the river"
    assert locate("NEAR   the river", transcript) is not None
    assert locate("not said", transcript) is None


def test_bands_blend_like_writing_and_round_like_ielts() -> None:
    assert blend(6.0, None) == 6 and blend(6.0, 7.0) == 7 and blend(5.0, 5.8) == 5
    assert overall_band([6, 6, 6, 7]) == 6.5 and overall_band([6, 7, 7, 7]) == 7.0
    assert overall_band([6, 6, 6, 6]) == 6.0
    clip = clips(pcm(10), RATE, answers_of(judgement()))[0]
    assert weighted_score([(clip, EndpointScore(80, [])), (clip, EndpointScore(60, []))]) == 70
    cal = Calibration("t", ([0, 9], [0, 10]), ([0, 100], [0, 10]))
    assert cal.gemini_band(9) == pytest.approx(9.0) and cal.openpronounce_band(50) == pytest.approx(
        4.5
    )


def test_assess_part_blends_both_paths_and_adds_phone_evidence(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    async def fake_judge(*args: Any) -> tuple[_SpeakingJudgement, str]:
        return judgement(band=6), "stub-model"

    async def fake_score(http: Any, url: str, token: str, clip: Any) -> EndpointScore:
        err = {"word": "river", "expected": "ɹɪvɚ", "actual": "lɪvɚ", "confidence": 0.9}
        return EndpointScore(score=90.0, errors=[err])

    monkeypatch.setattr(assess_mod, "judge", fake_judge)
    monkeypatch.setattr(assess_mod, "score_clip", fake_score)
    result = asyncio.run(
        assess_part(None, pcm(6), RATE, "part1", ["q1"], Endpoint("https://x", "t"), None)  # type: ignore[arg-type]
    )
    paths = result.pronunciation_paths
    assert paths.gemini == 6 and paths.openpronounce == pytest.approx(8.1) and not paths.calibrated
    assert result.criteria["pronunciation"].band == 7  # mean of 6 and 8.1, rounded half up
    phone = [e for e in result.criteria["pronunciation"].evidence if e.source == "openpronounce"]
    assert phone and result.transcript[phone[0].start : phone[0].end] == "river"

    monkeypatch.setattr(assess_mod, "endpoint_scores", lambda *a: asyncio.sleep(0, result=[]))
    alone = asyncio.run(assess_part(None, pcm(6), RATE, "part1", ["q1"], None, None))  # type: ignore[arg-type]
    assert alone.pronunciation_paths.openpronounce is None
    assert alone.criteria["pronunciation"].band == 6


class FakeRecorder:
    def __init__(self, session: Session) -> None:
        self.session = session
        self.log: list[str] = []

    async def start_recording(self) -> None:
        self.log.append("start")

    async def stop_recording(self) -> None:
        self.log.append("stop")
        await self.session.on_track(pcm(1), RATE)


def test_session_scores_each_part_as_it_ends() -> None:
    scored: list[tuple[str, int]] = []

    async def fake_assess(audio: bytes, rate: int, part: str, questions: list[str]) -> PartResult:
        scored.append((part, len(questions)))
        raise RuntimeError("quota")  # a failed Part is recorded, not fatal

    async def run() -> Session:
        session = Session(id="s", assess=fake_assess)
        session.recorder = rec = FakeRecorder(session)
        await session.next_part("part2")
        await session.next_part("part3")
        await session.next_part(None)
        await asyncio.gather(*session.tasks)
        assert rec.log == ["stop", "start", "stop", "start", "stop"]
        return session

    session = asyncio.run(run())
    assert [p for p, _ in scored] == ["part1", "part2", "part3"]
    assert scored[0][1] == 8 and scored[1][1] == 1 and scored[2][1] == 4
    assert session.errors == dict.fromkeys(["part1", "part2", "part3"], "quota")


def test_no_model_runs_in_process() -> None:
    """ADR-0005: turn-taking is Gemini Live's; no local VAD or turn model in the pipeline."""
    source = (Path(__file__).parents[1] / "src/speaking_api/bot.py").read_text()
    for banned in ("silero", "SmartTurn", "vad_analyzer", "turn_analyzer", "torch", "onnx"):
        assert banned.lower() not in source.lower(), banned
