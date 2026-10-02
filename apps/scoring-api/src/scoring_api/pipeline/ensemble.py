"""Stage 5: ensemble and cross-check.

Four paths per criterion: raw Gemini, calibrated Gemini (stage 4), a deterministic ridge model over
Features only, and a LightGBM ensemble over Features + all four Gemini bands. The final band blends
calibrated and ensemble. The paths are returned too, so a band is never a black box.

The fifth path is originality, scored per Script rather than per criterion and never fed into a
band: an embedding path (closest passage in the pgvector template index) and a classifier path
(logistic regression over the Script embedding), each Platt-calibrated and blended the same way.
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
    "collocation_issue_count",
]
TASK_TYPES: list[TaskType] = ["task1_academic", "task1_general", "task2"]
DISAGREEMENT_TRIGGER = 1.0  # bands between ensemble and raw Gemini before a second Gemini pass
TEMPLATE_HEAVY = 0.5  # blended originality risk at or above which the pre-submit warning shows

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
class Logistic:
    """Logistic regression scored with numpy; fitted in training, stored as JSON, no sklearn."""

    coef: list[float] = field(default_factory=list)
    intercept: float = 0.0

    def logit(self, x: np.ndarray) -> np.ndarray:
        return np.asarray(x, dtype=float) @ np.asarray(self.coef) + self.intercept

    def predict(self, x: np.ndarray) -> np.ndarray:
        return 1.0 / (1.0 + np.exp(-self.logit(x)))


@dataclass
class OriginalityModel:
    """The originality artifact: the classifier and a Platt calibrator for each path."""

    embedding_model: str
    classifier: Logistic  # over the unit-normalised Script embedding
    classifier_platt: Logistic  # classifier logit -> calibrated risk
    embedding_platt: Logistic  # closest template-passage similarity -> calibrated risk
    meta: dict[str, Any] = field(default_factory=dict)

    @property
    def passage_threshold(self) -> float:
        """Similarity at which the embedding path reaches 0.5: passages above it are evidence."""
        a, b = self.embedding_platt.coef[0], self.embedding_platt.intercept
        return float(np.clip(-b / a, 0.0, 1.0)) if a > 0 else 1.0

    def to_dict(self) -> dict[str, Any]:
        return {
            "embedding_model": self.embedding_model,
            "classifier": vars(self.classifier),
            "classifier_platt": vars(self.classifier_platt),
            "embedding_platt": vars(self.embedding_platt),
            "meta": self.meta,
        }

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> "OriginalityModel":
        return cls(
            embedding_model=data["embedding_model"],
            classifier=Logistic(**data["classifier"]),
            classifier_platt=Logistic(**data["classifier_platt"]),
            embedding_platt=Logistic(**data["embedding_platt"]),
            meta=data.get("meta", {}),
        )


@dataclass
class Bundle:
    version: str
    calibrators: dict[Criterion, Calibrator]
    deterministic: dict[Criterion, Ridge]
    ensemble: dict[Criterion, lgb.Booster]
    meta: dict[str, Any] = field(default_factory=dict)
    originality: OriginalityModel | None = None  # absent until the template index has been fitted

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
        if self.originality:
            save_originality(self.originality, directory)

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
            originality=(
                OriginalityModel.from_dict(json.loads(orig.read_text()))
                if (orig := directory / "originality.json").exists()
                else None
            ),
        )


def save_originality(model: OriginalityModel, directory: Path) -> None:
    (directory / "originality.json").write_text(json.dumps(model.to_dict(), indent=2) + "\n")


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


@dataclass
class OriginalityPaths:
    """The fifth path's breakdown: each value is a risk in [0, 1] that the Script is templated."""

    similarity: float  # raw: closest template passage, cosine
    embedding: float  # similarity, Platt-calibrated
    classifier: float  # classifier, Platt-calibrated

    @property
    def blended(self) -> float:
        """Same blend as final_band: the mean of the two calibrated paths."""
        return (self.embedding + self.classifier) / 2


def unit(vectors: np.ndarray) -> np.ndarray:
    """Gemini embeddings below 3072 dims aren't normalised; the classifier expects unit vectors."""
    v = np.atleast_2d(np.asarray(vectors, dtype=float))
    norms = np.linalg.norm(v, axis=1, keepdims=True)
    norms[norms == 0] = 1.0
    out: np.ndarray = v / norms
    return out


def predict_originality(
    model: OriginalityModel, script_vector: list[float], passage_similarities: list[float]
) -> OriginalityPaths:
    similarity = max(passage_similarities, default=0.0)
    logit = model.classifier.logit(unit(np.asarray(script_vector)))
    return OriginalityPaths(
        similarity=similarity,
        embedding=float(model.embedding_platt.predict(np.asarray([[similarity]]))[0]),
        classifier=float(model.classifier_platt.predict(logit.reshape(-1, 1))[0]),
    )
