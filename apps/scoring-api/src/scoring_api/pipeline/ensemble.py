"""Stage 5: ensemble and cross-check.

Four paths per criterion: raw Gemini, calibrated Gemini (stage 4), a deterministic ridge model over
Features only, and a LightGBM ensemble over Features + all four Gemini bands. The final band blends
calibrated and ensemble. The paths are returned too, so a band is never a black box.
"""

import json
import math
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

import lightgbm as lgb
import numpy as np

from scoring_api.pipeline.calibration import Calibrator, calibrator_from_dict
from scoring_api.schemas import CRITERIA, Criterion, FeatureVector, TaskType

FEATURE_COLUMNS = [
    "word_count",
    "paragraph_count",
    "mean_paragraph_words",
    "sentence_count",
    "mean_sentence_words",
    "sentence_length_variance",
    "subordinate_clause_rate",
    "type_token_ratio",
    "mattr",
    "cohesion_marker_count",
    "cohesion_markers_per_100_words",
    "distinct_cohesion_markers",
    "top_cohesion_marker_share",
    "spelling_error_count",
    "grammar_issue_count",
    "errors_per_100_words",
]
TASK_TYPES: list[TaskType] = ["task1_academic", "task1_general", "task2"]
DISAGREEMENT_TRIGGER = 1.0  # bands between ensemble and raw Gemini before a second Gemini pass

LGB_PARAMS: dict[str, Any] = {
    "objective": "regression_l1",
    "learning_rate": 0.05,
    "num_leaves": 4,
    "min_data_in_leaf": 2,
    "min_data_in_bin": 1,
    "feature_fraction": 0.8,
    "verbose": -1,
    "seed": 7,
    "deterministic": True,
}
LGB_ROUNDS = 150


def feature_row(features: FeatureVector, task_type: TaskType) -> list[float]:
    """Deterministic inputs only: Feature values, word-floor ratio, and a task-type one-hot."""
    values = [float(getattr(features, c)) for c in FEATURE_COLUMNS]
    values.append(features.word_count / features.word_floor)
    values.extend(1.0 if task_type == t else 0.0 for t in TASK_TYPES)
    return values


def ensemble_row(
    features: FeatureVector, task_type: TaskType, gemini: dict[Criterion, float]
) -> list[float]:
    return feature_row(features, task_type) + [gemini[c] for c in CRITERIA]


@dataclass
class Ridge:
    """Closed-form ridge over standardised inputs. Tiny, dependency-free, JSON-serialisable."""

    mean: list[float] = field(default_factory=list)
    std: list[float] = field(default_factory=list)
    coef: list[float] = field(default_factory=list)
    intercept: float = 0.0

    def fit(self, x: np.ndarray, y: np.ndarray, alpha: float = 3.0) -> "Ridge":
        mean, std = x.mean(axis=0), x.std(axis=0)
        std[std == 0] = 1.0
        z = (x - mean) / std
        coef = np.linalg.solve(z.T @ z + alpha * np.eye(z.shape[1]), z.T @ (y - y.mean()))
        self.mean, self.std, self.coef, self.intercept = (
            mean.tolist(),
            std.tolist(),
            coef.tolist(),
            float(y.mean()),
        )
        return self

    def predict(self, x: np.ndarray) -> np.ndarray:
        z = (x - np.asarray(self.mean)) / np.asarray(self.std)
        return np.clip(z @ np.asarray(self.coef) + self.intercept, 0.0, 9.0)


def fit_lgb(x: np.ndarray, y: np.ndarray) -> lgb.Booster:
    return lgb.train(LGB_PARAMS, lgb.Dataset(x, label=y), num_boost_round=LGB_ROUNDS)


@dataclass
class Bundle:
    version: str
    calibrators: dict[Criterion, Calibrator]
    deterministic: dict[Criterion, Ridge]
    ensemble: dict[Criterion, lgb.Booster]
    meta: dict[str, Any] = field(default_factory=dict)

    def save(self, directory: Path) -> None:
        directory.mkdir(parents=True, exist_ok=True)
        payload = {
            "version": self.version,
            "calibrators": {c: self.calibrators[c].to_dict() for c in CRITERIA},
            "deterministic": {c: vars(self.deterministic[c]) for c in CRITERIA},
            "meta": self.meta,
        }
        (directory / "bundle.json").write_text(json.dumps(payload, indent=2) + "\n")
        for c in CRITERIA:
            (directory / f"ensemble-{c}.txt").write_text(self.ensemble[c].model_to_string())

    @classmethod
    def load(cls, directory: Path) -> "Bundle":
        data = json.loads((directory / "bundle.json").read_text())
        return cls(
            version=data["version"],
            calibrators={c: calibrator_from_dict(data["calibrators"][c]) for c in CRITERIA},
            deterministic={c: Ridge(**data["deterministic"][c]) for c in CRITERIA},
            ensemble={
                c: lgb.Booster(model_str=(directory / f"ensemble-{c}.txt").read_text())
                for c in CRITERIA
            },
            meta=data.get("meta", {}),
        )


@dataclass
class Paths:
    gemini: list[float]  # one value per Gemini pass
    calibrated: float
    deterministic: float
    ensemble: float

    @property
    def gemini_mean(self) -> float:
        return float(np.mean(self.gemini))


def predict_paths(
    bundle: Bundle,
    features: FeatureVector,
    task_type: TaskType,
    gemini_runs: list[dict[Criterion, float]],
) -> dict[Criterion, Paths]:
    gemini_mean = {c: float(np.mean([run[c] for run in gemini_runs])) for c in CRITERIA}
    x_det = np.asarray([feature_row(features, task_type)])
    x_ens = np.asarray([ensemble_row(features, task_type, gemini_mean)])
    return {
        c: Paths(
            gemini=[run[c] for run in gemini_runs],
            calibrated=float(bundle.calibrators[c].predict([gemini_mean[c]])[0]),
            deterministic=float(bundle.deterministic[c].predict(x_det)[0]),
            # One row: OpenMP across every core only adds contention under concurrent requests.
            ensemble=float(np.clip(bundle.ensemble[c].predict(x_ens, num_threads=1)[0], 0.0, 9.0)),
        )
        for c in CRITERIA
    }


def needs_second_pass(paths: dict[Criterion, Paths]) -> bool:
    """Ensemble and raw Gemini over a band apart: ask Gemini again, don't average it away."""
    return any(abs(p.ensemble - p.gemini_mean) > DISAGREEMENT_TRIGGER for p in paths.values())


def final_band(p: Paths) -> int:
    """Criterion Bands are whole numbers: blend calibrated and ensemble, round half up."""
    return int(min(9, max(0, math.floor((p.calibrated + p.ensemble) / 2 + 0.5))))
