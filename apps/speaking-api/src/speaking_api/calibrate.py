"""Calibrate both Pronunciation paths against speechocean762, leave-one-out (ADR-0005).

    uv run --group calibrate python -m speaking_api.calibrate --endpoint-n 200 --gemini-n 60

Runs in the speaking-calibrate GitHub workflow: utterances go to the hosted OpenPronounce endpoint
and to Gemini over HTTPS, nothing is inferred locally. Results are cached in
artifacts/speechocean762-runs.json, so quota-limited Gemini runs add up across days. Uses the
train split: OpenPronounce's own weights were fitted on a test-split sample.
"""

import argparse
import asyncio
import json
import logging
import os
import random
import statistics
from collections import defaultdict
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

import httpx
import numpy as np
from google import genai

from speaking_api.pronunciation import ARTIFACT, BAND_PER_POINT, Clip, score_clip
from speaking_api.schemas import Answer
from speaking_api.scoring import ScoringError, judge

log = logging.getLogger(__name__)
ROOT = Path(__file__).resolve().parents[2]
RUNS = ROOT / "artifacts" / "speechocean762-runs.json"
REPORT_DIR = ROOT.parents[1] / "docs" / "benchmarks"
DATASET = ("mispeech/speechocean762", "data/train-00000-of-00001.parquet")


def load_rows() -> list[dict[str, Any]]:
    import pyarrow.parquet as pq  # calibrate group only
    from huggingface_hub import hf_hub_download

    path = hf_hub_download(DATASET[0], DATASET[1], repo_type="dataset")
    rows: list[dict[str, Any]] = pq.read_table(path).to_pylist()
    for r in rows:
        r["utt"] = Path(r["audio"]["path"]).stem
    return rows


def stratified(rows: list[dict[str, Any]], n: int, seed: int = 0) -> list[dict[str, Any]]:
    """n rows in proportion to each human total score, so the extremes aren't missed."""
    by_total: dict[int, list[dict[str, Any]]] = defaultdict(list)
    for r in sorted(rows, key=lambda r: r["utt"]):
        by_total[r["total"]].append(r)
    rng = random.Random(seed)  # noqa: S311 - reproducible sample
    out = []
    for _total, group in sorted(by_total.items()):
        k = max(1, round(n * len(group) / len(rows)))
        out += rng.sample(group, min(k, len(group)))
    return out[:n] if len(out) > n else out


def isotonic_loo(x: list[float], y: list[float]) -> tuple[dict[str, list[float]], dict[str, float]]:
    """Final isotonic knots, and leave-one-out predictions' agreement with the human score."""
    from sklearn.isotonic import IsotonicRegression

    def fit(xs: list[float], ys: list[float]) -> IsotonicRegression:
        return IsotonicRegression(out_of_bounds="clip").fit(xs, ys)

    loo = [
        float(fit(x[:i] + x[i + 1 :], y[:i] + y[i + 1 :]).predict([x[i]])[0]) for i in range(len(x))
    ]
    final = fit(x, y)
    errors = [p - t for p, t in zip(loo, y, strict=True)]
    metrics = {
        "n": len(x),
        "spearman_raw": _spearman(x, y),
        "mae_points": statistics.fmean(abs(e) for e in errors),
        "within_1_point": sum(abs(e) <= 1 for e in errors) / len(errors),
    }
    knots = {"x": final.X_thresholds_.tolist(), "y": final.y_thresholds_.tolist()}
    return knots, metrics


def _spearman(x: list[float], y: list[float]) -> float:
    rx, ry = (np.argsort(np.argsort(v)).astype(float) for v in (x, y))
    return float(np.corrcoef(rx, ry)[0, 1])


async def score_endpoint(rows: list[dict[str, Any]], runs: dict[str, Any]) -> None:
    url, token = os.environ["PRONUNCIATION_URL"], os.environ["PRONUNCIATION_TOKEN"]
    async with httpx.AsyncClient() as http:
        for r in rows:
            if "openpronounce" in runs.get(r["utt"], {}):
                continue
            answer = Answer(question="read aloud", start_s=0, end_s=0, transcript=r["text"])
            try:
                result = await score_clip(http, url, token, Clip(answer, r["audio"]["bytes"]))
            except httpx.HTTPError as e:
                log.warning("%s: endpoint failed: %r", r["utt"], e)
                continue
            runs.setdefault(r["utt"], {"total": r["total"]})["openpronounce"] = result.score


async def score_gemini(rows: list[dict[str, Any]], runs: dict[str, Any]) -> None:
    client = genai.Client(api_key=os.environ["GEMINI_API_KEY"])
    for r in rows:
        if "gemini" in runs.get(r["utt"], {}):
            continue
        question = f'Read this sentence aloud: "{r["text"]}"'
        try:
            judgement, _ = await judge(client, r["audio"]["bytes"], "part1", [question])
        except ScoringError as e:  # usually the daily cap: keep what we have, resume tomorrow
            log.warning("stopping Gemini runs: %s", e)
            return
        runs.setdefault(r["utt"], {"total": r["total"]})["gemini"] = judgement.pronunciation.band


def fit_and_report(runs: dict[str, Any], version: str) -> dict[str, Any]:
    out: dict[str, Any] = {"version": version, "band_per_point": BAND_PER_POINT}
    for path in ("gemini", "openpronounce"):
        done = [v for v in runs.values() if path in v]
        if len(done) < 10:
            raise SystemExit(f"only {len(done)} {path} runs; need at least 10 to calibrate")
        knots, metrics = isotonic_loo(
            [float(v[path]) for v in done], [float(v["total"]) for v in done]
        )
        out[path] = {**knots, "metrics": metrics}
    return out


def render(cal: dict[str, Any]) -> str:
    lines = [
        f"# Speaking pronunciation calibration {cal['version']}",
        "",
        "> **Read this first.** speechocean762 is read-aloud English from Mandarin L1 speakers,",
        "> scored 0-10 by experts; it isn't IELTS Speaking. Each path is mapped to that 0-10",
        f"> scale, then multiplied by {cal['band_per_point']} to give a band: an assumption until",
        "> examiner-scored Speaking samples exist. Train split only; leave-one-out.",
        "",
        "| Path | n | Spearman ρ (raw) | MAE, 0-10 (LOO) | Within ±1 point (LOO) |",
        "|---|---|---|---|---|",
    ]
    for path in ("gemini", "openpronounce"):
        m = cal[path]["metrics"]
        lines.append(
            f"| {path} | {m['n']} | {m['spearman_raw']:.2f} | {m['mae_points']:.2f} "
            f"| {m['within_1_point']:.0%} |"
        )
    return "\n".join(lines) + "\n"


def main() -> None:
    logging.basicConfig(level=logging.INFO, format="%(message)s")
    p = argparse.ArgumentParser()
    p.add_argument("--endpoint-n", type=int, default=200)
    p.add_argument("--gemini-n", type=int, default=60)
    args = p.parse_args()
    runs: dict[str, Any] = json.loads(RUNS.read_text()) if RUNS.exists() else {}
    rows = load_rows()
    sample = stratified(rows, max(args.endpoint_n, args.gemini_n))
    asyncio.run(score_endpoint(sample[: args.endpoint_n], runs))
    asyncio.run(score_gemini(stratified(sample, args.gemini_n, seed=1), runs))
    RUNS.write_text(json.dumps(runs, indent=1, sort_keys=True) + "\n")
    version = f"{datetime.now(UTC):%Y%m%d}-{os.environ.get('GITHUB_RUN_ID', 'local')}"
    cal = fit_and_report(runs, version)
    ARTIFACT.write_text(json.dumps(cal, indent=2) + "\n")
    (REPORT_DIR / f"speaking-pronunciation-{version}.md").write_text(render(cal))
    log.info("calibrated: %s", {k: cal[k]["metrics"] for k in ("gemini", "openpronounce")})


if __name__ == "__main__":
    main()
