"""Stage 4: calibration. Maps a raw Gemini band onto the examiner scale learned from the Gold Set.

Calibrators are swappable (pick by name) and serialise to plain JSON, so the API never needs
scikit-learn and never unpickles anything. Fitting happens in scoring_api.training.train (ADR-0003).
"""

from typing import Any, Protocol

import numpy as np
from numpy.typing import ArrayLike


class Calibrator(Protocol):
    name: str

    def fit(self, raw: ArrayLike, gold: ArrayLike) -> "Calibrator": ...
    def predict(self, raw: ArrayLike) -> np.ndarray: ...
    def to_dict(self) -> dict[str, Any]: ...


def _clip(values: np.ndarray) -> np.ndarray:
    clipped: np.ndarray = np.clip(values, 0.0, 9.0)
    return clipped


class IsotonicCalibrator:
    """Monotone step mapping: never reorders essays, only corrects the scale."""

    name = "isotonic"

    def __init__(self, x: list[float] | None = None, y: list[float] | None = None) -> None:
        self.x = x or []
        self.y = y or []

    def fit(self, raw: ArrayLike, gold: ArrayLike) -> "IsotonicCalibrator":
        from sklearn.isotonic import IsotonicRegression  # train-only dependency

        model = IsotonicRegression(y_min=0.0, y_max=9.0, out_of_bounds="clip").fit(raw, gold)
        self.x = [float(v) for v in model.X_thresholds_]
        self.y = [float(v) for v in model.y_thresholds_]
        return self

    def predict(self, raw: ArrayLike) -> np.ndarray:
        values = np.asarray(raw, dtype=float)
        if not self.x:
            return _clip(values)
        return _clip(np.interp(values, self.x, self.y))

    def to_dict(self) -> dict[str, Any]:
        return {"name": self.name, "x": self.x, "y": self.y}


class LinearCalibrator:
    """Least-squares line. Smoother than isotonic when the Gold Set is small."""

    name = "linear"

    def __init__(self, slope: float = 1.0, intercept: float = 0.0) -> None:
        self.slope = slope
        self.intercept = intercept

    def fit(self, raw: ArrayLike, gold: ArrayLike) -> "LinearCalibrator":
        x = np.asarray(raw, dtype=float)
        y = np.asarray(gold, dtype=float)
        if np.ptp(x) == 0:  # every raw band identical: only a shift is identifiable
            self.slope, self.intercept = 1.0, float(np.mean(y - x))
        else:
            slope, intercept = np.polyfit(x, y, 1)
            self.slope, self.intercept = float(slope), float(intercept)
        return self

    def predict(self, raw: ArrayLike) -> np.ndarray:
        return _clip(self.slope * np.asarray(raw, dtype=float) + self.intercept)

    def to_dict(self) -> dict[str, Any]:
        return {"name": self.name, "slope": self.slope, "intercept": self.intercept}


CALIBRATORS: dict[str, type[IsotonicCalibrator] | type[LinearCalibrator]] = {
    "isotonic": IsotonicCalibrator,
    "linear": LinearCalibrator,
}


def make_calibrator(name: str) -> Calibrator:
    return CALIBRATORS[name]()


def calibrator_from_dict(data: dict[str, Any]) -> Calibrator:
    if data["name"] == "isotonic":
        return IsotonicCalibrator(x=data["x"], y=data["y"])
    if data["name"] == "linear":
        return LinearCalibrator(slope=data["slope"], intercept=data["intercept"])
    raise ValueError(f"unknown calibrator: {data['name']}")
