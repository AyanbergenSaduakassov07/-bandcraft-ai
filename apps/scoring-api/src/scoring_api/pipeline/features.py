"""Stage 2: deterministic feature extraction. No model calls; same Script in, same Features out."""

import re
import statistics
from functools import lru_cache

import spacy
from spacy.language import Language
from spacy.tokens import Doc, Token
from spellchecker import SpellChecker

from scoring_api.schemas import WORD_FLOOR, FeatureVector, Issue, TaskType

# Longest first, so "on the other hand" is counted once rather than also as "other".
COHESION_MARKERS = sorted(
    [
        "however",
        "moreover",
        "furthermore",
        "in addition",
        "additionally",
        "also",
        "therefore",
        "thus",
        "consequently",
        "as a result",
        "hence",
        "firstly",
        "secondly",
        "thirdly",
        "finally",
        "first of all",
        "for example",
        "for instance",
        "such as",
        "on the other hand",
        "in contrast",
        "whereas",
        "while",
        "although",
        "nevertheless",
        "nonetheless",
        "in conclusion",
        "to sum up",
        "to conclude",
        "overall",
        "in short",
        "similarly",
        "likewise",
        "because",
        "since",
        "so",
    ],
    key=len,
    reverse=True,
)
_MARKER_RE = re.compile(r"\b(" + "|".join(re.escape(m) for m in COHESION_MARKERS) + r")\b", re.I)
_OVERVIEW_RE = re.compile(
    r"^(overall|in general|generally|in summary|to summarise|it is clear)", re.I
)
_CONCLUSION_RE = re.compile(
    r"^(in conclusion|to conclude|to sum up|in summary|in short|overall|to summarise)", re.I
)
_SIGN_OFF_RE = re.compile(
    r"(yours (faithfully|sincerely|truly)|best (wishes|regards)|kind regards|regards"
    r"|all the best|love|cheers),?\s*$",
    re.I | re.M,
)

_SINGULAR_PRONOUNS = {"he", "she", "it", "this", "that"}
_PLURAL_PRONOUNS = {"they", "we", "these", "those"}
_AN_EXCEPTIONS = ("hour", "honest", "honour", "honor", "heir")
_A_EXCEPTIONS = ("uni", "use", "usu", "eu", "one", "once", "ur")
_MATTR_WINDOW = 50


@lru_cache(maxsize=1)
def _nlp() -> Language:
    return spacy.load("en_core_web_sm")


@lru_cache(maxsize=1)
def _speller() -> SpellChecker:
    return SpellChecker()


def paragraphs(text: str) -> list[str]:
    """Blank-line separated paragraphs; single newlines when there are no blank lines."""
    parts = re.split(r"\n\s*\n", text.strip())
    if len(parts) == 1:
        parts = text.strip().split("\n")
    return [p.strip() for p in parts if p.strip()]


def _is_word(t: Token) -> bool:
    return not (t.is_punct or t.is_space) and any(c.isalnum() for c in t.text)


def _mattr(tokens: list[str]) -> float:
    if not tokens:
        return 0.0
    if len(tokens) <= _MATTR_WINDOW:
        return len(set(tokens)) / len(tokens)
    windows = range(len(tokens) - _MATTR_WINDOW + 1)
    return statistics.fmean(
        len(set(tokens[i : i + _MATTR_WINDOW])) / _MATTR_WINDOW for i in windows
    )


def _cohesion(text: str) -> tuple[int, int, float]:
    found = [m.group(1).lower() for m in _MARKER_RE.finditer(text)]
    if not found:
        return 0, 0, 0.0
    top = max(found.count(m) for m in set(found))
    return len(found), len(set(found)), top / len(found)


def _spelling_issues(doc: Doc) -> list[Issue]:
    speller = _speller()
    issues = []
    for t in doc:
        # Skip capitalised words mid-sentence: names and places, not misspellings.
        if not t.is_alpha or len(t.text) < 3 or (t.text[0].isupper() and not t.is_sent_start):
            continue
        if speller.unknown([t.lower_]) and not _british_variant_known(t.lower_, speller):
            issues.append(Issue(rule="spelling", start=t.idx, end=t.idx + len(t), text=t.text))
    return issues


# British -> US endings; the dictionary is US English, and IELTS accepts either consistently.
_BRITISH_ENDINGS = [
    ("isation", "ization"),
    ("isations", "izations"),
    ("ise", "ize"),
    ("ised", "ized"),
    ("ises", "izes"),
    ("ising", "izing"),
    ("our", "or"),
    ("ours", "ors"),
    ("ourhood", "orhood"),
    ("ourhoods", "orhoods"),
    ("tre", "ter"),
    ("tres", "ters"),
    ("lled", "led"),
    ("lling", "ling"),
    ("ogue", "og"),
    ("ence", "ense"),
]


def _british_variant_known(word: str, speller: SpellChecker) -> bool:
    return any(
        word.endswith(uk) and not speller.unknown([word[: -len(uk)] + us])
        for uk, us in _BRITISH_ENDINGS
    )


def _number(subj: Token) -> str | None:
    """'sing3', 'plural', or None when agreement can't be judged (I/you, relatives, unknown)."""
    if subj.tag_ in ("WDT", "WP"):  # "institutions that make": number comes from the antecedent
        return None
    if any(c.dep_ == "conj" for c in subj.children):
        return "plural"
    if subj.tag_ in ("NNS", "NNPS") or subj.lower_ in _PLURAL_PRONOUNS:
        return "plural"
    if subj.tag_ in ("NN", "NNP") or subj.lower_ in _SINGULAR_PRONOUNS:
        return "sing3"
    return None


def _agreement_issues(doc: Doc) -> list[Issue]:
    issues = []
    for subj in (t for t in doc if t.dep_ == "nsubj"):
        head = subj.head
        finite = next(
            (c for c in head.children if c.dep_ == "aux" and c.tag_ in ("VBZ", "VBP", "VBD")), head
        )
        number = _number(subj)
        if number is None:
            continue
        subjunctive = any(t.lower_ in ("if", "wish") for t in subj.sent)
        wrong = (
            (number == "sing3" and finite.tag_ == "VBP")
            or (number == "plural" and finite.tag_ == "VBZ")
            or (number == "plural" and finite.lower_ == "was")
            or (number == "sing3" and finite.lower_ == "were" and not subjunctive)
        )
        if wrong:
            first, last = sorted((subj, finite), key=lambda t: t.idx)
            start, end = first.idx, last.idx + len(last)
            issues.append(Issue(rule="agreement", start=start, end=end, text=doc.text[start:end]))
    return issues


def _regex_issues(text: str) -> list[Issue]:
    issues = []
    for m in re.finditer(r"\b(a|an)\s+([A-Za-z][a-z]+)", text, re.I):
        article, word = m.group(1).lower(), m.group(2).lower()
        vowel = word[0] in "aeiou"
        if article == "a" and vowel and not word.startswith(_A_EXCEPTIONS):
            issues.append(Issue(rule="article", start=m.start(), end=m.end(), text=m.group(0)))
        elif article == "an" and not vowel and not word.startswith(_AN_EXCEPTIONS):
            issues.append(Issue(rule="article", start=m.start(), end=m.end(), text=m.group(0)))
    for m in re.finditer(r"\b(\w+)\s+\1\b", text, re.I):
        if m.group(1).lower() not in ("that", "had"):
            issues.append(
                Issue(rule="repeated_word", start=m.start(), end=m.end(), text=m.group(0))
            )
    for m in re.finditer(r"(?:^|[.!?]\s+)([a-z])", text, re.M):
        issues.append(Issue(rule="capitalisation", start=m.start(1), end=m.end(1), text=m.group(1)))
    for m in re.finditer(r"\bi\b", text):
        issues.append(Issue(rule="capitalisation", start=m.start(), end=m.end(), text="i"))
    return issues


def _structure(paras: list[str], task_type: TaskType) -> dict[str, bool | None]:
    academic, general = task_type == "task1_academic", task_type == "task1_general"
    return {
        "has_overview": any(_OVERVIEW_RE.match(p) for p in paras) if academic else None,
        "has_conclusion": (
            bool(paras and _CONCLUSION_RE.match(paras[-1])) if task_type == "task2" else None
        ),
        "has_salutation": bool(paras and paras[0].lower().startswith("dear")) if general else None,
        "has_sign_off": bool(_SIGN_OFF_RE.search("\n".join(paras[-3:]))) if general else None,
    }


def extract_features(script: str, task_type: TaskType) -> FeatureVector:
    doc = _nlp()(script)
    words = [t for t in doc if _is_word(t)]
    lemmas = [t.lemma_.lower() for t in words if t.is_alpha]
    sentence_lengths = [sum(1 for t in s if _is_word(t)) for s in doc.sents]
    sentence_lengths = [n for n in sentence_lengths if n] or [0]
    subordinate = [
        s
        for s in doc.sents
        if any(t.dep_ in ("advcl", "relcl", "ccomp", "csubj", "acl") for t in s)
    ]
    paras = paragraphs(script)
    markers, distinct, top_share = _cohesion(script)
    spelling = _spelling_issues(doc)
    grammar = _agreement_issues(doc) + _regex_issues(script)
    n = len(words)
    per_100 = 100 / n if n else 0.0
    floor = WORD_FLOOR[task_type]
    return FeatureVector(
        word_count=n,
        word_floor=floor,
        below_word_floor=n < floor,
        paragraph_count=len(paras),
        mean_paragraph_words=round(n / len(paras), 1) if paras else 0.0,
        **_structure(paras, task_type),
        sentence_count=len(sentence_lengths),
        mean_sentence_words=round(statistics.fmean(sentence_lengths), 2),
        sentence_length_variance=round(statistics.pvariance(sentence_lengths), 2),
        subordinate_clause_rate=round(len(subordinate) / len(sentence_lengths), 3),
        type_token_ratio=round(len(set(lemmas)) / len(lemmas), 3) if lemmas else 0.0,
        mattr=round(_mattr(lemmas), 3),
        cohesion_marker_count=markers,
        cohesion_markers_per_100_words=round(markers * per_100, 2),
        distinct_cohesion_markers=distinct,
        top_cohesion_marker_share=round(top_share, 3),
        spelling_error_count=len(spelling),
        grammar_issue_count=len(grammar),
        errors_per_100_words=round((len(spelling) + len(grammar)) * per_100, 2),
        issues=sorted(spelling + grammar, key=lambda i: i.start),
    )
