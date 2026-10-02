"""Endpoint and stage-3 helpers, with Gemini stubbed out."""

import asyncio

import httpx
import pytest
from conftest import gold_by_id
from fastapi.testclient import TestClient

from scoring_api.main import app, get_scorer
from scoring_api.pipeline import rubric
from scoring_api.pipeline.rubric import (
    _Evidence,
    _Judgement,
    _RubricJudgement,
    _to_score,
    locate,
    overall_band,
)
from scoring_api.schemas import CRITERIA, CriterionScore, EvidenceSpan, RubricResult, TaskType


def test_overall_band_rounding_rule() -> None:
    assert overall_band([6, 6, 6, 6]) == 6.0
    assert overall_band([6, 6, 6, 7]) == 6.5  # 6.25 -> 6.5
    assert overall_band([6, 6, 7, 7]) == 6.5
    assert overall_band([6, 7, 7, 7]) == 7.0  # 6.75 -> 7.0
    assert overall_band([4, 4, 4, 5]) == 4.5


def test_locate_tolerates_whitespace_quotes_and_elision() -> None:
    script = "The table shows  data.\nPoland's rate was 90%, the highest."
    assert locate("table shows data", script) == (4, 21)
    assert locate("Poland’s rate", script) is not None
    assert locate("The table … the highest", script) is not None
    assert locate("not in the script", script) is None


def test_unverified_quotes_are_flagged_and_bands_clamped() -> None:
    judgement = _Judgement(
        evidence=[_Evidence(quote="invented text", observation="x")], analysis="a", band=11
    )
    score = _to_score(judgement, "Some real script.")
    assert score.band == 9
    assert not score.evidence_verified and score.evidence[0].start is None


async def _stub_scorer(task_type: TaskType, prompt: str, script: str) -> RubricResult:
    await asyncio.sleep(0)
    quote = script.split(".")[0]
    score = CriterionScore(
        band=6,
        analysis="stub",
        evidence=[
            EvidenceSpan(quote=quote, observation="stub", start=0, end=len(quote), verified=True)
        ],
        evidence_verified=True,
    )
    return RubricResult(model="stub", criteria=dict.fromkeys(CRITERIA, score), overall_raw=6.0)


def test_score_draft_returns_features_and_rubric() -> None:
    app.dependency_overrides[get_scorer] = lambda: _stub_scorer
    try:
        essay = gold_by_id("t2-cities-b6.0")
        body = {
            "task_type": essay["task_type"],
            "prompt": essay["prompt"],
            "script": essay["script"],
        }
        response = TestClient(app).post("/score/draft", json=body)
    finally:
        app.dependency_overrides.clear()
    assert response.status_code == 200
    data = response.json()
    assert data["features"]["word_count"] > 250
    assert set(data["rubric"]["criteria"]) == set(CRITERIA)
    assert data["rubric"]["overall_raw"] == 6.0


def test_score_draft_rejects_empty_script() -> None:
    app.dependency_overrides[get_scorer] = lambda: _stub_scorer
    try:
        response = TestClient(app).post(
            "/score/draft", json={"task_type": "task2", "prompt": "p", "script": ""}
        )
    finally:
        app.dependency_overrides.clear()
    assert response.status_code == 422


def test_dropped_connection_is_retried(monkeypatch: pytest.MonkeyPatch) -> None:
    """A free-tier connection reset mid-generation is retried, not surfaced as a 500."""
    judgement = _Judgement(
        evidence=[_Evidence(quote="Some", observation="x")], analysis="a", band=6
    )
    calls: list[int] = []

    async def flaky(client: object, model: str, contents: str) -> _RubricJudgement:
        calls.append(1)
        if len(calls) == 1:
            raise httpx.ReadError("connection reset")
        return _RubricJudgement(**dict.fromkeys(CRITERIA, judgement))

    monkeypatch.setattr(rubric, "_call", flaky)
    real_sleep = asyncio.sleep
    monkeypatch.setattr(asyncio, "sleep", lambda s: real_sleep(0))  # skip the backoff wait
    result = asyncio.run(
        rubric.score_rubric("task2", "P", "Some script.", client=None, model="m")  # type: ignore[arg-type]
    )
    assert len(calls) == 2 and result.criteria["lexical_resource"].band == 6
