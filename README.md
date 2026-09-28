# BandCraft AI

IELTS Writing scoring and feedback. Every band comes with an explicit margin of error.

BandCraft AI scores Task 1 (Academic and General Training) and Task 2 responses on the four official IELTS Writing criteria and returns criterion-level feedback. It's an independent product, not affiliated with IELTS, the British Council, IDP or Cambridge.

> **Rebuild in progress.** This repo replaces the earlier n8n + Netlify prototype (history before `db776f8`). The accuracy and usage figures quoted for that prototype don't carry over; the new pipeline reports its own numbers against the gold set in `apps/scoring-api/tests/fixtures/gold/`.

## Layout

```
apps/web            Next.js 15 (App Router, TS strict, Tailwind v4, shadcn/ui). /design is the living design system.
apps/scoring-api    FastAPI scoring service (Python, uv).
packages/shared     Rubric constants and the ScoreResult contract shared by both apps.
design-system/      MASTER.md: tokens, motion, and the reasoning behind them.
docs/adr/           Architecture decisions.
CONTEXT.md          Domain glossary. Start here.
SPEC.md             The 6-stage scoring pipeline.
```

## Run it

```bash
npm install                                  # web + shared
npm run dev -w @bandcraft/web                # http://localhost:3000, design system at /design

cd apps/scoring-api
uv sync
GEMINI_API_KEY=... uv run fastapi dev src/scoring_api/main.py   # http://localhost:8000/docs
```

## Checks

```bash
npm run lint && npm run typecheck            # web: ESLint + WCAG contrast check on tokens, tsc
cd apps/scoring-api && uv run ruff check . && uv run black --check . && uv run mypy src tests && uv run pytest
```

CI runs the same on every push. There's no deploy step yet.

## Constraints

- All model calls go through the Gemini API free tier ([ADR-0001](docs/adr/0001-gemini-free-tier-only.md)).
- All fine-tuning runs on Kaggle, never locally ([ADR-0002](docs/adr/0002-fine-tuning-on-kaggle-only.md)).

## License

MIT, see [LICENSE](LICENSE).
