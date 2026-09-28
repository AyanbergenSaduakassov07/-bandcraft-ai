# BandCraft AI

IELTS Writing scoring and feedback. Every band comes with an explicit margin of error.

BandCraft AI scores Task 1 (Academic and General Training) and Task 2 responses on the four official IELTS Writing criteria and returns criterion-level feedback. It's an independent product, not affiliated with IELTS, the British Council, IDP or Cambridge.

> **Rebuild in progress.** This repo replaces the earlier n8n + Netlify prototype (history before `db776f8`). The accuracy and usage figures quoted for that prototype don't carry over; the new pipeline reports its own numbers against the gold set in `apps/scoring-api/tests/fixtures/gold/`.

## Layout

```
.
├── CONTEXT.md            Domain glossary. Start here: what a Script, Band Estimate or Margin of Error is.
├── SPEC.md               The 6-stage scoring pipeline and the output contract.
├── apps/
│   ├── web/              The website (Next.js 15). Map: apps/web/README.md
│   └── scoring-api/      The scoring service (FastAPI + Gemini). Map: apps/scoring-api/README.md
├── packages/
│   └── shared/           Rubric constants and the ScoreResult type, shared by both apps
├── docs/
│   ├── adr/              Architecture decisions: why things are the way they are
│   ├── benchmarks/       Accuracy reports, one per calibration run
│   └── design-system/    Brand, tokens, motion and voice (MASTER.md, brand.md)
└── .github/workflows/    ci.yml (lint, types, tests on every push); calibrate.yml (fits models)
```

## Run it

```bash
npm install                                  # web + shared
npm run dev -w @bandcraft/web                # http://localhost:3000, design system at /design

cd apps/scoring-api
uv sync
GEMINI_API_KEY=... uv run uvicorn scoring_api.main:app --reload   # http://localhost:8000/docs
uv run --group train pytest        # unit tests; live Gemini gold run: uv run pytest -m gemini
uv run python -m scoring_api.training.record_gold   # record Gemini runs for the Gold Set (resumable)
```

## Checks

```bash
npm run lint && npm run typecheck            # web: ESLint + WCAG contrast check on tokens, tsc
cd apps/scoring-api && uv run ruff check . && uv run black --check . && uv run mypy src tests && uv run pytest
```

CI runs the same on every push. There's no deploy step yet.

## Scoring API

- `POST /score/draft`: Features plus raw Gemini Criterion Bands with evidence spans (stages 1-3).
- `POST /score/final`: calibrated Criterion Bands, overall band, a margin of error per score, and the evidence spans (stages 4-5). It returns 503 until a calibration has been trained.

Calibration is fitted by the **calibrate** GitHub Actions workflow (Actions → calibrate → Run workflow). It writes `apps/scoring-api/artifacts/calibration/<version>/` and a report in `docs/benchmarks/`, then opens a PR ([ADR-0003](docs/adr/0003-small-cpu-fits-in-github-actions.md)).

## Constraints

- All model calls go through the Gemini API free tier ([ADR-0001](docs/adr/0001-gemini-free-tier-only.md)).
- Fine-tuning and GPU work runs on Kaggle ([ADR-0002](docs/adr/0002-fine-tuning-on-kaggle-only.md)). Small CPU fits run in GitHub Actions, never on a laptop ([ADR-0003](docs/adr/0003-small-cpu-fits-in-github-actions.md)).

## License

MIT, see [LICENSE](LICENSE).
