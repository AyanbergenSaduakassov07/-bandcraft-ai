"""Response models for the Speaking API. Terms follow /CONTEXT.md, adapted to Speaking."""

from typing import Literal, get_args

from pydantic import BaseModel, Field

Part = Literal["part1", "part2", "part3"]
Criterion = Literal[
    "fluency_coherence",
    "lexical_resource",
    "grammatical_range_accuracy",
    "pronunciation",
]
CRITERIA: tuple[Criterion, ...] = get_args(Criterion)


class EvidenceSpan(BaseModel):
    """A quote from the candidate's own words, located in the Part transcript."""

    quote: str
    observation: str
    start: int | None = Field(description="Offset in `transcript`, or None if not found.")
    end: int | None
    verified: bool
    source: Literal["gemini", "openpronounce"] = "gemini"


class Answer(BaseModel):
    """One candidate answer, cut from the Part's audio by the timestamps Gemini returned."""

    question: str
    start_s: float = Field(ge=0)
    end_s: float = Field(ge=0)
    transcript: str


class PronunciationPaths(BaseModel):
    """The two independent Pronunciation estimates behind the band, never one black box."""

    gemini: float = Field(description="Gemini's audio judgment, calibrated to the band scale.")
    openpronounce: float | None = Field(
        description="Hosted OpenPronounce, calibrated; None when the endpoint didn't answer."
    )
    openpronounce_raw: float | None = Field(description="OpenPronounce's own 0-100 score.")
    calibrated: bool = Field(description="False until a speechocean762 calibration exists.")


class CriterionResult(BaseModel):
    band: int = Field(ge=0, le=9)
    evidence: list[EvidenceSpan]


class PartResult(BaseModel):
    part: Part
    transcript: str = Field(description="All answers joined; evidence offsets index into this.")
    answers: list[Answer]
    criteria: dict[Criterion, CriterionResult]
    overall: float = Field(description="Mean of the four criteria, IELTS rounding to half bands.")
    pronunciation_paths: PronunciationPaths
    gemini_model: str
    calibration_version: str | None
