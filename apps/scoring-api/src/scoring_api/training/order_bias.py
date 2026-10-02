"""Order-bias eval for stage 3: does Gemini's band move when only the prompt's ordering changes?

    uv run python -m scoring_api.training.order_bias --model gemini-3.7-flash

Each fresh Script (tests/fixtures/fresh/order-bias-set.json, unlabelled) is scored under
five conditions with one model:

- baseline, baseline_repeat: the production prompt twice; their gap is the run-to-run noise floor
- reversed_criteria: descriptors and output fields in reverse (Grammar first, Task Response last)
- ascending_descriptors: each criterion's band lines listed 3 -> 9 instead of 9 -> 3
- script_last: the Script placed after the band descriptors instead of before them

An ordering effect only counts if it is larger than the noise floor. No ground truth is needed:
this measures consistency, not accuracy. Resumable: finished calls are kept in the output file.
The report lands in docs/benchmarks/order-bias-<model>-<date>.md.
"""

import argparse
import asyncio
import json
import logging
import os
import random
import statistics
from collections.abc import Callable
from datetime import date
from pathlib import Path
from typing import Any

from google import genai
from google.genai import errors
from pydantic import BaseModel, ValidationError, create_model

from scoring_api.pipeline import prompts
from scoring_api.pipeline.rubric import _call, _Judgement, _RubricJudgement, overall_band
from scoring_api.schemas import CRITERIA, TaskType

log = logging.getLogger(__name__)
ROOT = Path(__file__).resolve().parents[3]
FRESH = ROOT / "tests/fixtures/fresh"
CONDITIONS = (
    "baseline",
    "baseline_repeat",
    "reversed_criteria",
    "ascending_descriptors",
    "script_last",
)
Bands = dict[str, int]
Results = dict[str, dict[str, Bands]]  # essay id -> condition -> criterion bands
_Reversed = create_model(  # type: ignore[call-overload]
    "_Reversed", **{c: (_Judgement, ...) for c in reversed(CRITERIA)}
)


def _ascending(block: str) -> str:
    """Reverse one descriptor block's band lines; heading stays first, edge cases last."""
    head, *lines = block.split("\n")
    bands = [line for line in lines if line[:1].isdigit()]
    rest = [line for line in lines if not line[:1].isdigit()]
    return "\n".join([head, *reversed(bands), *rest])


def build(
    condition: str, task_type: TaskType, prompt: str, script: str
) -> tuple[str, type[BaseModel]]:
    """The user prompt and response schema for one condition. 'baseline' equals production."""
    sections = [
        prompts._FIRST_CRITERION[task_type],
        prompts.COHERENCE,
        prompts.LEXICAL,
        prompts.GRAMMAR,
    ]
    if condition == "ascending_descriptors":
        sections = [_ascending(s) for s in sections]
    if condition == "reversed_criteria":
        sections = sections[::-1]
    first_name = "Task Response" if task_type == "task2" else "Task Achievement"
    head = (
        f"Task type: {prompts._TASK_LABEL[task_type]}\n\n"
        f"<task_prompt>\n{prompt}\n</task_prompt>"
    )
    body = f"<script>\n{script}\n</script>"
    descriptors = "Band descriptors:\n\n" + "\n\n".join(sections)
    tail = (
        'Score the script on all four criteria. In the output, "task_achievement_response" means '
        f"{first_name} for this task type. Follow the evidence, analysis, band order for each."
    )
    if condition == "script_last":
        parts = [head, descriptors, body, tail]
    else:
        parts = [head, body, descriptors, tail]
    schema = _Reversed if condition == "reversed_criteria" else _RubricJudgement
    return "\n\n".join(parts), schema


async def _judge(client: genai.Client, model: str, contents: str, schema: type[BaseModel]) -> Bands:
    """Bands for one call. Retries harder than production: an eval can wait out free-tier 503s."""
    for attempt in range(1, 7):
        try:
            judgement = await _call(client, model, contents, schema)
            return {c: min(9, max(0, getattr(judgement, c).band)) for c in CRITERIA}
        except errors.APIError as e:
            if e.code not in {429, 500, 502, 503, 504} or attempt == 6:
                raise
            log.warning("attempt %d: %s", attempt, e.code)
        except (ValidationError, TimeoutError) as e:
            if attempt == 6:
                raise
            log.warning("attempt %d: %s", attempt, type(e).__name__)
        await asyncio.sleep(10 * attempt + random.uniform(0, 3))  # noqa: S311 - jitter
    raise AssertionError("unreachable")


async def run(model: str, fresh: Path, out: Path, concurrency: int) -> dict[str, Any]:
    data: dict[str, Any] = (
        json.loads(out.read_text()) if out.exists() else {"model": model, "results": {}}
    )
    results: Results = data["results"]
    if data["model"] != model:
        raise SystemExit(f"{out} holds results for {data['model']}; use another --out for {model}")
    client = genai.Client(api_key=os.environ["GEMINI_API_KEY"])
    gate, lock = asyncio.Semaphore(concurrency), asyncio.Lock()
    rng = random.Random(20261001)  # noqa: S311 - reproducible condition order

    async def one(essay: dict[str, Any], condition: str) -> None:
        contents, schema = build(condition, essay["task_type"], essay["prompt"], essay["script"])
        async with gate:
            bands = await _judge(client, model, contents, schema)
        async with lock:
            results.setdefault(essay["id"], {})[condition] = bands
            out.write_text(json.dumps(data, indent=2) + "\n")
        log.info("%s %s %s", essay["id"], condition, list(bands.values()))

    jobs = []
    for essay in json.loads(fresh.read_text())["scripts"]:
        todo = [c for c in CONDITIONS if c not in results.get(essay["id"], {})]
        rng.shuffle(todo)  # order varies per Script, so drift over the run isn't read as bias
        jobs += [one(essay, c) for c in todo]
    outcomes = await asyncio.gather(*jobs, return_exceptions=True)
    for o in outcomes:
        if isinstance(o, BaseException):
            log.error("call failed, re-run to retry: %r", o)
    return data


def _bootstrap_ci(values: list[float], reps: int = 10_000) -> tuple[float, float]:
    rng = random.Random(0)  # noqa: S311 - reproducible resampling
    means = sorted(statistics.fmean(rng.choices(values, k=len(values))) for _ in range(reps))
    return means[int(0.025 * reps)], means[int(0.975 * reps) - 1]


def analyse(data: dict[str, Any]) -> dict[str, dict[str, Any]]:
    """Per condition vs baseline: mean signed shift, essay-level bootstrap CI, agreement rates."""
    results: Results = data["results"]
    complete = {k: v for k, v in results.items() if all(c in v for c in CONDITIONS)}
    report = {}
    for cond in CONDITIONS[1:]:
        diffs = {c: [r[cond][c] - r["baseline"][c] for r in complete.values()] for c in CRITERIA}
        flat = [d for ds in diffs.values() for d in ds]
        overall = [
            overall_band(list(r[cond].values())) - overall_band(list(r["baseline"].values()))
            for r in complete.values()
        ]
        per_essay = [
            statistics.fmean(r[cond][c] - r["baseline"][c] for c in CRITERIA)
            for r in complete.values()
        ]
        report[cond] = {
            "essays": len(complete),
            "mean_shift": statistics.fmean(flat),
            "ci95": _bootstrap_ci(per_essay),
            "exact_agreement": sum(d == 0 for d in flat) / len(flat),
            "off_by_2_plus": sum(abs(d) >= 2 for d in flat) / len(flat),
            "overall_mean_shift": statistics.fmean(overall),
            "overall_within_half": sum(abs(d) <= 0.5 for d in overall) / len(overall),
            "per_criterion": {c: statistics.fmean(ds) for c, ds in diffs.items()},
        }
    return report


def render(data: dict[str, Any], report: dict[str, dict[str, Any]], today: str) -> str:
    noise = report["baseline_repeat"]
    pct: Callable[[float], str] = lambda x: f"{x:.0%}"  # noqa: E731
    lines = [
        f"# Order-bias eval: Gemini rubric scoring ({today})",
        "",
        f"Model `{data['model']}`, prompt `{prompts.PROMPT_VERSION}`, {noise['essays']} fresh "
        "unlabelled Scripts (`tests/fixtures/fresh/order-bias-set.json`), one call per Script "
        "per condition. Shifts are condition band minus baseline band; positive means the "
        "ordering raised the score.",
        "",
        "| Condition | Mean shift (criterion) | 95% CI | Exact agreement | Off by 2+ "
        "| Overall shift | Overall within ±0.5 |",
        "|---|---|---|---|---|---|---|",
    ]
    for cond, r in report.items():
        lines.append(
            f"| {cond} | {r['mean_shift']:+.2f} | {r['ci95'][0]:+.2f} to {r['ci95'][1]:+.2f} "
            f"| {pct(r['exact_agreement'])} | {pct(r['off_by_2_plus'])} "
            f"| {r['overall_mean_shift']:+.2f} | {pct(r['overall_within_half'])} |"
        )
    lines += ["", "Per-criterion mean shift:", ""]
    lines += ["| Condition | " + " | ".join(CRITERIA) + " |", "|---" * 5 + "|"]
    for cond, r in report.items():
        shifts = " | ".join(f"{r['per_criterion'][c]:+.2f}" for c in CRITERIA)
        lines.append(f"| {cond} | {shifts} |")
    return "\n".join(lines) + "\n"


def main() -> None:
    logging.basicConfig(level=logging.INFO, format="%(message)s")
    p = argparse.ArgumentParser()
    p.add_argument("--model", default="gemini-3.7-flash")
    p.add_argument("--concurrency", type=int, default=2)
    p.add_argument("--out", type=Path, default=FRESH / "order-bias-results.json")
    args = p.parse_args()
    data = asyncio.run(run(args.model, FRESH / "order-bias-set.json", args.out, args.concurrency))
    today = date.today().isoformat()
    report = ROOT.parents[1] / "docs/benchmarks" / f"order-bias-{args.model}-{today}.md"
    report.write_text(render(data, analyse(data), today))
    log.info("saved %s", report)


if __name__ == "__main__":
    main()
