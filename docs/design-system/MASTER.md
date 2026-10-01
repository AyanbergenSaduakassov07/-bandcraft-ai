# BandCraft AI Design System

Source of truth for how BandCraft AI looks and moves. Tokens live in `apps/web/src/app/globals.css` and `apps/web/src/lib/motion.ts`; the live preview is `/design` in the web app. When this file and the code disagree, fix one of them in the same PR.

Page-specific overrides go in `design-system/pages/<page>.md` and win over this file for that page only.

## Lineage

The landing page is **white first, with blue as the accent**. Its base is Apple's and Meta's product pages, with Xbox's product-stage ideas used sparingly. Duolingo is no longer the base.

| Source | What we took |
|---|---|
| **Apple** | White pages, generous air, huge tight headlines, the scroll-lit statement, the sticky criteria cube, the autoplaying highlights gallery with progress pills and pause, the task comparison, footnoted claims, glass controls |
| **Meta** | A confident centred closing call to action with one blue pill, and a visible pause control on anything that moves |
| **Xbox Series X** | The product as a lit object on a stage. Here that's the floating Band Report certificate with its holographic seal |
| **Speak / YC-grade startups** | The floating pill nav, the "New" announcement pill, a split hero, a product card showing real output, the FAQ |
| **IELTS checkers** (Cathoven, AI4IELTS, Writing9) | The common promise of per-criterion feedback. We differ by quoting the evidence behind every band |

The product-specific idea stays the same: **every band shows its evidence.**

## Logo

The mark is a lowercase **b** whose bowl is a score dial, with a cyan accent arc. The wordmark is lowercase `bandcraft`. The full rules (construction, lockups, tones, minimum sizes, don'ts) are in **[brand.md](brand.md)**. The mark's dial doubles as the `BandGauge` data visual, so the logo and the core UI share one shape.

## Color

The landing page is white. Blue appears on buttons, links, one headline phrase, numerals and the logo, and nowhere else.

| Token | Light | Role |
|---|---|---|
| `--background`, `--card` | `#FFFFFF` | Page and cards |
| `--muted` | `#F5F5F7` | Alternate sections, the footer. Neutral grey, never tinted blue |
| `--border` | `#E5E7EB` | Hairlines |
| `--foreground` | `#0B1F33` | Ink |
| `--muted-foreground` | `#5B6472` | Secondary text |
| `--primary` | `#1565C0` | Buttons and links. White text on it reaches 5.75:1 |
| `--brand-500` / `--brand-300` / `--brand-cyan` | `#1E88E5` / `#64B5F6` / `#29B6F6` | Small accents: the logo dot, focus rings, glows |

- **Criterion highlights** in the demo use four functional hues (sky, amber, emerald, violet), so the four criteria can be told apart in the essay text. They mark evidence only, never decoration.
- **The dark theme** (`.dark`) is kept for the `/design` catalog. The landing page doesn't use it.
- **Contrast check:** `apps/web/scripts/check-contrast.mjs` runs in `npm run lint`, and every pair passes in both themes.

## Type

| Role | Face | Size / weight | Tracking |
|---|---|---|---|
| Hero headline | Onest | 72 / 700 (48 on mobile) | −0.035em |
| Display | Onest | 56 / 700 | −0.035em |
| Title | Onest | 32 / 700 | −0.022em |
| Heading | Onest | 24 / 600 | −0.015em |
| Headline | Onest | 20 / 600 | 0 |
| Body | Onest | 16 / 400, line-height 1.5 | 0 |
| Callout | Onest | 14 / 400 | 0 |
| Caption | Onest | 12 / 500 | 0 |
| **Display headlines + numerals** | **Onest** | 36–72 / 700 | −0.035 to −0.045em |

- **Onest for everything with words.** It's the closest free, Cyrillic-complete match to Apple's SF: neutral grotesk, tight at display sizes with negative tracking. Cyrillic matters because Kazakh and Russian interfaces are on the roadmap.
- **One family, Onest,** for everything. It's the closest free, Cyrillic-complete match to Apple's SF. Display sizes use tight negative tracking.
- Headings use `text-wrap: balance`. Body lines stay under 65ch.
- There are no uppercase letter-spaced eyebrows above sections. Section titles are sentence case, Apple style.

## Spacing and layout

- 8pt rhythm: Tailwind steps 2 / 4 / 6 / 8 / 12 / 16 / 24 (8–96px). 4px is only for hairline gaps such as heatmap cells.
- Content width: `max-w-6xl` (72rem). Galleries bleed to the viewport edge but pad their first card to the content column.
- Section rhythm varies on purpose: hero, a full-bleed statement with 192px of air, stat tiles, a 320vh sticky section, a bleeding gallery, then a split light/dark catalog. The page never repeats the same padding block twice in a row.
- Touch targets are ≥ 44px: default buttons are `h-11`, inputs `h-11`. `sm` buttons (36px) are for dense desktop toolbars only.

## Shape and depth

| Tier | Where | Treatment |
|---|---|---|
| Flat | Default cards, inputs | 1px `--border` ring, no shadow |
| Soft | Bento tiles, gallery cards | `--shadow-soft`, blue-tinted |
| Float | Hero score card | `--shadow-float` plus glass |
| Ledge | Primary button only | `0 4px 0 var(--edge)`; the press moves the face down 4px and removes the ledge |
| Glass | Sticky nav and hero score card, **nowhere else** | 62% surface + 20px blur + 160% saturation |

- Radii differ by role, not one radius everywhere: controls 14–20px, cards 24px, gallery and stat tiles 28px, chips full.
- Shadows are tinted with `#0D47A1`, never neutral grey.

## 3D

- **The hero object** is a floating Band Report certificate, built in three.js:
  - a guilloche security-print face showing "Overall 7.5" and four criterion boxes, marked "Not an official IELTS result"
  - an iridescent foil seal
  - a lacquered fountain pen
  - a point light that sweeps a gloss across the paper

  It is deliberately not a replica of the official IELTS Test Report Form.
- **Performance budget:** Neutral tone mapping keeps the paper white. The pixel ratio is capped at 1.5, and the canvas is sized to the hero column. The render loop stops when offscreen, when the tab is hidden, or when paused. three.js is dynamically imported.
- **The criteria cube** is plain CSS 3D, `aria-hidden`, with the same content in the list beside it.

## Motion

Tokens: `globals.css` (`--duration-*`, `--ease-*`) and `src/lib/motion.ts` (`duration`, `scoreSpring`, `revealStagger`). anime.js v4 runs the timeline and scroll work. The two Magic UI components keep their built-in motion library, fed the same spring params.

| Token | Value | Used for |
|---|---|---|
| fast | 150ms, ease-out | Hover, press, the button ledge |
| base | 200ms | Tabs, switch thumb, tilt settle |
| slow | 300ms | Progress fill |
| `scoreSpring` | stiffness 140, damping 18, mass 1 | Score reveal, 3D shapes arriving, swatches |
| `revealStagger` | 40ms | Criterion bars |
| Heatmap stagger | 14ms from centre, grid-aware | Streak heatmap |
| Scroll sync | lerp 0.25–0.4 | Statement words, criteria cube |

**The hero timeline** is one orchestrated sequence:

1. Headline words rise, staggered by 35ms.
2. The card springs up.
3. The band counts from 0.0 and lands with a slight overshoot.
4. The bars fill in criterion order.

Scroll-driven, in the Apple style:

- The statement lights up word by word as it reaches the middle of the screen.
- The criteria cube turns one face per criterion across a 320vh sticky section, and the matching list item brightens.
- Catalog reveals play once on entry: swatches pop in, heatmap cells ripple out from the centre, and the trend line draws itself, followed by its points.

**Reduced motion** (checked at 375px with `prefers-reduced-motion: reduce`):

- Everything renders in its final state, with no count-up, tilt, beam or WebGL loop. The sticky section collapses to normal height, and the gallery scrolls without smoothing.
- The server-rendered HTML already holds the final state. The hero only hides elements when an inline `.js` flag is set *and* motion is allowed, so a JS failure never leaves content invisible.

## Components

Everything is in `apps/web/src/components/ui/`.

- **shadcn/ui core** (radix-nova, restyled to these tokens): button, badge, card, input, textarea, label, progress, tabs, switch, tooltip.
- **Registry** (from the source registries; 21st.dev's registry now requires an API key):
  - Magic UI `number-ticker`: stat tiles and streak count. It uses `scoreSpring` and jumps straight to the value under reduced motion.
  - Aceternity `bento-grid`: dashboard widgets; neutral colours replaced with tokens, and a missing `shadow-input` class replaced.

## Content rules

- **Claims carry footnotes**, Apple style. That includes the "not an official IELTS result" and "not affiliated" notes in the footer.
- **No invented metrics.** The stat tiles state facts about the product contract (4 criteria, a 0–9 scale, 6 pipeline stages), not accuracy numbers we haven't measured.

## Anti-patterns (checked)

- Warm cream + terracotta, near-black + neon, a broadsheet serif: none.
- Gradient everywhere: the gradient is limited to the brand mark, the cube caps and the stat numerals.
- One radius and one shadow everywhere: no. There are five depth tiers and four radius roles.
- Three equal icon + heading + text columns: none.
- Uppercase eyebrow above every section: removed.
- Emoji as icons: none. Lucide throughout, one stroke weight.

## Voice

We write for IELTS candidates who need a specific band for a university or a visa. They're anxious and pressed for time.

- **Lead with what they get:** "See which criterion is dragging your band down", not "four-criterion scoring engine".
- **Be honest out loud.** Name the limit ("an estimate, not your official score") before the reader has to ask. It's our differentiator, not a disclaimer.
- **Keep numbers to facts about the product** (4 criteria, 0–9). Never invent statistics, user counts or testimonials.
- **Use strong calls to action:** "Watch it score an essay", never "Learn more" or "Get started".
- **The headline was chosen by score.** "Discover the truth about your IELTS Writing band" scored 75/100 on the copywriting skill's headline scorer, against 30 for the previous line.
