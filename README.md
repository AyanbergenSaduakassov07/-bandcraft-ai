# BandCraft AI

IELTS Writing scoring and feedback. Every band comes with the evidence behind it.

BandCraft AI scores Task 1 (Academic and General Training) and Task 2 responses on the four official IELTS Writing criteria and returns criterion-level feedback. It's an independent product, not affiliated with IELTS, the British Council, IDP or Cambridge.

> **Rebuild in progress.** This repo replaces the earlier n8n + Netlify prototype (history before `db776f8`). The accuracy and usage figures quoted for that prototype don't carry over; the new pipeline reports its own numbers against the gold set in `apps/scoring-api/tests/fixtures/gold/`.

## Layout

```
.
├── CONTEXT.md            Domain glossary. Start here: what a Script, Criterion Band or Scoring Path is.
├── SPEC.md               The 6-stage scoring pipeline and the output contract.
├── apps/
│   ├── web/              The website (Next.js 15). Map: apps/web/README.md
│   ├── scoring-api/      The Writing scoring service (FastAPI + Gemini). Map: apps/scoring-api/README.md
│   ├── speaking-api/     IELTS Speaking: real-time examiner and audio scoring. Map: apps/speaking-api/README.md
│   └── pronunciation-endpoint/  OpenPronounce as a private Hugging Face Space (ADR-0005)
├── packages/
│   └── shared/           Rubric constants and the ScoreResult type, shared by both apps
├── automation/n8n/       Scheduled n8n workflow that refreshes the template index
├── docs/
│   ├── adr/              Architecture decisions: why things are the way they are
│   ├── benchmarks/       Accuracy reports, one per calibration run
│   └── design-system/    Brand, tokens, motion and voice (MASTER.md, brand.md)
└── .github/workflows/    ci.yml (lint, types, tests); calibrate.yml; template-index.yml; collocations.yml
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

cd ../speaking-api                 # .env from .env.example; the web app needs SPEAKING_API_URL/KEY
uv sync && uv run uvicorn speaking_api.main:app --port 8001        # then open /speak
```

## Checks

```bash
npm run lint && npm run typecheck            # web: ESLint + WCAG contrast check on tokens, tsc
cd apps/scoring-api && uv run ruff check . && uv run black --check . && uv run mypy src tests && uv run pytest
cd apps/speaking-api && uv run ruff check . && uv run black --check . && uv run mypy src tests && uv run pytest
```

CI runs the same on every push. There's no deploy step for the apps yet; the pronunciation endpoint deploys to a private Hugging Face Space (`pronunciation-endpoint` workflow).

## Scoring API

- `POST /score/draft`: Features plus raw Gemini Criterion Bands with evidence spans (stages 1-3).
- `POST /score/final`: calibrated Criterion Bands, overall band, and the evidence spans (stages 4-5). It returns 503 until a calibration has been trained.
- `POST /originality`: the pre-submit Originality Check for Task 2 (`null` for other tasks). It returns 503 until the template index has been fitted and the API has `SUPABASE_URL` and `SUPABASE_SECRET_KEY`.

Calibration is fitted by the **calibrate** GitHub Actions workflow (Actions → calibrate → Run workflow). It writes `apps/scoring-api/artifacts/calibration/<version>/` and a report in `docs/benchmarks/`, then opens a PR ([ADR-0003](docs/adr/0003-small-cpu-fits-in-github-actions.md)).

## Speaking API

- `POST` / `PATCH /api/offer`: WebRTC signalling for the Gemini Live examiner (Parts 1 → 2 → 3), proxied by `apps/web` behind the 18+ gate.
- `GET /sessions/{id}`: each Part's four criterion bands, evidence, and both Pronunciation estimates, once that Part is scored.

The **speaking-calibrate** workflow calibrates both Pronunciation paths against speechocean762 ([ADR-0005](docs/adr/0005-speaking-providers-and-hosted-pronunciation.md)).

## Workflows

| Workflow | Runs | Does |
|---|---|---|
| `ci` | every push | lint, types and tests for web, scoring-api, speaking-api |
| `calibrate` | manual, after `template-index` | fits Writing stage 4-5 models and the originality classifier |
| `template-index` | weekly via n8n (`automation/n8n/`) | appends Gemini-generated templated essays to pgvector |
| `collocations` | manual | rebuilds the collocation reference from WikiText-103 (about an hour) |
| `pronunciation-endpoint` | manual, or a push to `apps/pronunciation-endpoint` | deploys OpenPronounce to the private Space |
| `speaking-calibrate` | manual | calibrates Speaking Pronunciation against speechocean762 |

## Constraints

- All model calls go through the Gemini API free tier ([ADR-0001](docs/adr/0001-gemini-free-tier-only.md)).
- Fine-tuning and GPU work runs on Kaggle ([ADR-0002](docs/adr/0002-fine-tuning-on-kaggle-only.md)). Small CPU fits run in GitHub Actions, never on a laptop ([ADR-0003](docs/adr/0003-small-cpu-fits-in-github-actions.md)).
- Accounts are adults only, because of Gemini's terms ([ADR-0004](docs/adr/0004-adults-only-because-of-gemini-terms.md)).
- Speaking adds one hosted non-Gemini model, OpenPronounce on a private Hugging Face Space, and nothing runs in-process ([ADR-0005](docs/adr/0005-speaking-providers-and-hosted-pronunciation.md)).

## License

MIT, see [LICENSE](LICENSE).
