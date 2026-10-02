"""The order-bias eval only means something if its baseline is the production prompt exactly."""

from scoring_api.pipeline.prompts import GRAMMAR, build_user_prompt
from scoring_api.pipeline.rubric import _RubricJudgement
from scoring_api.schemas import CRITERIA, WORD_FLOOR
from scoring_api.training.order_bias import CONDITIONS, _Reversed, analyse, build


def test_baseline_is_the_production_prompt() -> None:
    for task_type in WORD_FLOOR:
        contents, schema = build("baseline", task_type, "PROMPT", "SCRIPT")
        assert contents == build_user_prompt(task_type, "PROMPT", "SCRIPT")
        assert schema is _RubricJudgement


def test_variants_change_only_the_ordering() -> None:
    base, _ = build("baseline", "task2", "P", "S")
    for cond in ("reversed_criteria", "ascending_descriptors", "script_last"):
        contents, _ = build(cond, "task2", "P", "S")
        # same characters, new order
        assert contents != base and sorted(contents) == sorted(base), cond
    asc, _ = build("ascending_descriptors", "task2", "P", "S")
    assert asc.index("3 and below: sentence forms") < asc.index("9: wide range of structures")
    rev, schema = build("reversed_criteria", "task2", "P", "S")
    assert rev.index(GRAMMAR) < rev.index("Task Response (Task 2")
    assert list(schema.model_fields) == list(reversed(CRITERIA)) and schema is _Reversed
    last, _ = build("script_last", "task2", "P", "S")
    assert last.index("Band descriptors:") < last.index("<script>")


def test_analyse_reads_shifts_against_baseline() -> None:
    same = dict.fromkeys(CRITERIA, 6)
    up = dict.fromkeys(CRITERIA, 7)
    essay = {c: (up if c == "ascending_descriptors" else same) for c in CONDITIONS}
    data = {"results": {f"e{i}": essay for i in range(3)}}
    r = analyse(data)
    noise, asc = r["baseline_repeat"], r["ascending_descriptors"]
    assert noise["mean_shift"] == 0 and noise["exact_agreement"] == 1
    assert asc["mean_shift"] == 1 and asc["overall_mean_shift"] == 1
