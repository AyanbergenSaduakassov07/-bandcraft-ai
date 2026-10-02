"""Fit the fifth path: templated-vs-organic classifier plus a Platt calibrator for each path.

    uv run --group train python -m scoring_api.training.originality

Runs in the calibrate workflow after train.py and writes originality.json into the same artifact
folder (ADR-0003: a sub-second CPU fit, so GitHub Actions, not Kaggle). Templated essays and their
passage vectors come from the pgvector index; organic essays are the Gold Set's Task 2 Scripts,
embedded here. Needs GEMINI_API_KEY, SUPABASE_URL and SUPABASE_SECRET_KEY.
"""

import argparse
import asyncio
import json
import logging
import os
import statistics
from datetime import UTC, datetime
from functools import partial
from pathlib import Path
from typing import Any

import numpy as np
from google import genai
from sklearn.linear_model import LogisticRegression

from scoring_api.pipeline.ensemble import Logistic, OriginalityModel, save_originality, unit
from scoring_api.pipeline.features import paragraphs
from scoring_api.pipeline.originality import EMBEDDING_MODEL, gemini_embed
from scoring_api.training.template_index import GOLD, rest, retry, select_all

log = logging.getLogger(__name__)
ROOT = Path(__file__).resolve().parents[3]
SECRETS = ("GEMINI_API_KEY", "SUPABASE_URL", "SUPABASE_SECRET_KEY")


def essay_similarity(
    paragraph_vecs: np.ndarray, passage_vecs: np.ndarray, passage_ids: list[str], own_id: str = ""
) -> float:
    """Closest template passage to any of this essay's paragraphs, never one of its own."""
    if len(paragraph_vecs) == 0 or len(passage_vecs) == 0:
        return 0.0
    sims = unit(paragraph_vecs) @ unit(passage_vecs).T
    sims[:, np.asarray(passage_ids) == own_id] = -1.0
    return float(sims.max())


def _logistic(model: LogisticRegression) -> Logistic:
    return Logistic(coef=model.coef_[0].tolist(), intercept=float(model.intercept_[0]))


def _fit_lr(x: np.ndarray, y: np.ndarray) -> LogisticRegression:
    # Balanced: the templated class outnumbers the 10 organic Task 2 Scripts several times over.
    return LogisticRegression(C=1.0, class_weight="balanced", max_iter=2000).fit(x, y)


def fit(
    vectors: np.ndarray, similarities: np.ndarray, templated: np.ndarray, embedding_model: str
) -> tuple[OriginalityModel, dict[str, Any]]:
    """vectors: Script embeddings; similarities: closest-template scores; templated: labels 0/1."""
    x, y = unit(vectors), templated.astype(int)
    # Leave-one-out logits: the classifier's Platt calibrator must see scores on unseen essays.
    loo = np.asarray(
        [
            _fit_lr(np.delete(x, i, 0), np.delete(y, i)).decision_function(x[i : i + 1])[0]
            for i in range(len(y))
        ]
    )
    classifier_platt = _fit_lr(loo.reshape(-1, 1), y)
    embedding_platt = _fit_lr(similarities.reshape(-1, 1), y)
    model = OriginalityModel(
        embedding_model=embedding_model,
        classifier=_logistic(_fit_lr(x, y)),
        classifier_platt=_logistic(classifier_platt),
        embedding_platt=_logistic(embedding_platt),
    )
    risk_c = classifier_platt.predict_proba(loo.reshape(-1, 1))[:, 1]
    risk_e = embedding_platt.predict_proba(similarities.reshape(-1, 1))[:, 1]
    blended = (risk_c + risk_e) / 2

    def recall(risk: np.ndarray, label: int) -> float:
        hits = (risk >= 0.5) == bool(label)
        return float(hits[y == label].mean())

    report = {
        "n_organic": int((y == 0).sum()),
        "n_templated": int((y == 1).sum()),
        "passage_threshold": model.passage_threshold,
        "similarity_mean": {
            "organic": statistics.fmean(similarities[y == 0]),
            "templated": statistics.fmean(similarities[y == 1]),
        },
        "paths": {
            name: {"templated_caught": recall(r, 1), "organic_passed": recall(r, 0)}
            for name, r in (("classifier", risk_c), ("embedding", risk_e), ("blended", blended))
        },
    }
    return model, report


def render(report: dict[str, Any], version: str) -> str:
    sim = report["similarity_mean"]
    lines = [
        f"# Originality paths {version}",
        "",
        "> **Read this first.** Both classes are synthetic. Gemini writes the templated essays;",
        f"> the {report['n_organic']} organic essays are the Gold Set's Task 2 Scripts, written by",
        "> the author. A classifier can learn who wrote an essay rather than how formulaic it is,",
        "> and with this few organic essays one essay moves a rate by 10 points. These numbers",
        "> check the pipeline works; they are not evidence it detects templates in real writing.",
        "",
        f"Organic n = {report['n_organic']}, templated n = {report['n_templated']}. "
        "Classifier rates are leave-one-out; the embedding path excludes each templated essay's "
        "own passages from its search.",
        "",
        "| Path | Templated flagged | Organic passed |",
        "|---|---|---|",
    ]
    for name, r in report["paths"].items():
        lines.append(f"| {name} | {r['templated_caught']:.0%} | {r['organic_passed']:.0%} |")
    lines += [
        "",
        f"Mean closest-template similarity: organic {sim['organic']:.3f}, "
        f"templated {sim['templated']:.3f}. Passages above {report['passage_threshold']:.3f} "
        "are quoted in the warning.",
    ]
    return "\n".join(lines) + "\n"


async def load(client: genai.Client) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    db = rest(os.environ["SUPABASE_URL"], os.environ["SUPABASE_SECRET_KEY"])
    essays = select_all(db, "template_essays", "id,embedding", "id")
    passages = select_all(db, "template_passages", "essay_id,embedding", "essay_id,position")
    if not essays:
        raise LookupError("template index is empty: run the template-index workflow first")
    p_vecs = np.asarray([json.loads(p["embedding"]) for p in passages])
    p_ids = [p["essay_id"] for p in passages]
    by_essay: dict[str, list[int]] = {}
    for i, essay_id in enumerate(p_ids):
        by_essay.setdefault(essay_id, []).append(i)

    vectors, sims, labels = [], [], []
    for e in essays:
        vectors.append(json.loads(e["embedding"]))
        sims.append(essay_similarity(p_vecs[by_essay.get(e["id"], [])], p_vecs, p_ids, e["id"]))
        labels.append(1)
    for path in sorted(GOLD.glob("t2-*.json")):
        script = json.loads(path.read_text())["script"]
        paras = paragraphs(script)
        embedded = await retry(partial(gemini_embed, [script, *paras], client=client))
        vectors.append(embedded[0])
        sims.append(essay_similarity(np.asarray(embedded[1:]), p_vecs, p_ids))
        labels.append(0)
    return np.asarray(vectors), np.asarray(sims), np.asarray(labels)


def newest_bundle() -> Path:
    dirs = sorted(
        p for p in (ROOT / "artifacts/calibration").glob("*") if (p / "bundle.json").exists()
    )
    if not dirs:
        raise SystemExit("no calibration artifact: run train.py first")
    return dirs[-1]


def main() -> None:
    logging.basicConfig(level=logging.INFO, format="%(message)s")
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--bundle", type=Path, help="artifact folder (default: newest)")
    args = parser.parse_args()
    bundle = args.bundle or newest_bundle()
    missing = [k for k in SECRETS if not os.environ.get(k)]
    if missing:
        # Calibration still ships; the API simply serves no originality check until this runs.
        log.warning("originality skipped, missing %s", ", ".join(missing))
        return

    client = genai.Client(api_key=os.environ["GEMINI_API_KEY"])
    try:
        vectors, sims, labels = asyncio.run(load(client))
    except LookupError as e:
        log.warning("originality skipped: %s", e)
        return
    model, report = fit(vectors, sims, labels, EMBEDDING_MODEL)
    model.meta = {"trained_at": datetime.now(UTC).isoformat(timespec="seconds"), **report}
    save_originality(model, bundle)
    out = ROOT.parents[1] / "docs/benchmarks" / f"originality-{bundle.name}.md"
    out.write_text(render(report, bundle.name))
    log.info("saved %s and %s", bundle / "originality.json", out)


if __name__ == "__main__":
    main()
