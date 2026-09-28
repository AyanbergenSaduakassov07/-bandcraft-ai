# Benchmarks

Each `YYYYMMDD-<run id>.md` report here is written by the `calibrate` workflow (`python -m scoring_api.training.train`). It covers the stage 4-5 models fitted in that run and their leave-one-out results on the Gold Set.

## How we measure

- **Data:** the Gold Set (`apps/scoring-api/tests/fixtures/gold`), with recorded draft runs from `tests/fixtures/gold-raw` (`python -m scoring_api.training.record_gold`).
- **Protocol:** leave-one-out cross-validation. Each essay is predicted by models that never saw it. With a set this small, anything else overstates accuracy.
- **Metrics:**
  - overall-band MAE
  - share within ±0.5 band
  - bias
  - **margin coverage**: how often the gold band falls inside our predicted ± interval. This is the check that the margin isn't decorative.

## Reference points

| System | MAE | Within ±0.5 | Source | Status |
|---|---|---|---|---|
| tolmachf/tolmachv1.0 | 0.658 | 50.3% | Supplied by the product owner | Not independently confirmed. The closest public source found is [an IELTS AES paper](https://arxiv.org/abs/2512.24460) reporting a DistilBERT model at MAE 0.66 |
| UpScore.ai | not published | ~60% | [UpScore accuracy page](https://upscore.ai/accuracy-and-quality) | Published by the vendor on their own sample |

## Why the comparison isn't like for like

- **Different test sets.** Theirs are examiner-marked. Ours is currently 18 synthetic essays, with bands estimated by the author.
- **n = 18 is small.** One essay is 5.6% of the within-±0.5 figure.
- **What changes the picture:** adding examiner-marked Reference Scripts to the Gold Set, reported separately by provenance.

Until then, the reports say where we land. They are not a ranking.
