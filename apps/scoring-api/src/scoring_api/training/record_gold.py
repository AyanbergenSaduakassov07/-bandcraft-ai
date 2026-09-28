"""Record real draft runs (features + raw Gemini rubric) for every Gold Script. Inference only.

    uv run python -m scoring_api.training.record_gold --runs 1

Resumable: essays that already have enough runs are skipped, so it can be re-run after the free-tier
quota resets. Output: tests/fixtures/gold-raw/<id>.json, the input to scoring_api.training.train.
"""

import argparse
import asyncio
import json
import logging
import os
from functools import partial
from pathlib import Path

from google import genai

from scoring_api.main import scoring_models
from scoring_api.pipeline.draft import draft_score
from scoring_api.pipeline.rubric import RubricError, score_with_fallback
from scoring_api.schemas import DraftRequest

log = logging.getLogger(__name__)
ROOT = Path(__file__).resolve().parents[3]


async def record(runs: int, gold_dir: Path, out_dir: Path) -> tuple[int, int]:
    client = genai.Client(api_key=os.environ["GEMINI_API_KEY"])
    scorer = partial(score_with_fallback, client=client, models=scoring_models())
    out_dir.mkdir(parents=True, exist_ok=True)
    done = failed = 0
    for path in sorted(gold_dir.glob("*.json")):
        essay = json.loads(path.read_text())
        target = out_dir / path.name
        existing = json.loads(target.read_text())["runs"] if target.exists() else []
        while len(existing) < runs:
            req = DraftRequest(
                task_type=essay["task_type"], prompt=essay["prompt"], script=essay["script"]
            )
            try:
                result = await draft_score(req, scorer)
            except RubricError as e:
                log.warning("stopping at %s: %s", essay["id"], e)
                return done, failed + 1
            existing.append(result.model_dump(mode="json"))
            target.write_text(json.dumps({"id": essay["id"], "runs": existing}, indent=1) + "\n")
            done += 1
            log.info("recorded %s run %d (%s)", essay["id"], len(existing), result.rubric.model)
    return done, failed


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--runs", type=int, default=1, help="Gemini runs to keep per essay")
    parser.add_argument("--gold", type=Path, default=ROOT / "tests/fixtures/gold")
    parser.add_argument("--out", type=Path, default=ROOT / "tests/fixtures/gold-raw")
    args = parser.parse_args()
    logging.basicConfig(level=logging.INFO)
    done, failed = asyncio.run(record(args.runs, args.gold, args.out))
    log.info("recorded %d new runs; %s", done, "stopped early (quota?)" if failed else "complete")


if __name__ == "__main__":
    main()
