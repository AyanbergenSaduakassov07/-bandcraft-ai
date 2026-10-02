"""Fit stage 4-5 models on the Gold Set and benchmark them with leave-one-out cross-validation.

Runs in the `calibrate` GitHub Actions workflow (ADR-0003):

    python -m scoring_api.training.train --out artifacts/calibration/<version> \\
        --report docs/benchmarks/<version>.md

Inputs: tests/fixtures/gold/*.json (labels) and tests/fixtures/gold-raw/*.json (recorded runs).
"""

import argparse
import json
import logging
import os
import statistics
from dataclasses import dataclass
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

import numpy as np

from scoring_api.pipeline.calibration import make_calibrator
from scoring_api.pipeline.ensemble import (
    Bundle,
    Ridge,
    ensemble_row,
    feature_row,
    final_band,
    fit_lgb,
    predict_paths,
)
from scoring_api.pipeline.rubric import overall_band
from scoring_api.schemas import CRITERIA, Criterion, DraftResponse, FeatureVector, TaskType

log = logging.getLogger(__name__)
ROOT = Path(__file__).resolve().parents[3]
MIN_ESSAYS = 8


@dataclass(frozen=True)
class Reference:
    name: str
    mae: float | None
    within_half: float


# Published reference points (see docs/benchmarks/README.md for sources and caveats).
REFERENCES = [
    Reference("tolmachf/tolmachv1.0", mae=0.658, within_half=0.503),
    Reference("UpScore.ai (published)", mae=None, within_half=0.60),
]


@dataclass
class Row:
    id: str
    task_type: TaskType
    features: FeatureVector
    gemini_runs: list[dict[Criterion, float]]
    gold: dict[Criterion, float]
    gold_overall: float

    @property
    def gemini(self) -> dict[Criterion, float]:
        return {c: float(np.mean([r[c] for r in self.gemini_runs])) for c in CRITERIA}


def load_rows(gold_dir: Path, raw_dir: Path) -> list[Row]:
    rows = []
    for raw_path in sorted(raw_dir.glob("*.json")):
        raw = json.loads(raw_path.read_text())
        gold = json.loads((gold_dir / f"{raw['id']}.json").read_text())
        runs = [DraftResponse.model_validate(r) for r in raw["runs"]]
        rows.append(
            Row(
                id=raw["id"],
                task_type=gold["task_type"],
                features=runs[0].features,
                gemini_runs=[{c: float(r.rubric.criteria[c].band) for c in CRITERIA} for r in runs],
                gold={c: float(gold["gold"]["criteria"][c]) for c in CRITERIA},
                gold_overall=float(gold["gold"]["overall"]),
            )
        )
    return rows


def fit_models(rows: list[Row], calibrator: str, version: str) -> Bundle:
    x_det = np.asarray([feature_row(r.features, r.task_type) for r in rows])
    x_ens = np.asarray([ensemble_row(r.features, r.task_type, r.gemini) for r in rows])
    cals, ridges, boosters = {}, {}, {}
    for c in CRITERIA:
        y = np.asarray([r.gold[c] for r in rows])
        cals[c] = make_calibrator(calibrator).fit([r.gemini[c] for r in rows], y)
        ridges[c] = Ridge().fit(x_det, y)
        boosters[c] = fit_lgb(x_ens, y)
    return Bundle(
        version=version,
        calibrators=cals,
        deterministic=ridges,
        ensemble=boosters,
    )


def leave_one_out(rows: list[Row], calibrator: str) -> list[dict[str, Any]]:
    """Predict each Gold Script with models that never saw it: the only honest numbers at this n."""
    out = []
    for i, held in enumerate(rows):
        bundle = fit_models(rows[:i] + rows[i + 1 :], calibrator, "loo")
        paths = predict_paths(bundle, held.features, held.task_type, held.gemini_runs)
        out.append(
            {"row": held, "paths": paths, "final": {c: final_band(paths[c]) for c in CRITERIA}}
        )
    return out


def residuals(loo: list[dict[str, Any]]) -> dict[Criterion, float]:
    return {
        c: statistics.fmean(abs(p["final"][c] - p["row"].gold[c]) for p in loo) for c in CRITERIA
    }


def _within(errors: list[float]) -> float:
    return sum(abs(e) <= 0.5 for e in errors) / len(errors)


def benchmark(loo: list[dict[str, Any]], resid: dict[Criterion, float]) -> dict[str, Any]:
    raw_err, fin_err = [], []
    for p in loo:
        row = p["row"]
        raw_overall = overall_band([round(row.gemini[c]) for c in CRITERIA])
        fin_overall = overall_band([p["final"][c] for c in CRITERIA])
        raw_err.append(raw_overall - row.gold_overall)
        fin_err.append(fin_overall - row.gold_overall)
    return {
        "n": len(loo),
        "raw": {
            "mae": statistics.fmean(abs(e) for e in raw_err),
            "within_half": _within(raw_err),
            "bias": statistics.fmean(raw_err),
        },
        "final": {
            "mae": statistics.fmean(abs(e) for e in fin_err),
            "within_half": _within(fin_err),
            "bias": statistics.fmean(fin_err),
        },
        "per_criterion_mae": {
            c: {
                "raw": statistics.fmean(
                    abs(round(p["row"].gemini[c]) - p["row"].gold[c]) for p in loo
                ),
                "final": resid[c],
            }
            for c in CRITERIA
        },
        "second_pass_rate": sum(
            any(abs(p["paths"][c].ensemble - p["paths"][c].gemini_mean) > 1 for c in CRITERIA)
            for p in loo
        )
        / len(loo),
    }


def render_report(result: dict[str, Any], version: str, calibrator: str, models: list[str]) -> str:
    raw, fin = result["raw"], result["final"]
    lines = [
        f"# Benchmark {version}",
        "",
        "> **Read this first.** These numbers come from the BandCraft Gold Set:",
        f"> {result['n']} author-labelled synthetic essays, leave-one-out cross-validated.",
        "> The reference figures were measured by other teams on their own examiner-marked",
        "> test sets. Treat the comparison as a direction, not a ranking.",
        "",
        f"Calibrator: `{calibrator}` · Gemini models: {', '.join(models)} · n = {result['n']}",
        "",
        "## Overall band",
        "",
        "| System | MAE | Within ±0.5 band |",
        "|---|---|---|",
        f"| BandCraft final (calibrated + ensemble) | {fin['mae']:.3f} "
        f"| {fin['within_half']:.1%} |",
        f"| BandCraft raw Gemini (draft) | {raw['mae']:.3f} | {raw['within_half']:.1%} |",
    ]
    for ref in REFERENCES:
        mae = f"{ref.mae:.3f}" if ref.mae is not None else "not published"
        lines.append(f"| {ref.name} (their test set) | {mae} | {ref.within_half:.1%} |")
    lines += [
        "",
        f"Bias (mean signed error): final {fin['bias']:+.2f}, raw {raw['bias']:+.2f}.",
        "",
        f"A second Gemini pass would have run on {result['second_pass_rate']:.0%} of essays "
        "(ensemble and raw Gemini more than one band apart on some criterion).",
        "",
        "## Per criterion (MAE)",
        "",
        "| Criterion | Raw Gemini | Final |",
        "|---|---|---|",
    ]
    lines += [
        f"| {c} | {v['raw']:.2f} | {v['final']:.2f} |"
        for c, v in result["per_criterion_mae"].items()
    ]
    return "\n".join(lines) + "\n"


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--gold", type=Path, default=ROOT / "tests/fixtures/gold")
    parser.add_argument("--raw", type=Path, default=ROOT / "tests/fixtures/gold-raw")
    parser.add_argument("--calibrator", default="isotonic", choices=["isotonic", "linear"])
    parser.add_argument(
        "--version",
        default=f"{datetime.now(UTC):%Y%m%d}-{os.environ.get('GITHUB_RUN_ID', 'local')}",
    )
    parser.add_argument(
        "--out", type=Path, help="artifact directory (default artifacts/calibration/<version>)"
    )
    parser.add_argument(
        "--report", type=Path, help="benchmark markdown (default docs/benchmarks/<version>.md)"
    )
    args = parser.parse_args()
    logging.basicConfig(level=logging.INFO)

    rows = load_rows(args.gold, args.raw)
    if len(rows) < MIN_ESSAYS:
        raise SystemExit(
            f"only {len(rows)} Gold Scripts have recorded Gemini runs; need at least {MIN_ESSAYS}"
        )
    models = sorted(
        {
            r.model
            for p in args.raw.glob("*.json")
            for r in (
                DraftResponse.model_validate(x).rubric for x in json.loads(p.read_text())["runs"]
            )
        }
    )

    loo = leave_one_out(rows, args.calibrator)
    resid = residuals(loo)
    result = benchmark(loo, resid)
    bundle = fit_models(rows, args.calibrator, args.version)
    bundle.meta = {
        "trained_at": datetime.now(UTC).isoformat(timespec="seconds"),
        "n": len(rows),
        "calibrator": args.calibrator,
        "gemini_models": models,
        "benchmark": result,
    }

    out = args.out or ROOT / "artifacts/calibration" / args.version
    report = args.report or ROOT.parents[1] / "docs/benchmarks" / f"{args.version}.md"
    bundle.save(out)
    report.parent.mkdir(parents=True, exist_ok=True)
    report.write_text(render_report(result, args.version, args.calibrator, models))
    log.info(
        "saved %s and %s | final MAE %.3f, within ±0.5 %.1f%%",
        out,
        report,
        result["final"]["mae"],
        result["final"]["within_half"] * 100,
    )


if __name__ == "__main__":
    main()
