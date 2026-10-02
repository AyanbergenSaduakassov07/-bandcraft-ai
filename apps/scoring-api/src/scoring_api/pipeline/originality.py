"""The fifth path's I/O: Gemini embeddings and the pgvector template index.

Task 2 only: the index holds templated Task 2 essays. Paragraphs are the unit, so the warning can
quote the passages that read as templated, located in the Script like rubric evidence. The scoring
maths lives in ensemble.py (OriginalityModel, predict_originality); this module fetches its inputs.
"""

import asyncio
import logging
from collections.abc import Awaitable, Callable
from dataclasses import dataclass

import httpx
import numpy as np
from google import genai
from google.genai import errors, types

from scoring_api.pipeline.ensemble import (
    TEMPLATE_HEAVY,
    OriginalityModel,
    predict_originality,
    unit,
)
from scoring_api.pipeline.features import paragraphs
from scoring_api.pipeline.rubric import locate
from scoring_api.schemas import EvidenceSpan, OriginalityCheck, OriginalityPathValues

log = logging.getLogger(__name__)

EMBEDDING_MODEL = "gemini-embedding-001"
EMBEDDING_DIMS = 768  # matches extensions.vector(768) in the template_index migration
EMBED_TIMEOUT_S = 30.0
INDEX_TIMEOUT_S = 10.0


@dataclass
class Match:
    """The closest template passage to one query paragraph."""

    query: int
    essay_id: str
    topic: str
    passage: str
    similarity: float


Embedder = Callable[[list[str]], Awaitable[list[list[float]]]]
TemplateIndex = Callable[[list[list[float]]], Awaitable[list[Match]]]
Checker = Callable[[str], Awaitable[tuple[OriginalityCheck, list[float]]]]


async def gemini_embed(
    texts: list[str], *, client: genai.Client, model: str = EMBEDDING_MODEL
) -> list[list[float]]:
    """Unit-normalised embeddings, one per text, from one hosted API call (max 100 texts)."""
    config = types.EmbedContentConfig(
        output_dimensionality=EMBEDDING_DIMS, task_type="SEMANTIC_SIMILARITY"
    )
    response = await asyncio.wait_for(
        client.aio.models.embed_content(model=model, contents=texts, config=config),
        timeout=EMBED_TIMEOUT_S,
    )
    values = [e.values or [] for e in response.embeddings or []]
    if len(values) != len(texts):
        raise ValueError(f"expected {len(texts)} embeddings, got {len(values)}")
    rows: list[list[float]] = unit(np.asarray(values)).tolist()
    return rows


def supabase_index(url: str, key: str) -> TemplateIndex:
    """The nearest_template_passages RPC over PostgREST, with the service-role secret key."""

    async def nearest(vectors: list[list[float]]) -> list[Match]:
        async with httpx.AsyncClient(timeout=INDEX_TIMEOUT_S) as http:
            response = await http.post(
                f"{url}/rest/v1/rpc/nearest_template_passages",
                json={"queries": vectors},
                headers={"apikey": key},
            )
            response.raise_for_status()
        return [Match(**row) for row in response.json()]

    return nearest


async def assess(
    script: str, *, embed: Embedder, index: TemplateIndex, model: OriginalityModel
) -> tuple[OriginalityCheck, list[float]]:
    """Risk, path breakdown and quoted passages for a normalised Script, plus its embedding."""
    paras = paragraphs(script)
    vectors = await embed([script, *paras])
    matches = await index(vectors[1:]) if paras else []
    paths = predict_originality(model, vectors[0], [m.similarity for m in matches])
    threshold = model.passage_threshold
    evidence = []
    for m in sorted(matches, key=lambda m: m.query):
        if m.similarity < threshold:
            continue
        found = locate(paras[m.query], script)
        evidence.append(
            EvidenceSpan(
                quote=paras[m.query],
                observation=(
                    f"Reads close to a templated essay on {m.topic} "
                    f"(similarity {m.similarity:.2f})."
                ),
                start=found[0] if found else None,
                end=found[1] if found else None,
                verified=found is not None,
            )
        )
    check = OriginalityCheck(
        risk=round(paths.blended, 3),
        template_heavy=paths.blended >= TEMPLATE_HEAVY,
        paths=OriginalityPathValues(
            similarity=round(paths.similarity, 3),
            embedding=round(paths.embedding, 3),
            classifier=round(paths.classifier, 3),
        ),
        evidence=evidence,
        embedding_model=model.embedding_model,
    )
    return check, vectors[0]


async def safe_check(
    check: Checker | None, script: str
) -> tuple[OriginalityCheck | None, list[float] | None]:
    """A failed originality check never blocks scoring: it's a warning, not a band input."""
    if check is None:
        return None, None
    try:
        return await check(script)
    except (httpx.HTTPError, errors.APIError, TimeoutError, ValueError) as e:
        log.warning("originality check skipped: %r", e)
        return None, None
