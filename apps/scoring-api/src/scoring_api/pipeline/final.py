"""Stages 4-5 on top of the draft: calibrate, ensemble, cross-check."""

import time

from scoring_api.pipeline.draft import Scorer, draft_score, normalise
from scoring_api.pipeline.ensemble import (
    Bundle,
    final_band,
    needs_second_pass,
    predict_paths,
)
from scoring_api.pipeline.rubric import overall_band
from scoring_api.schemas import (
    CRITERIA,
    Criterion,
    DraftRequest,
    FinalCriterion,
    FinalResponse,
    OverallBand,
    PathValues,
    RubricResult,
)


def _bands(rubric: RubricResult) -> dict[Criterion, float]:
    return {c: float(rubric.criteria[c].band) for c in CRITERIA}


async def final_score(req: DraftRequest, scorer: Scorer, bundle: Bundle) -> FinalResponse:
    started = time.perf_counter()
    first = await draft_score(req, scorer)
    runs = [first.rubric]
    paths = predict_paths(bundle, first.features, req.task_type, [_bands(first.rubric)])
    second = needs_second_pass(paths)
    if second:
        # Don't average a disagreement away silently: get a second independent Gemini judgement.
        # Features are deterministic, so only the rubric is re-run.
        runs.append(await scorer(req.task_type, req.prompt, normalise(req.script)))
        paths = predict_paths(bundle, first.features, req.task_type, [_bands(r) for r in runs])

    criteria = {
        c: FinalCriterion(
            band=final_band(paths[c]),
            paths=PathValues(
                gemini=paths[c].gemini,
                calibrated=round(paths[c].calibrated, 2),
                deterministic=round(paths[c].deterministic, 2),
                ensemble=round(paths[c].ensemble, 2),
            ),
            evidence=[e for r in runs for e in r.criteria[c].evidence],
        )
        for c in CRITERIA
    }
    return FinalResponse(
        task_type=req.task_type,
        script=normalise(req.script),
        overall=OverallBand(
            band=overall_band([criteria[c].band for c in CRITERIA]),
        ),
        criteria=criteria,
        second_pass=second,
        gemini_models=sorted({r.model for r in runs}),
        calibration_version=bundle.version,
        features=first.features,
        latency_ms=round((time.perf_counter() - started) * 1000),
    )
