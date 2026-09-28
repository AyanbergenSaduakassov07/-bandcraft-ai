import logging
import os
from functools import lru_cache, partial
from pathlib import Path
from typing import Annotated

from dotenv import load_dotenv
from fastapi import Depends, FastAPI, HTTPException
from google import genai

from scoring_api.pipeline.draft import Scorer, draft_score
from scoring_api.pipeline.ensemble import Bundle
from scoring_api.pipeline.final import final_score
from scoring_api.pipeline.rubric import RubricError, score_with_fallback
from scoring_api.schemas import DraftRequest, DraftResponse, FinalResponse

load_dotenv()
logging.basicConfig(level=logging.INFO)
log = logging.getLogger(__name__)

# In preference order. Free-tier models hit "high demand" 503s independently, so we fall through.
DEFAULT_MODELS = ",".join(
    [
        "gemini-3.6-flash",
        "gemini-3.8-flash",
        "gemini-3.7-flash",
        "gemini-3.5-flash",
        "gemini-flash-latest",
    ]
)


def scoring_models() -> list[str]:
    return [
        m.strip() for m in os.environ.get("SCORING_MODELS", DEFAULT_MODELS).split(",") if m.strip()
    ]


app = FastAPI(title="BandCraft AI Scoring API")


@lru_cache(maxsize=1)
def _client() -> genai.Client:
    key = os.environ.get("GEMINI_API_KEY")
    if not key:
        raise HTTPException(status_code=503, detail="GEMINI_API_KEY is not set")
    return genai.Client(api_key=key)


def get_scorer() -> Scorer:
    return partial(score_with_fallback, client=_client(), models=scoring_models())


ARTIFACTS = Path(__file__).resolve().parents[2] / "artifacts" / "calibration"


@lru_cache(maxsize=1)
def get_bundle() -> Bundle:
    """CALIBRATION_DIR pins a version; otherwise the newest artifact folder (names sort by date)."""
    pinned = os.environ.get("CALIBRATION_DIR")
    candidates = (
        [Path(pinned)]
        if pinned
        else sorted(p for p in ARTIFACTS.glob("*") if (p / "bundle.json").exists())
    )
    if not candidates:
        raise HTTPException(
            status_code=503, detail="No calibration trained yet: run the calibrate workflow"
        )
    return Bundle.load(candidates[-1])


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/score/draft", response_model=DraftResponse)
async def score_draft(
    req: DraftRequest, scorer: Annotated[Scorer, Depends(get_scorer)]
) -> DraftResponse:
    """Internal: Features plus raw, uncalibrated Gemini Criterion Bands with evidence spans."""
    try:
        return await draft_score(req, scorer)
    except RubricError as e:
        log.error("rubric scoring failed: %s", e)
        raise HTTPException(status_code=502, detail=str(e)) from e


@app.post("/score/final", response_model=FinalResponse)
async def score_final(
    req: DraftRequest,
    scorer: Annotated[Scorer, Depends(get_scorer)],
    bundle: Annotated[Bundle, Depends(get_bundle)],
) -> FinalResponse:
    """Calibrated Criterion Bands, overall band, a margin per score, and the evidence spans."""
    try:
        return await final_score(req, scorer, bundle)
    except RubricError as e:
        log.error("rubric scoring failed: %s", e)
        raise HTTPException(status_code=502, detail=str(e)) from e
