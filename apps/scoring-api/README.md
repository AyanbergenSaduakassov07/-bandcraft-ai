# apps/scoring-api

The scoring service. It takes an IELTS Writing response and returns bands for the four criteria, the evidence behind each band, and a margin of error.

```bash
uv sync --group train
GEMINI_API_KEY=... uv run uvicorn scoring_api.main:app --reload    # http://localhost:8000/docs
uv run --group train pytest                                        # tests
```

## Where things are

```
src/scoring_api/
├── main.py                 The API: POST /score/draft, POST /score/final, GET /health
├── schemas.py              Request and response shapes
├── pipeline/               The scoring pipeline, one module per stage in SPEC.md
│   ├── draft.py            Stage 1: clean the text; runs stages 2 and 3 in parallel
│   ├── features.py         Stage 2: countable facts (words, paragraphs, errors…), no AI
│   ├── rubric.py           Stage 3: Gemini scores each criterion, quoting evidence first
│   ├── prompts.py          The exact instructions sent to Gemini
│   ├── calibration.py      Stage 4: corrects Gemini's scale using the Gold Set
│   ├── ensemble.py         Stage 5: combines four estimates, decides the margin of error
│   └── final.py            Stages 4-5 behind POST /score/final
└── training/               Offline jobs, not part of the running API
    ├── record_gold.py      Records real Gemini runs for the Gold Set
    └── train.py            Fits the stage 4-5 models and writes a benchmark report
tests/
├── fixtures/gold/          The Gold Set: 18 labelled essays (see its README)
├── fixtures/gold-raw/      Recorded Gemini runs for those essays (input to training)
├── test_features.py        Stage 2
├── test_draft_api.py       Stage 3 helpers and POST /score/draft
├── test_final.py           Stages 4-5 and POST /score/final
└── test_gold_mae.py        Live Gemini accuracy run (opt-in: pytest -m gemini)
artifacts/calibration/      Trained models, one folder per version (written by the calibrate workflow)
```

## How a score is made

1. **Draft** (`/score/draft`): features and a raw Gemini band for each criterion, with quoted evidence.
2. **Final** (`/score/final`): calibrate, then compare four estimates per criterion (raw, calibrated, features-only, ensemble). A disagreement of more than one band triggers a second Gemini pass. The spread of the estimates becomes the margin of error.

Training runs in GitHub Actions (Actions → calibrate). Details in `docs/adr/0003-small-cpu-fits-in-github-actions.md` and `docs/benchmarks/`.
