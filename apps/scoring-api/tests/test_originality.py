"""The fifth path: originality. TOY 4-dim vectors and a stub index; no Gemini, no database."""

import asyncio
from dataclasses import replace
from functools import partial
from pathlib import Path

import numpy as np
import pytest
from fastapi.testclient import TestClient
from test_final import _req, _stub_scorer, toy_bundle

from scoring_api import main
from scoring_api.pipeline.draft import normalise
from scoring_api.pipeline.ensemble import Bundle, Logistic, OriginalityModel, predict_originality
from scoring_api.pipeline.final import final_score
from scoring_api.pipeline.originality import Checker, Match, assess, safe_check
from scoring_api.schemas import OriginalityCheck
from scoring_api.training.originality import essay_similarity, fit, render

FRAME = "In this day and age"
SCRIPT = normalise(
    f"{FRAME}, many people argue about cities. This essay will discuss both views.\n\n"
    "My grandmother moved to Almaty in 1971 and still talks about the apple orchards.\n\n"
    f"{FRAME}, in conclusion, both sides have merits."
)
MODEL = OriginalityModel(
    embedding_model="toy",
    classifier=Logistic(coef=[4.0, -4.0, 0.0, 0.0], intercept=0.0),
    classifier_platt=Logistic(coef=[1.0], intercept=0.0),
    embedding_platt=Logistic(coef=[20.0], intercept=-16.0),  # 0.5 at similarity 0.8
)


async def _embed(texts: list[str]) -> list[list[float]]:
    return [[1.0, 0.0, 0.0, 0.0] if FRAME in t else [0.0, 1.0, 0.0, 0.0] for t in texts]


async def _index(vectors: list[list[float]]) -> list[Match]:
    return [
        Match(i, "t-001", "cities", "stock passage", 0.95 if v[0] else 0.3)
        for i, v in enumerate(vectors)
    ]


def _check() -> Checker:
    return partial(assess, embed=_embed, index=_index, model=MODEL)


def test_paths_are_calibrated_and_blended_like_final_band() -> None:
    paths = predict_originality(MODEL, [1.0, 0.0, 0.0, 0.0], [0.95, 0.3])
    assert paths.similarity == 0.95
    assert paths.embedding == pytest.approx(1 / (1 + np.exp(-(20 * 0.95 - 16))))
    assert paths.blended == pytest.approx((paths.embedding + paths.classifier) / 2)
    assert MODEL.passage_threshold == pytest.approx(0.8)
    assert replace(MODEL, embedding_platt=Logistic([-1.0], 0.0)).passage_threshold == 1.0


def test_assess_quotes_only_the_templated_passages_with_offsets() -> None:
    check, vector = asyncio.run(assess(SCRIPT, embed=_embed, index=_index, model=MODEL))
    assert check.template_heavy and vector == [1.0, 0.0, 0.0, 0.0]
    assert [e.quote.startswith(FRAME) for e in check.evidence] == [True, True]
    for e in check.evidence:
        assert e.verified and e.start is not None and SCRIPT[e.start : e.end] == e.quote
    assert check.paths.similarity == 0.95


def test_failed_check_never_blocks_scoring() -> None:
    async def broken(script: str) -> tuple[OriginalityCheck, list[float]]:
        raise TimeoutError

    assert asyncio.run(safe_check(broken, SCRIPT)) == (None, None)


def test_final_score_attaches_originality_for_task2_only() -> None:
    req = _req()
    result = asyncio.run(final_score(req, _stub_scorer(6, []), toy_bundle(), _check()))
    assert req.task_type == "task2"
    assert result.originality is not None and result.embedding is not None
    t1 = req.model_copy(update={"task_type": "task1_general"})
    other = asyncio.run(final_score(t1, _stub_scorer(6, []), toy_bundle(), _check()))
    assert other.originality is None and other.embedding is None


def test_bundle_round_trips_the_originality_artifact(tmp_path: Path) -> None:
    bundle = replace(toy_bundle(), originality=MODEL)
    bundle.save(tmp_path)
    loaded = Bundle.load(tmp_path)
    assert loaded.originality is not None
    assert loaded.originality.to_dict() == MODEL.to_dict()
    (tmp_path / "originality.json").unlink()
    assert Bundle.load(tmp_path).originality is None  # older artifacts still load


def test_originality_endpoint_is_null_outside_task2() -> None:
    client = TestClient(main.app)
    main.app.dependency_overrides[main.get_checker] = _check
    try:
        body = {"task_type": "task1_general", "prompt": "P", "script": SCRIPT}
        assert client.post("/originality", json=body).json() is None
        task2 = client.post("/originality", json={**body, "task_type": "task2"}).json()
    finally:
        main.app.dependency_overrides.clear()
    assert task2["template_heavy"] and len(task2["evidence"]) == 2


def test_fit_separates_toy_classes_and_excludes_own_passages() -> None:
    passages = np.asarray([[1.0, 0.0], [0.0, 1.0]])
    assert essay_similarity(passages[:1], passages, ["a", "b"], own_id="a") == pytest.approx(0.0)
    assert essay_similarity(passages[:1], passages, ["a", "b"]) == pytest.approx(1.0)

    rng = np.random.default_rng(0)
    templated = rng.normal([1, 0, 0, 0], 0.1, (12, 4))
    organic = rng.normal([0, 1, 0, 0], 0.1, (6, 4))
    vectors = np.vstack([templated, organic])
    sims = np.r_[rng.uniform(0.85, 0.95, 12), rng.uniform(0.4, 0.6, 6)]
    labels = np.r_[np.ones(12), np.zeros(6)]
    model, report = fit(vectors, sims, labels, "toy")
    assert report["n_organic"] == 6 and report["n_templated"] == 12
    assert report["paths"]["blended"]["templated_caught"] == 1.0
    assert 0.6 < model.passage_threshold < 0.85
    assert "Read this first" in render(report, "test")
