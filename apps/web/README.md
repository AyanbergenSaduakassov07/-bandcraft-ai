# apps/web

The BandCraft AI website: the landing page at `/`, and the living design system at `/design`.

```bash
npm run dev -w @bandcraft/web     # http://localhost:3000
```

## Where things are

```
src/
├── app/                      Routes and app-wide files
│   ├── page.tsx              The landing page: lists its sections top to bottom
│   ├── design/page.tsx       /design: every component in light and dark
│   ├── layout.tsx            Fonts, metadata, providers
│   ├── globals.css           Design tokens (colours, radii, shadows, motion)
│   ├── icon.svg, apple-icon.tsx, opengraph-image.tsx   Favicon, iPhone icon, link-preview card
├── components/
│   ├── landing/              One file per landing-page section, named after it:
│   │                         nav, hero, demo, features, statement, criteria-cube,
│   │                         highlights, task-compare, faq, final-cta, site-footer
│   ├── brand/logo.tsx        The logo (mark, wordmark, app tile)
│   ├── score/                Showing a score: band-gauge (the logo's dial as data), score-card
│   ├── three/                3D: the floating Band Report certificate (three.js)
│   ├── motion/               Scroll-triggered reveals (anime.js)
│   └── ui/                   Base building blocks: button, card, input, tabs… (shadcn/ui)
├── content/
│   └── demo-results.json     Real scoring output shown in the live-sample section
└── lib/
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
