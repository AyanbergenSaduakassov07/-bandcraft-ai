# apps/web

The BandCraft AI website: the landing page at `/`, accounts (`/signup`, `/login`, adults only, see [ADR-0004](../../docs/adr/0004-adults-only-because-of-gemini-terms.md)), the write → score → feedback flow at `/write`, score history at `/history`, and the living design system at `/design`.

```bash
npm run dev -w @bandcraft/web     # http://localhost:3000
npm test -w @bandcraft/web        # evidence-span and streak logic
```

Copy `.env.example` to `.env.local` and fill in the Supabase publishable key. `/write` calls the scoring API through `app/api/score` (server side, so no CORS) at `SCORING_API_URL`. The database schema is in `/supabase/migrations`.

## Where things are

```
src/
├── app/                      Routes and app-wide files
│   ├── page.tsx              The landing page: lists its sections top to bottom
│   ├── design/page.tsx       /design: every component in light and dark
│   ├── (auth)/               /signup and /login, their shared form and the auth server actions
│   ├── (app)/                Signed-in pages under one header: write/ (score a Script), history/ (trend + list, history/[id] for one result)
│   ├── auth/confirm/route.ts Where the confirmation email lands
│   ├── api/score/route.ts    Proxy to the scoring API's POST /score/final
│   ├── layout.tsx            Fonts, metadata, providers
│   ├── globals.css           Design tokens (colours, radii, shadows, motion)
│   ├── icon.svg, apple-icon.tsx, opengraph-image.tsx   Favicon, iPhone icon, link-preview card
├── components/
│   ├── landing/              One file per landing-page section, named after it:
│   │                         nav, hero, demo, features, statement, criteria-cube,
│   │                         highlights, task-compare, faq, final-cta, site-footer
│   ├── brand/logo.tsx        The logo (mark, wordmark, app tile)
│   ├── score/                Showing a score: band-gauge (the logo's dial as data), score-card, criterion-hues
│   ├── history/band-trend    The band-over-time chart with its margin shading
│   ├── write/                The /write flow: write-flow (task, timer, word count), results (reveal + annotations), streak
│   ├── three/                3D: the floating Band Report certificate (three.js)
│   ├── motion/               Scroll-triggered reveals (anime.js)
│   └── ui/                   Base building blocks: button, card, input, tabs… (shadcn/ui)
├── middleware.ts             Refreshes the session; sends signed-out visitors to /login
├── content/
│   └── demo-results.json     Real scoring output shown in the live-sample section
└── lib/
    ├── evidence.ts           /score/final types; Evidence Spans → highlight runs; word count
    ├── streak.ts             Practice streak and heatmap (dates only, never bands)
    ├── age.ts                The 18+ check behind the signup form's message
    ├── supabase.ts           Server-side Supabase client
    ├── cta.ts                Where the call-to-action buttons point (demo or "how it works")
    ├── motion.ts             Motion timings and the reduced-motion check
    └── utils.ts              cn() class-name helper
scripts/check-contrast.mjs    WCAG contrast check on the colour tokens (runs in npm run lint)
```

## Conventions

- **Changing a section:** find it by name in `components/landing/`; `app/page.tsx` shows the order.
- **Colours:** always use tokens from `globals.css`, never raw hex in components. The contrast check fails the build if a pair drops below WCAG AA.
- **Motion:** everything animated respects `prefers-reduced-motion`.
- **Design rules** live in `docs/design-system/` at the repo root.
