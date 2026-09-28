# Gold Set

The fixed evaluation set for BandCraft AI. Every accuracy number this project quotes must come from a run of `tests/test_gold_mae.py` against these files, cited with the model, the prompt version and the date from `reports/gold-mae.json`.

## What's in it

18 Gold Scripts: 10 Task 2, 4 Task 1 Academic and 4 Task 1 General Training, with overall bands from 4.0 to 8.5. Task 2 uses five prompts with two scripts each at different bands, to test whether the scorer can tell them apart.

Each file holds:

| Field | Meaning |
|---|---|
| `task_type` | `task1_academic`, `task1_general` or `task2` |
| `prompt` | The task, including the data for Task 1 Academic |
| `script` | The response |
| `gold.criteria` | Four whole-number Criterion Bands |
| `gold.overall` | Derived from the criteria with the IELTS rounding rule (checked by the test) |
| `quality` | `weak` / `mid` / `strong` on the five scripts the feature tests use; otherwise `null` |
| `provenance` | Where the script and its labels came from |

## Limits (read before quoting a number)

**These labels are not examiner scores.** The scripts are synthetic, and their bands were estimated by the author against the public band descriptors. That makes the set good for regression (did a prompt change make things worse?) and for ordering (does the scorer rank a 5 below a 7?). It's weak evidence for claims of agreement with real examiners.

The fix is to add examiner-scored Reference Scripts (see `/CONTEXT.md`) under their own provenance, and report the two groups separately.

## Adding a script

1. Add `<task>-<topic>-b<band>.json` with all fields.
2. Check that `gold.overall` matches the rounding rule.
3. Run `uv run pytest -m gemini` and commit the updated report alongside it.
