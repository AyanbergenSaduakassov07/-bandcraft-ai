"""Stages 4-5: calibration, ensemble, second pass, /score/final.

Gemini bands here are TOY values (gold ± a fixed pattern) to exercise the code paths.
They are never used for accuracy claims; real runs live in tests/fixtures/gold-raw and are
fitted in CI (ADR-0003).
"""

import asyncio
from functools import cache
from pathlib import Path

import pytest
from conftest import load_gold
from fastapi.testclient import TestClient

from scoring_api import main
from scoring_api.pipeline.calibration import (
    IsotonicCalibrator,
    LinearCalibrator,
    calibrator_from_dict,
)
from scoring_api.pipeline.draft import normalise
from scoring_api.pipeline.ensemble import Bundle, Paths, needs_second_pass
from scoring_api.pipeline.features import extract_features
from scoring_api.pipeline.final import final_score
from scoring_api.schemas import CRITERIA, CriterionScore, DraftRequest, RubricResult, TaskType
from scoring_api.training.train import (
    Row,
    benchmark,
    fit_models,
    leave_one_out,
    render_report,
    residuals,
)

OFFSETS = [1, 0, -1, 1, 0, 2]  # toy Gemini error pattern


@cache
def toy_rows() -> tuple[Row, ...]:
    rows = []
    for i, e in enumerate(load_gold()):
        gold = {c: float(e["gold"]["criteria"][c]) for c in CRITERIA}
        toy = {
            c: min(9.0, max(0.0, gold[c] + OFFSETS[(i + j) % len(OFFSETS)]))
            for j, c in enumerate(CRITERIA)
        }
        rows.append(
            Row(
                id=e["id"],
                task_type=e["task_type"],
                features=extract_features(normalise(e["script"]), e["task_type"]),
                gemini_runs=[toy],
                gold=gold,
                gold_overall=float(e["gold"]["overall"]),
            )
        )
    return tuple(rows)


@cache
def toy_bundle() -> Bundle:
    return fit_models(list(toy_rows()), "isotonic", "test")


def test_isotonic_corrects_scale_and_round_trips() -> None:
    cal = IsotonicCalibrator().fit([5, 6, 7, 8], [4, 5, 6, 7])
    assert cal.predict([6])[0] == pytest.approx(5)
    assert cal.predict([12])[0] <= 9  # clipped to the band scale
    again = calibrator_from_dict(cal.to_dict())
    assert again.predict([5.5, 7.5]).tolist() == cal.predict([5.5, 7.5]).tolist()


def test_linear_handles_constant_raw_band() -> None:
    cal = LinearCalibrator().fit([7, 7, 7], [6, 6, 7])
    assert cal.predict([7])[0] == pytest.approx(6.333, abs=0.01)


def test_second_pass_trigger_threshold() -> None:
    near = {c: Paths([6.0], 6.0, 6.0, 6.8) for c in CRITERIA}
    far = {**near, "lexical_resource": Paths([8.0], 6.0, 6.0, 6.5)}
    assert not needs_second_pass(near)
    assert needs_second_pass(far)


def test_bundle_save_load_predicts_identically(tmp_path: Path) -> None:
    bundle = toy_bundle()
    bundle.save(tmp_path)
    loaded = Bundle.load(tmp_path)
    row = toy_rows()[0]
    from scoring_api.pipeline.ensemble import predict_paths

    a = predict_paths(bundle, row.features, row.task_type, row.gemini_runs)
    b = predict_paths(loaded, row.features, row.task_type, row.gemini_runs)
    assert {c: vars(a[c]) for c in CRITERIA} == {c: vars(b[c]) for c in CRITERIA}


def _stub_scorer(band: int, calls: list[int]):  # type: ignore[no-untyped-def]
    async def scorer(task_type: TaskType, prompt: str, script: str) -> RubricResult:
        calls.append(band)
        await asyncio.sleep(0)
        score = CriterionScore(band=band, analysis="stub", evidence=[], evidence_verified=False)
        return RubricResult(model="stub", criteria=dict.fromkeys(CRITERIA, score), overall_raw=band)

    return scorer


def _req(essay_id: str = "t2-cities-b6.0") -> DraftRequest:
    e = next(g for g in load_gold() if g["id"] == essay_id)
    return DraftRequest(task_type=e["task_type"], prompt=e["prompt"], script=e["script"])


def test_final_score_runs_second_pass_on_big_disagreement() -> None:
    calls: list[int] = []
    result = asyncio.run(final_score(_req(), _stub_scorer(9, calls), toy_bundle()))
    assert result.second_pass and len(calls) == 2
    assert all(len(result.criteria[c].paths.gemini) == 2 for c in CRITERIA)
    assert 0 <= result.overall.band <= 9
    assert "margin" not in result.model_dump()["overall"]


def test_score_final_endpoint_and_missing_calibration(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    client = TestClient(main.app)
    body = _req().model_dump()
    main.app.dependency_overrides[main.get_scorer] = lambda: _stub_scorer(6, [])
    main.app.dependency_overrides[main.get_bundle] = toy_bundle
    try:
        ok = client.post("/score/final", json=body)
    finally:
        main.app.dependency_overrides.clear()
    assert ok.status_code == 200
    data = ok.json()
    assert set(data["criteria"]) == set(CRITERIA) and data["calibration_version"] == "test"
    assert data["script"] == normalise(body["script"])  # evidence offsets index into this

    monkeypatch.setattr(main, "ARTIFACTS", tmp_path)
    monkeypatch.delenv("CALIBRATION_DIR", raising=False)
    main.get_bundle.cache_clear()
    main.app.dependency_overrides[main.get_scorer] = lambda: _stub_scorer(6, [])
    try:
        missing = client.post("/score/final", json=body)
    finally:
        main.app.dependency_overrides.clear()
        main.get_bundle.cache_clear()
    assert missing.status_code == 503


def test_leave_one_out_benchmark_and_report() -> None:
    rows = list(toy_rows())
    loo = leave_one_out(rows, "isotonic")
    result = benchmark(loo, residuals(loo))
    assert result["n"] == len(rows)
    assert 0 <= result["final"]["within_half"] <= 1
    report = render_report(result, "test", "isotonic", ["toy"])
    assert "Read this first" in report
    assert "tolmachf/tolmachv1.0" in report and "UpScore.ai" in report
