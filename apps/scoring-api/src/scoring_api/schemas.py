"""Request/response models for the scoring API. Terms follow /CONTEXT.md."""

from typing import Literal, get_args

from pydantic import BaseModel, Field

TaskType = Literal["task1_academic", "task1_general", "task2"]
Criterion = Literal[
    "task_achievement_response",
    "coherence_cohesion",
    "lexical_resource",
    "grammatical_range_accuracy",
]
CRITERIA: tuple[Criterion, ...] = get_args(Criterion)

WORD_FLOOR: dict[TaskType, int] = {"task1_academic": 150, "task1_general": 150, "task2": 250}


class DraftRequest(BaseModel):
    task_type: TaskType
    prompt: str = Field(
        min_length=1,
        max_length=4_000,
        description="The task instructions (and data, for Task 1 Academic).",
    )
    script: str = Field(min_length=1, max_length=20_000, description="The candidate's response.")


class Issue(BaseModel):
    """One deterministic finding, located in the Script by character offsets."""

    rule: str
    start: int
    end: int
    text: str


class FeatureVector(BaseModel):
    word_count: int
    word_floor: int
    below_word_floor: bool

    paragraph_count: int
    mean_paragraph_words: float
    # Structure checks that apply to only one Task Type are None elsewhere.
    has_overview: bool | None = Field(
        description="Task 1 Academic: a paragraph opens with an overview marker."
    )
    has_conclusion: bool | None = Field(
        description="Task 2: the last paragraph opens with a concluding marker."
    )
    has_salutation: bool | None = Field(description="Task 1 General: letter opens with 'Dear ...'.")
    has_sign_off: bool | None = Field(description="Task 1 General: letter closes with a sign-off.")

    sentence_count: int
    mean_sentence_words: float
    sentence_length_variance: float
    subordinate_clause_rate: float = Field(
        description="Share of sentences with at least one subordinate clause."
    )

    type_token_ratio: float
    mattr: float = Field(
        description="Moving-average TTR (50-word window); stable across essay lengths."
    )

    cohesion_marker_count: int
    cohesion_markers_per_100_words: float
    distinct_cohesion_markers: int
    top_cohesion_marker_share: float = Field(
        description="Share of markers taken by the most-used one; high means overuse."
    )

    spelling_error_count: int
    grammar_issue_count: int
    errors_per_100_words: float
    issues: list[Issue]


class EvidenceSpan(BaseModel):
    quote: str
    observation: str
    start: int | None = Field(
        description="Offset of the quote in the Script, or None if it couldn't be found."
    )
    end: int | None
    verified: bool = Field(description="True when the quote was found in the Script.")


class CriterionScore(BaseModel):
    band: int = Field(ge=0, le=9)
    analysis: str
    evidence: list[EvidenceSpan]
    evidence_verified: bool = Field(
        description="At least one quote was found verbatim in the Script."
    )


class RubricResult(BaseModel):
    model: str
    criteria: dict[Criterion, CriterionScore]
    overall_raw: float = Field(
        description="Uncalibrated overall band from the four raw Criterion Bands."
    )


class DraftResponse(BaseModel):
    task_type: TaskType
    features: FeatureVector
    rubric: RubricResult
    latency_ms: int


class PathValues(BaseModel):
    """The independent estimates behind a band, exposed so it is never a black box."""

    gemini: list[float] = Field(
        description="Raw Gemini band per pass (two when a second pass ran)."
    )
    calibrated: float
    deterministic: float = Field(description="Features-only model; no language model involved.")
    ensemble: float


class FinalCriterion(BaseModel):
    band: int = Field(ge=0, le=9, description="Calibrated Criterion Band.")
    paths: PathValues
    evidence: list[EvidenceSpan]


class OverallBand(BaseModel):
    band: float


class OriginalityPathValues(BaseModel):
    """The fifth path's breakdown, so the warning is never an opaque flag."""

    similarity: float = Field(description="Closest template passage, cosine similarity.")
    embedding: float = Field(description="Similarity path, calibrated to a 0-1 risk.")
    classifier: float = Field(description="Templated-vs-organic classifier, calibrated 0-1 risk.")


class OriginalityCheck(BaseModel):
    """Pre-submit warning for template-heavy Task 2 Scripts. Never changes a band."""

    risk: float = Field(ge=0, le=1, description="Mean of the two calibrated paths.")
    template_heavy: bool
    paths: OriginalityPathValues
    evidence: list[EvidenceSpan] = Field(
        description="Paragraphs closer to a template passage than the calibrated threshold."
    )
    embedding_model: str


class FinalResponse(BaseModel):
    task_type: TaskType
    script: str = Field(description="The normalised Script; evidence offsets index into this.")
    overall: OverallBand
    criteria: dict[Criterion, FinalCriterion]
    second_pass: bool = Field(
        description="Ensemble and raw Gemini disagreed by more than a band, so Gemini scored again."
    )
    gemini_models: list[str]
    calibration_version: str
    features: FeatureVector
    originality: OriginalityCheck | None = Field(
        default=None, description="Task 2 only, and only once the template index is fitted."
    )
    embedding: list[float] | None = Field(
        default=None, description="The Script's embedding, for storage. Not for display."
    )
    latency_ms: int
