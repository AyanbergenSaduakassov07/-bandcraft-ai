"""Stage 2 checks: unit cases per rule, then ordering over the five quality-tagged gold essays."""

import pytest
from conftest import gold_by_id, load_gold

from scoring_api.features import extract_features, paragraphs
from scoring_api.pipeline import normalise
from scoring_api.schemas import FeatureVector


def features(essay_id: str) -> FeatureVector:
    essay = gold_by_id(essay_id)
    return extract_features(normalise(essay["script"]), essay["task_type"])


def rules(text: str) -> list[str]:
    return [i.rule for i in extract_features(text, "task2").issues]


def test_paragraphs_blank_lines_and_single_newlines() -> None:
    assert len(paragraphs("One.\n\nTwo.\n\n\nThree.")) == 3
    assert len(paragraphs("One.\nTwo.")) == 2


def test_agreement_errors_detected() -> None:
    assert "agreement" in rules("He have two cars and they was happy.")
    assert "agreement" not in rules("He has two cars and they were happy.")


def test_article_repeated_word_and_capitalisation() -> None:
    assert "article" in rules("It is a important issue.")
    assert "article" not in rules("It is an important issue at a university.")
    assert "repeated_word" in rules("This is the the problem.")
    assert rules("i think so.").count("capitalisation") >= 1


def test_spelling_flags_misspellings_not_names() -> None:
    fv = extract_features("The goverment helped people becouse of Almaty.", "task2")
    flagged = {i.text for i in fv.issues if i.rule == "spelling"}
    assert flagged == {"goverment", "becouse"}


def test_cohesion_counts_multiword_markers_once() -> None:
    fv = extract_features(
        "On the other hand, prices rose. However, wages fell. However, it helped.", "task2"
    )
    assert fv.cohesion_marker_count == 3
    assert fv.distinct_cohesion_markers == 2
    assert fv.top_cohesion_marker_share == pytest.approx(2 / 3, abs=0.01)


def test_issue_offsets_point_at_the_text() -> None:
    text = "Many student has a problem."
    for issue in extract_features(text, "task2").issues:
        assert text[issue.start : issue.end] == issue.text


def test_structure_flags_per_task_type() -> None:
    letter = features("t1g-laptop-b7.5")
    assert letter.has_salutation and letter.has_sign_off and letter.has_conclusion is None
    report = features("t1a-internet-b7.0")
    assert report.has_overview and report.has_salutation is None
    assert features("t1a-internet-b5.0").has_overview is False
    assert features("t2-cities-b8.5").has_conclusion


# The five quality-tagged gold essays: two weak, one mid, two strong.
WEAK = ["t2-tuition-b4.0", "t2-social-media-b4.5"]
MID = ["t2-cities-b6.0"]
STRONG = ["t2-work-family-b8.0", "t2-cities-b8.5"]


def test_quality_tags_match_this_test() -> None:
    tagged = {e["id"]: e["quality"] for e in load_gold() if e["quality"]}
    assert tagged == {
        **dict.fromkeys(WEAK, "weak"),
        **dict.fromkeys(MID, "mid"),
        **dict.fromkeys(STRONG, "strong"),
    }


def test_word_floor() -> None:
    assert features("t2-tuition-b4.0").below_word_floor
    assert not any(features(e).below_word_floor for e in MID + STRONG)


@pytest.mark.parametrize("weak", WEAK)
@pytest.mark.parametrize("better", MID + STRONG)
def test_weak_essays_have_more_errors(weak: str, better: str) -> None:
    assert features(weak).errors_per_100_words > features(better).errors_per_100_words


@pytest.mark.parametrize("weak", WEAK)
@pytest.mark.parametrize("strong", STRONG)
def test_strong_essays_use_more_subordination(weak: str, strong: str) -> None:
    # Not asserted against MID: spaCy's clause tags don't separate band 4 from band 6 reliably.
    assert features(strong).subordinate_clause_rate > features(weak).subordinate_clause_rate


@pytest.mark.parametrize("strong", STRONG)
def test_strong_essays_beat_weak_on_range(strong: str) -> None:
    s = features(strong)
    for weak in WEAK:
        w = features(weak)
        assert s.mattr > w.mattr
        assert s.mean_sentence_words > w.mean_sentence_words
    assert s.errors_per_100_words < features(MID[0]).errors_per_100_words + 1.0


def test_every_gold_essay_extracts() -> None:
    for essay in load_gold():
        fv = extract_features(normalise(essay["script"]), essay["task_type"])
        assert fv.word_count > 100 and fv.sentence_count > 3
