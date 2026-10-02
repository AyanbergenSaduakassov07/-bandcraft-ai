"""Collocation Feature with TOY reference counts; the real ones are built in CI (WikiText-103)."""

import json

import pytest
from test_final import toy_rows

from scoring_api.pipeline import collocations
from scoring_api.pipeline.collocations import Reference, collocation_issues, parse
from scoring_api.pipeline.draft import normalise
from scoring_api.pipeline.features import _nlp, extract_features
from scoring_api.pipeline.final import feature_evidence
from scoring_api.schemas import DraftResponse, Issue, RubricResult

TOY = """# relation\tpartner\tnoun\tcount
dobj\t*\t*\t10000
dobj\tgive\t*\t800
dobj\tcause\t*\t300
dobj\tprovide\t*\t200
dobj\t*\tdistraction\t60
dobj\tcause\tdistraction\t35
dobj\tprovide\tdistraction\t20
amod\t*\t*\t5000
amod\theavy\t*\t100
amod\tstrong\t*\t400
amod\t*\train\t50
amod\theavy\train\t30
"""


def toy() -> Reference:
    ref = parse(iter(TOY.splitlines(keepends=True)))
    ref.max_count, ref.min_expected = 1, 3.0
    return ref


def test_reference_maths() -> None:
    ref = toy()
    assert ref.count("dobj", "cause", "distraction") == 35
    assert ref.count("dobj", "give", "distraction") == 0  # absent, or seen once and not stored
    assert ref.expected("dobj", "give", "distraction") == pytest.approx(800 * 60 / 10000)
    assert ref.implausible("dobj", "give", "distraction")
    assert not ref.implausible("dobj", "cause", "distraction")
    assert not ref.implausible("dobj", "give", "zebra")  # unknown noun: no expectation, no flag
    assert ref.alternatives("dobj", "distraction", exclude="give") == ["cause", "provide"]


def test_flags_quote_the_script_with_usual_partners() -> None:
    text = "Phones give a distraction in class. Phones cause a distraction too. We had strong rain."
    issues = collocation_issues(_nlp()(text), toy())
    assert [(i.rule, i.text) for i in issues] == [
        ("collocation_dobj", "give a distraction"),
        ("collocation_amod", "strong rain"),
    ]
    assert all(text[i.start : i.end] == i.text for i in issues)
    assert issues[0].suggestion and "cause, provide" in issues[0].suggestion
    assert issues[1].suggestion and "heavy" in issues[1].suggestion


def test_missing_reference_flags_nothing() -> None:
    assert collocation_issues(_nlp()("Phones give a distraction."), None) == []


def test_flags_become_lexical_resource_evidence(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(collocations, "reference", toy)
    monkeypatch.setattr("scoring_api.pipeline.features.reference", toy)
    script = normalise("Phones give a distraction in class.")
    features = extract_features(script, "task2")
    assert features.collocation_issue_count == 1
    draft = DraftResponse(
        task_type="task2",
        features=features,
        rubric=RubricResult(model="toy", criteria={}, overall_raw=0),
        latency_ms=0,
    )
    [ev] = feature_evidence(draft, "lexical_resource")
    assert ev.source == "features" and ev.verified and script[ev.start : ev.end] == ev.quote
    assert feature_evidence(draft, "grammatical_range_accuracy") == []


def test_real_reference_loads_when_built() -> None:
    if not collocations.PAIRS_FILE.exists():
        pytest.skip("reference not built yet (collocations workflow)")
    ref = collocations.reference()
    assert ref is not None and ref.totals["dobj"] > 0
    meta = json.loads(collocations.META_FILE.read_text())
    assert "CC BY-SA" in meta["source"]["license"]


def test_gold_features_still_extract() -> None:
    assert all(isinstance(r.features.collocation_issue_count, int) for r in toy_rows())
    assert Issue(rule="x", start=0, end=1, text="a").suggestion is None
