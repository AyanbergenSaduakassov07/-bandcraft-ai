"""Draft scoring: stage 1 (ingestion), then stages 2 and 3 in parallel.

No calibration yet (SPEC stage 4).
"""

import asyncio
import time
import unicodedata
from collections.abc import Awaitable, Callable

from scoring_api.pipeline.features import extract_features
from scoring_api.schemas import DraftRequest, DraftResponse, RubricResult, TaskType

Scorer = Callable[[TaskType, str, str], Awaitable[RubricResult]]

_QUOTES = str.maketrans({"‘": "'", "’": "'", "“": '"', "”": '"', " ": " "})


def normalise(script: str) -> str:
    """Stage 1: NFC, straight quotes, Unix newlines, no trailing spaces.

    Evidence and Issue offsets refer to this normalised text.
    """
    # ponytail: no language detection yet (SPEC stage 1); add when non-English submissions show up.
    text = (
        unicodedata.normalize("NFC", script)
        .translate(_QUOTES)
        .replace("\r\n", "\n")
        .replace("\r", "\n")
    )
    return "\n".join(line.rstrip() for line in text.strip().split("\n"))


async def draft_score(req: DraftRequest, scorer: Scorer) -> DraftResponse:
    started = time.perf_counter()
    script = normalise(req.script)
    features, rubric = await asyncio.gather(
        asyncio.to_thread(extract_features, script, req.task_type),
        scorer(req.task_type, req.prompt, script),
    )
    return DraftResponse(
        task_type=req.task_type,
        features=features,
        rubric=rubric,
        latency_ms=round((time.perf_counter() - started) * 1000),
    )
