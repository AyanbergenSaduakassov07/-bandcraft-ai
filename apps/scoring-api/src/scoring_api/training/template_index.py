"""Refresh the pgvector template index: generate templated Task 2 essays, embed, append a batch.

    uv run python -m scoring_api.training.template_index --count 60

Runs in the template-index GitHub Actions workflow, which n8n triggers on a schedule
(automation/n8n/). Each run appends a new batch, so the index grows; nothing is deleted.
Needs GEMINI_API_KEY, SUPABASE_URL and SUPABASE_SECRET_KEY (service role).
"""

import argparse
import asyncio
import json
import logging
import os
import random
from collections.abc import Awaitable, Callable
from datetime import date
from functools import partial
from pathlib import Path
from typing import Any

import httpx
from google import genai
from google.genai import errors, types
from pydantic import BaseModel, ValidationError

from scoring_api.main import scoring_models
from scoring_api.pipeline import prompts
from scoring_api.pipeline.features import paragraphs
from scoring_api.pipeline.originality import EMBEDDING_MODEL, gemini_embed

log = logging.getLogger(__name__)
ROOT = Path(__file__).resolve().parents[3]
GOLD = ROOT / "tests/fixtures/gold"
PER_CALL = 5
PAGE = 1000  # PostgREST's default max rows per response on Supabase


class QuotaSpent(RuntimeError):
    """Every generator model refused, usually the free tier's daily cap. Resume tomorrow."""


class _Essays(BaseModel):
    essays: list[str]


async def retry[T](fn: Callable[[], Awaitable[T]], attempts: int = 3) -> T:
    """Exponential backoff on quota, overload and dropped-connection errors (max 3 attempts)."""
    for attempt in range(1, attempts + 1):
        try:
            return await fn()
        except errors.APIError as e:
            if e.code not in {429, 500, 502, 503, 504} or attempt == attempts:
                raise
            log.warning("attempt %d: %s", attempt, e.code)
        except httpx.TransportError as e:  # dropped connections on long generations
            if attempt == attempts:
                raise
            log.warning("attempt %d: %r", attempt, e)
        await asyncio.sleep(2**attempt * 5 + random.uniform(0, 3))  # noqa: S311 - jitter
    raise AssertionError("unreachable")


def task2_questions() -> dict[str, str]:
    """Common questions plus the Gold Set's own Task 2 prompts, keyed by topic."""
    gold = {}
    for path in sorted(GOLD.glob("t2-*.json")):
        essay = json.loads(path.read_text())
        gold[essay["id"].rsplit("-b", 1)[0].removeprefix("t2-")] = essay["prompt"]
    return {**prompts.TEMPLATE_TOPICS, **gold}


async def generate(client: genai.Client, prompt: str, count: int) -> tuple[list[str], str]:
    """`count` templated essays for one question, falling through the generator models."""
    config = types.GenerateContentConfig(
        system_instruction=prompts.TEMPLATE_SYSTEM_PROMPT,
        response_mime_type="application/json",
        response_schema=_Essays,
        max_output_tokens=8192,
        temperature=1.0,
    )
    contents = prompts.TEMPLATE_USER_PROMPT.format(count=count, prompt=prompt)
    last: Exception | None = None
    for model in scoring_models():  # each free-tier model has its own daily quota
        try:
            response = await retry(
                partial(
                    client.aio.models.generate_content,
                    model=model,
                    contents=contents,
                    config=config,
                )
            )
            parsed = _Essays.model_validate_json(response.text or "")
            return [e.strip() for e in parsed.essays if len(e.split()) >= 150], model
        except (errors.APIError, httpx.TransportError, ValidationError) as e:
            log.warning("%s failed: %r", model, e)
            last = e
    raise QuotaSpent(f"every generator model failed: {last!r}")


def rest(url: str, key: str) -> httpx.Client:
    return httpx.Client(
        base_url=f"{url}/rest/v1",
        headers={"apikey": key, "content-type": "application/json"},
        timeout=30,
    )


def select_all(client: httpx.Client, table: str, columns: str, order: str) -> list[dict[str, Any]]:
    """Every row of a table, paged past PostgREST's row cap."""
    rows: list[dict[str, Any]] = []
    while True:
        response = client.get(
            f"/{table}",
            params={"select": columns, "order": order},
            headers={"range-unit": "items", "range": f"{len(rows)}-{len(rows) + PAGE - 1}"},
        )
        response.raise_for_status()
        page = response.json()
        rows += page
        if len(page) < PAGE:
            return rows


async def run(count: int, batch: str) -> int:
    client = genai.Client(api_key=os.environ["GEMINI_API_KEY"])
    db = rest(os.environ["SUPABASE_URL"], os.environ["SUPABASE_SECRET_KEY"])
    questions = list(task2_questions().items())
    random.Random(batch).shuffle(questions)  # noqa: S311 - topic rotation, not security
    added = 0
    for call in range(-(-count // PER_CALL)):
        topic, prompt = questions[call % len(questions)]
        try:
            essays, generator = await generate(client, prompt, min(PER_CALL, count - added))
        except QuotaSpent as e:
            if not added:
                raise
            # The index grows by batches; keep what this run indexed rather than failing it.
            log.warning("stopping at %d/%d: %s", added, count, e)
            break
        for essay in essays:
            essay_id = f"{batch}-{added:03d}"
            paras = paragraphs(essay)
            vectors = await retry(partial(gemini_embed, [essay, *paras], client=client))
            row = {
                "id": essay_id,
                "batch": batch,
                "topic": topic,
                "prompt": prompt,
                "text": essay,
                "embedding": vectors[0],
                "generator_model": generator,
                "embedding_model": EMBEDDING_MODEL,
            }
            passages = [
                {"essay_id": essay_id, "position": i, "passage": p, "embedding": v}
                for i, (p, v) in enumerate(zip(paras, vectors[1:], strict=True))
            ]
            db.post("/template_essays", json=row).raise_for_status()
            db.post("/template_passages", json=passages).raise_for_status()
            added += 1
        log.info("%s: +%d (%s), %d/%d", topic, len(essays), generator, added, count)
    return added


def main() -> None:
    logging.basicConfig(level=logging.INFO, format="%(message)s")
    p = argparse.ArgumentParser()
    p.add_argument("--count", type=int, default=60)
    p.add_argument(
        "--batch", default=f"{date.today().isoformat()}-{os.environ.get('GITHUB_RUN_ID', 'local')}"
    )
    args = p.parse_args()
    added = asyncio.run(run(args.count, args.batch))
    log.info("batch %s: %d templated essays indexed", args.batch, added)


if __name__ == "__main__":
    main()
