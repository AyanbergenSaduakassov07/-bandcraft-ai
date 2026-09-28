# Small CPU fits run in GitHub Actions; Kaggle stays for GPU work

Amends [ADR-0002](0002-fine-tuning-on-kaggle-only.md). Calibration and ensemble models for the scoring pipeline (isotonic or linear calibrators, a ridge model over Features, and a small LightGBM over Features plus Gemini bands) train on tens to a few thousand rows in under a second on one CPU. Running them through Kaggle would add credentials and API plumbing for no compute benefit, and the product owner wants nothing heavy on the development Mac.

**Decision:** production calibration artifacts are fitted by `scoring_api.train` in the `calibrate` GitHub Actions workflow. It's free for this public repo and runs on GitHub's machines. Each run opens a PR with a versioned artifact folder (`artifacts/calibration/<date>-<run id>/`) and its benchmark report, so every model in use is reviewable and reproducible. Unit tests may fit toy models of a few rows anywhere. Anything that needs a GPU, or is fine-tuning a language model, still runs on Kaggle only.

Artifacts are stored as JSON and LightGBM's text format, never pickles, so loading a model can't execute code.
