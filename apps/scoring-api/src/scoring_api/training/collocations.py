"""Build the collocation reference from WikiText-103, then tune its thresholds on the Gold Set.

    uv run --with pyarrow python -m scoring_api.training.collocations build
    uv run python -m scoring_api.training.collocations tune

Runs in the collocations GitHub Actions workflow: parsing ~25M words with spaCy isn't laptop work.
Writes src/scoring_api/data/collocations.tsv.gz (pair counts), collocations.json (provenance and
thresholds) and docs/benchmarks/collocations.md (the tuning report).
"""

import argparse
import gzip
import json
import logging
import os
import tempfile
import urllib.request
from collections import Counter
from collections.abc import Iterator
from datetime import UTC, datetime
from itertools import product
from pathlib import Path
from typing import Any

import spacy

from scoring_api.pipeline.collocations import (
    ANY,
    MAX_GAP,
    META_FILE,
    PAIRS_FILE,
    Reference,
    lemma,
    pairings,
    parse,
)

log = logging.getLogger(__name__)
ROOT = Path(__file__).resolve().parents[3]
GOLD = ROOT / "tests/fixtures/gold"
PROBES = ROOT / "tests/fixtures/collocations/probes.json"
REPORT = ROOT.parents[1] / "docs/benchmarks/collocations.md"
SOURCE = {
    "name": "WikiText-103 (raw), train split",
    "url": "https://huggingface.co/datasets/Salesforce/wikitext",
    "license": "CC BY-SA 3.0 (text from English Wikipedia)",
    "parquet": "https://huggingface.co/api/datasets/Salesforce/wikitext/parquet/wikitext-103-raw-v1/train/0.parquet",
}
MIN_STORED = 2  # pairs seen once are noise at this size; marginals still count them
_DETOK = [(" @-@ ", "-"), (" @,@ ", ","), (" @.@ ", "."), (" , ", ", "), (" . ", ". ")]

# Tuning constraints: the chosen thresholds catch as many probe errors as they can while flagging
# at most this often on correct text.
MAX_RIGHT_FLAGGED = 0.10  # share of the probes' correct sentences with any flag
MAX_STRONG_PER_100 = 0.5  # flags per 100 words on Gold Scripts banded 7 or above
GRID_MAX_COUNT = (1, 2, 3, 5)
GRID_MIN_EXPECTED = (1.0, 2.0, 3.0, 5.0, 8.0, 13.0, 20.0, 35.0)


def paragraphs_from_wikitext(path: Path, max_words: int) -> Iterator[str]:
    """Article paragraphs, detokenised, headings skipped, until the word budget is spent."""
    import pyarrow.parquet as pq  # build-time only: uv run --with pyarrow

    words = 0
    for batch in pq.ParquetFile(path).iter_batches(columns=["text"], batch_size=4096):
        for line in batch.column(0).to_pylist():
            line = line.strip()
            if not line or line.startswith("="):
                continue
            for a, b in _DETOK:
                line = line.replace(a, b)
            words += line.count(" ") + 1
            yield line
            if words >= max_words:
                return


def build(max_words: int) -> dict[str, Any]:
    with tempfile.TemporaryDirectory() as tmp:
        parquet = Path(tmp) / "train-0.parquet"
        log.info("downloading %s", SOURCE["parquet"])
        urllib.request.urlretrieve(SOURCE["parquet"], parquet)  # noqa: S310 - fixed https URL
        nlp = spacy.load("en_core_web_sm", disable=["ner"])
        counts: Counter[tuple[str, str, str]] = Counter()
        texts = paragraphs_from_wikitext(parquet, max_words)
        for i, doc in enumerate(nlp.pipe(texts, batch_size=256, n_process=os.cpu_count() or 1)):
            counts.update((rel, lemma(p), lemma(n)) for rel, p, n in pairings(doc))
            if i % 50_000 == 0:
                log.info("%d paragraphs, %d distinct pairings", i, len(counts))

    partners: Counter[tuple[str, str]] = Counter()
    nouns: Counter[tuple[str, str]] = Counter()
    totals: Counter[str] = Counter()
    for (rel, p, n), c in counts.items():
        partners[(rel, p)] += c
        nouns[(rel, n)] += c
        totals[rel] += c

    PAIRS_FILE.parent.mkdir(parents=True, exist_ok=True)
    with gzip.open(PAIRS_FILE, "wt", encoding="utf-8", compresslevel=9) as f:
        f.write(
            f"# relation\tpartner\tnoun\tcount. Source: {SOURCE['name']}, {SOURCE['license']}\n"
        )
        for rel, c in sorted(totals.items()):
            f.write(f"{rel}\t{ANY}\t{ANY}\t{c}\n")
        for (rel, partner), c in sorted(partners.items()):
            f.write(f"{rel}\t{partner}\t{ANY}\t{c}\n")
        for (rel, noun), c in sorted(nouns.items()):
            f.write(f"{rel}\t{ANY}\t{noun}\t{c}\n")
        for (rel, partner, noun), c in sorted(counts.items()):
            if c >= MIN_STORED:
                f.write(f"{rel}\t{partner}\t{noun}\t{c}\n")
    meta = {
        "source": SOURCE,
        "words": max_words,
        "built_at": datetime.now(UTC).isoformat(timespec="seconds"),
        "pairings": dict(totals),
        "stored_pairs": sum(1 for n in counts.values() if n >= MIN_STORED),
        "min_stored": MIN_STORED,
    }
    META_FILE.write_text(json.dumps(meta, indent=2) + "\n")
    return meta


Stats = list[tuple[int, float]]  # (pair count, expected count) for each pairing in a text


def _stats(nlp: spacy.language.Language, text: str, ref: Reference) -> Stats:
    out = []
    for rel, p, n in pairings(nlp(text)):
        if abs(p.i - n.i) <= MAX_GAP:
            a, b = lemma(p), lemma(n)
            out.append((ref.count(rel, a, b), ref.expected(rel, a, b)))
    return out


def _flags(stats: Stats, max_count: int, min_expected: float) -> int:
    return sum(c <= max_count and e >= min_expected for c, e in stats)


def tune(ref: Reference) -> dict[str, Any]:
    """Grid over (max_count, min_expected) on the probes and the strong Gold Scripts."""
    nlp = spacy.load("en_core_web_sm")
    probes = json.loads(PROBES.read_text())["probes"]
    wrong = [_stats(nlp, p["wrong"], ref) for p in probes]
    right = [_stats(nlp, p["right"], ref) for p in probes]
    strong = []
    for path in sorted(GOLD.glob("*.json")):
        essay = json.loads(path.read_text())
        if essay["gold"]["overall"] >= 7:
            strong.append((_stats(nlp, essay["script"], ref), len(essay["script"].split())))
    strong_words = sum(w for _, w in strong)

    grid = []
    for max_count, min_expected in product(GRID_MAX_COUNT, GRID_MIN_EXPECTED):
        grid.append(
            {
                "max_count": max_count,
                "min_expected": min_expected,
                "probe_recall": sum(_flags(s, max_count, min_expected) > 0 for s in wrong)
                / len(wrong),
                "right_flagged": sum(_flags(s, max_count, min_expected) > 0 for s in right)
                / len(right),
                "strong_per_100": 100
                * sum(_flags(s, max_count, min_expected) for s, _ in strong)
                / strong_words,
            }
        )
    allowed = [
        g
        for g in grid
        if g["right_flagged"] <= MAX_RIGHT_FLAGGED and g["strong_per_100"] <= MAX_STRONG_PER_100
    ]
    # Most recall; then fewest flags on strong essays; then the stricter (higher) expectation.
    best = max(
        allowed or grid,
        key=lambda g: (g["probe_recall"], -g["strong_per_100"], g["min_expected"]),
    )
    return {
        "chosen": best,
        "met_constraints": bool(allowed),
        "probes": len(probes),
        "strong_essays": len(strong),
        "strong_words": strong_words,
        "grid": grid,
    }


def render(meta: dict[str, Any], tuning: dict[str, Any]) -> str:
    b = tuning["chosen"]
    lines = [
        "# Collocation Feature: reference and thresholds",
        "",
        "> **Read this first.** Thresholds were chosen on the same probes and Gold Scripts they",
        "> are reported on, so these rates are optimistic. The probes are author-written learner",
        f"> errors ({tuning['probes']} pairs), and the {tuning['strong_essays']} strong Gold",
        "> Scripts are author-written too. The rates show the check behaves sensibly, not how it",
        "> performs on real candidates.",
        "",
        f"Reference: {meta['source']['name']} ({meta['source']['license']}), first "
        f"{meta['words']:,} words, parsed with spaCy `en_core_web_sm`. "
        f"{meta['stored_pairs']:,} pairs stored (seen at least {meta['min_stored']} times).",
        "",
        f"Chosen: flag a pairing seen at most **{b['max_count']}** times when chance alone "
        f"predicts at least **{b['min_expected']:g}**. "
        + (
            "" if tuning["met_constraints"] else "No setting met both constraints; least bad shown."
        ),
        "",
        "| Probe errors caught | Correct probes flagged | Flags per 100 words, strong essays |",
        "|---|---|---|",
        f"| {b['probe_recall']:.0%} | {b['right_flagged']:.0%} | {b['strong_per_100']:.2f} |",
        "",
        f"Constraints: correct probes flagged at most {MAX_RIGHT_FLAGGED:.0%}, at most "
        f"{MAX_STRONG_PER_100} flags per 100 words on Gold Scripts banded 7 or above "
        f"({tuning['strong_words']:,} words).",
    ]
    return "\n".join(lines) + "\n"


def main() -> None:
    logging.basicConfig(level=logging.INFO, format="%(message)s")
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("step", choices=["build", "tune"])
    parser.add_argument("--max-words", type=int, default=25_000_000)
    args = parser.parse_args()
    if args.step == "build":
        meta = build(args.max_words)
        log.info("stored %d pairs", meta["stored_pairs"])
        return
    meta = json.loads(META_FILE.read_text())
    with gzip.open(PAIRS_FILE, "rt", encoding="utf-8") as f:
        ref = parse(f)
    tuning = tune(ref)
    meta["thresholds"] = {k: tuning["chosen"][k] for k in ("max_count", "min_expected")}
    meta["tuning"] = {k: v for k, v in tuning.items() if k != "grid"}
    META_FILE.write_text(json.dumps(meta, indent=2) + "\n")
    REPORT.write_text(render(meta, tuning))
    log.info("thresholds %s; report %s", meta["thresholds"], REPORT)


if __name__ == "__main__":
    main()
