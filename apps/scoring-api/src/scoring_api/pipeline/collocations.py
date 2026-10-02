"""Collocation plausibility: is this verb-object or adjective-noun pairing attested in real English?

The reference is pair counts parsed from WikiText-103 (Wikipedia, CC BY-SA 3.0) by
training/collocations.py in the collocations workflow. It's static data, loaded once: free,
deterministic and offline. A pairing is flagged when both words are common but the pair is rare:
if the two words combined at random, seeing the pair this seldom would have probability below
`alpha` (Poisson tail). `alpha` is tuned against the Gold Set (collocations.json, tuning).
"""

import gzip
import json
import logging
import math
from collections.abc import Iterator
from dataclasses import dataclass, field
from functools import cache
from pathlib import Path

from spacy.tokens import Doc, Token

from scoring_api.schemas import Issue

log = logging.getLogger(__name__)
DATA = Path(__file__).resolve().parents[1] / "data"
PAIRS_FILE = DATA / "collocations.tsv.gz"
META_FILE = DATA / "collocations.json"
RELATIONS = ("dobj", "amod")  # verb + object noun, adjective + noun
MAX_GAP = 5  # verb to object; further apart and the quote stops reading as a pairing
MAX_ADJ_GAP = 2  # adjective before its noun, allowing one word between ("heavy summer rain")
ANY = "*"


@dataclass
class Reference:
    pairs: dict[tuple[str, str, str], int]  # (relation, partner, noun) -> count; stored if >= 2
    partners: dict[tuple[str, str], int]  # (relation, partner) -> all pairings with that partner
    nouns: dict[tuple[str, str], int]  # (relation, noun) -> all pairings with that noun
    totals: dict[str, int]  # relation -> all pairings
    alpha: float = 0.01
    top: dict[tuple[str, str], list[str]] = field(default_factory=dict)  # usual partners per noun

    def count(self, rel: str, partner: str, noun: str) -> int:
        return self.pairs.get((rel, partner, noun), 0)

    def expected(self, rel: str, partner: str, noun: str) -> float:
        """Pairings expected if partner and noun combined at random: c(partner) c(noun) / N."""
        total = self.totals.get(rel, 0)
        if not total:
            return 0.0
        return self.partners.get((rel, partner), 0) * self.nouns.get((rel, noun), 0) / total

    def surprise(self, rel: str, partner: str, noun: str) -> float:
        """P(count this low | random pairing). Pairs under MIN_STORED read as 1: maybe seen once."""
        return poisson_cdf(
            max(self.count(rel, partner, noun), 1), self.expected(rel, partner, noun)
        )

    def implausible(self, rel: str, partner: str, noun: str) -> bool:
        return self.surprise(rel, partner, noun) < self.alpha

    def alternatives(self, rel: str, noun: str, exclude: str, k: int = 3) -> list[str]:
        return [p for p in self.top.get((rel, noun), []) if p != exclude][:k]


def parse(lines: Iterator[str]) -> Reference:
    """Read the TSV rows: relation, partner, noun, count. '*' marks a marginal or total row."""
    ref = Reference(pairs={}, partners={}, nouns={}, totals={})
    for line in lines:
        if line.startswith("#"):
            continue
        rel, partner, noun, raw = line.rstrip("\n").split("\t")
        n = int(raw)
        if partner == ANY and noun == ANY:
            ref.totals[rel] = n
        elif noun == ANY:
            ref.partners[(rel, partner)] = n
        elif partner == ANY:
            ref.nouns[(rel, noun)] = n
        else:
            ref.pairs[(rel, partner, noun)] = n
    ranked: dict[tuple[str, str], list[tuple[int, str]]] = {}
    for (rel, partner, noun), n in ref.pairs.items():
        ranked.setdefault((rel, noun), []).append((n, partner))
    ref.top = {key: [p for _, p in sorted(v, reverse=True)[:6]] for key, v in ranked.items()}
    return ref


@cache
def reference() -> Reference | None:
    """The bundled reference with its tuned thresholds, or None before the data has been built."""
    if not PAIRS_FILE.exists():
        log.warning("no collocation reference at %s: run the collocations workflow", PAIRS_FILE)
        return None
    with gzip.open(PAIRS_FILE, "rt", encoding="utf-8") as f:
        ref = parse(f)
    if META_FILE.exists():
        tuned = json.loads(META_FILE.read_text()).get("thresholds", {})
        ref.alpha = float(tuned.get("alpha", ref.alpha))
    return ref


def poisson_cdf(k: int, lam: float) -> float:
    """P(X <= k) for X ~ Poisson(lam)."""
    term = total = math.exp(-lam)
    for i in range(1, k + 1):
        term *= lam / i
        total += term
    return min(1.0, total)


def lemma(t: Token) -> str:
    return t.lemma_.lower()


def pairings(doc: Doc) -> Iterator[tuple[str, Token, Token]]:
    """(relation, partner, noun) for each verb-object and adjective-noun pairing in a parsed doc.

    The corpus builder uses this too, so the reference and the check parse the same way.
    """
    for t in doc:
        if t.pos_ != "NOUN" or not t.is_alpha:
            continue
        if t.dep_ == "dobj" and t.head.pos_ == "VERB" and t.head.is_alpha:
            yield "dobj", t.head, t
        for child in t.children:
            if child.dep_ == "amod" and child.pos_ == "ADJ" and child.is_alpha:
                if 0 < t.i - child.i <= MAX_ADJ_GAP:
                    yield "amod", child, t


def collocation_issues(doc: Doc, ref: Reference | None) -> list[Issue]:
    """Pairings the reference says are implausible, quoted from the Script with offsets."""
    if ref is None:
        return []
    issues = []
    for rel, partner, noun in pairings(doc):
        p, n = lemma(partner), lemma(noun)
        if abs(partner.i - noun.i) > MAX_GAP or not ref.implausible(rel, p, n):
            continue
        start = min(partner.idx, noun.idx)
        end = max(partner.idx + len(partner), noun.idx + len(noun))
        usual = ref.alternatives(rel, n, exclude=p)
        issues.append(
            Issue(
                rule=f"collocation_{rel}",
                start=start,
                end=end,
                text=doc.text[start:end],
                suggestion=(
                    f"“{p} … {n}” is rare in the reference corpus."
                    + (f" Usual partners for “{n}”: {', '.join(usual)}." if usual else "")
                ),
            )
        )
    return issues
