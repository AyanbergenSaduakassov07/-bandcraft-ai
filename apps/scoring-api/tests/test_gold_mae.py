"""Raw (uncalibrated) accuracy on the gold set. Calls Gemini for real, so it's opt-in:

    uv run pytest -m gemini

Writes reports/gold-mae.json and logs a per-essay table plus MAE. Every accuracy claim in this
project should cite a run of this test (model + prompt version + date are in the report).
"""

import asyncio
import json
import logging
import os
import statistics
from datetime import UTC, datetime
from functools import partial
from pathlib import Path
from typing import Any

import pytest
from conftest import load_gold
from google import genai

from scoring_api.main import scoring_models
from scoring_api.pipeline.draft import draft_score
from scoring_api.pipeline.prompts import PROMPT_VERSION
from scoring_api.pipeline.rubric import RubricError, score_with_fallback
from scoring_api.schemas import CRITERIA, DraftRequest, DraftResponse

log = logging.getLogger(__name__)
REPORT = Path(__file__).parents[1] / "reports" / "gold-mae.json"
CONCURRENCY = 1  # free tier rate limits
ROUNDS = 3
ROUND_PAUSE_S = 45
MIN_SCORED = 15
UNCALIBRATED_MAE_CEILING = 1.5  # regression guard, not a quality target

pytestmark = [
    pytest.mark.gemini,
    pytest.mark.skipif(not os.environ.get("GEMINI_API_KEY"), reason="GEMINI_API_KEY not set"),
]


Scored = list[tuple[dict[str, Any], DraftResponse]]


async def _score_all(models: list[str]) -> tuple[Scored, list[str]]:
    """Score every Gold Script; failures retry in later rounds so a demand spike can't sink it."""
    client = genai.Client(api_key=os.environ["GEMINI_API_KEY"])
    scorer = partial(score_with_fallback, client=client, models=models)
    gate = asyncio.Semaphore(CONCURRENCY)
    done: dict[str, tuple[dict[str, Any], DraftResponse]] = {}

    async def one(essay: dict[str, Any]) -> None:
        async with gate:
            req = DraftRequest(
                task_type=essay["task_type"], prompt=essay["prompt"], script=essay["script"]
            )
            try:
                done[essay["id"]] = (essay, await draft_score(req, scorer))
            except RubricError as e:
                log.warning("round failed for %s: %s", essay["id"], e)

    pending = load_gold()
    for round_ in range(ROUNDS):
        await asyncio.gather(*(one(e) for e in pending))
        pending = [e for e in pending if e["id"] not in done]
        if not pending:
            break
        log.warning("round %d: %d essays unscored, pausing before retry", round_ + 1, len(pending))
        await asyncio.sleep(ROUND_PAUSE_S)
    return list(done.values()), [e["id"] for e in pending]


def _report(
    results: list[tuple[dict[str, Any], DraftResponse]], models: list[str]
) -> dict[str, Any]:
    rows = []
    for essay, res in results:
        gold, raw = essay["gold"], res.rubric
        rows.append(
            {
                "id": essay["id"],
                "gold_overall": gold["overall"],
                "raw_overall": raw.overall_raw,
                "criteria": {
                    c: {"gold": gold["criteria"][c], "raw": raw.criteria[c].band} for c in CRITERIA
                },
                "model": raw.model,
                "unverified_evidence": sum(
                    not s.verified for c in CRITERIA for s in raw.criteria[c].evidence
                ),
            }
        )
    errors = [r["raw_overall"] - r["gold_overall"] for r in rows]
    per_criterion = {
        c: {
            "mae": round(
                statistics.fmean(
                    abs(r["criteria"][c]["raw"] - r["criteria"][c]["gold"]) for r in rows
                ),
                3,
            ),
            "bias": round(
                statistics.fmean(r["criteria"][c]["raw"] - r["criteria"][c]["gold"] for r in rows),
                3,
            ),
        }
        for c in CRITERIA
    }
    return {
        "run_at": datetime.now(UTC).isoformat(timespec="seconds"),
        "models_tried": models,
        "prompt_version": PROMPT_VERSION,
        "gold_size": len(rows),
        "gold_provenance": "author-labelled synthetic essays; not examiner-verified",
        "overall": {
            "mae": round(statistics.fmean(abs(e) for e in errors), 3),
            "bias": round(statistics.fmean(errors), 3),
            "within_half_band": round(sum(abs(e) <= 0.5 for e in errors) / len(errors), 3),
        },
        "per_criterion": per_criterion,
        "essays": rows,
    }


def test_gold_set_raw_mae() -> None:
    models = scoring_models()
    results, unscored = asyncio.run(_score_all(models))
    report = _report(results, models)
    report["unscored"] = unscored
    REPORT.parent.mkdir(exist_ok=True)
    REPORT.write_text(json.dumps(report, indent=2) + "\n")

    for r in report["essays"]:
        log.info(
            "%-24s gold %.1f  raw %.1f  %+.1f",
            r["id"],
            r["gold_overall"],
            r["raw_overall"],
            r["raw_overall"] - r["gold_overall"],
        )
    for c, m in report["per_criterion"].items():
        log.info("%-28s MAE %.2f  bias %+.2f", c, m["mae"], m["bias"])
    o = report["overall"]
    log.info(
        "OVERALL raw MAE %.3f | bias %+.2f | within 0.5: %.0f%% | n=%d | %s",
        o["mae"],
        o["bias"],
        o["within_half_band"] * 100,
        report["gold_size"],
        ",".join(models),
    )

    scored = report["gold_size"]
    assert scored >= MIN_SCORED, f"only {scored} scored; unscored: {unscored}"
    assert o["mae"] <= UNCALIBRATED_MAE_CEILING
