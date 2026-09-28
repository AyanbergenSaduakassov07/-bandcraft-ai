# BandCraft AI Design System

Source of truth for how BandCraft AI looks and moves. Tokens live in `apps/web/src/app/globals.css` and `apps/web/src/lib/motion.ts`; the live preview is `/design` in the web app. When this file and the code disagree, fix one of them in the same PR.

Page-specific overrides go in `design-system/pages/<page>.md` and win over this file for that page only.

## Lineage

Three references, and what each one contributed. Nothing is copied wholesale.

| Source | What we took | What we left |
|---|---|---|
| **Duolingo** | Confident blocks of colour, rounded shapes, the pressable button with a visible ledge, reward moments, streak and practice cadence | The owl-green palette, cartoon illustration, constant celebration |
| **Apple (apple.com + HIG)** | Glass sticky nav with a pill CTA, huge tight-tracked headlines, words that light up as you scroll, sticky scrollytelling, "Get the highlights" stat tiles, horizontal snap galleries with round arrow buttons, footnoted claims, 8pt spacing, restraint | SF Pro itself (licensing), product photography we don't have |
| **ailingo.click** | Structure only: dashboard sidebar, XP/progress widgets, streak heatmap, trust badges next to the hero | Its red palette |

The product-specific idea: **the margin of error is part of the answer.** Every visual decision below supports showing a band and how sure we are about it together.

## Color

The palette is fixed and comes from the logo: an icy background, the blue gradient of the head mark, and the deep-blue wordmark.

| Token | Light | Dark | Role |
|---|---|---|---|
| `--background` | `#EAF7FC` | `#071A2E` | Page |
| `--card` | `#FFFFFF` | `#0D2A44` | Surfaces |
| `--foreground` | `#0B1F33` | `#EAF7FC` | Ink |
| `--muted-foreground` | `#4A6178` | `#9DB7CD` | Secondary text |
| `--primary` | `#0D47A1` (700) | `#64B5F6` (300) | Buttons, links, the band numeral |
| `--brand-500` | `#1E88E5` | same | Graphics: bars, charts, focus ring |
| `--brand-300` | `#64B5F6` | same | Heatmap mid-tones, cube numerals |
| `--brand-cyan` | `#29B6F6` | same | Border beam, dark-mode ring |
| `--destructive` | `#C62828` | `#FF8A80` | Errors (not in the logo; needed) |
| `--success` | `#1B7F4B` | `#5FD49A` | Confirmations (not in the logo; needed) |

Rules:

- **Why primary is the 700 shade, not the 500.** White on `#1E88E5` is 3.68:1, which fails AA for button text. `#0D47A1` gives 8.63:1. The 500 shade goes on graphics, where 3:1 is the bar.
- **Dark mode is not an inversion.** Primary flips to the light 300 shade with dark text on it (7.93:1). Borders become 12% white instead of a grey.
- **The logo gradient** (300 → 500 → 700) is for the brand mark and the cube's caps only. Stat numerals use a narrower 500 → 700 gradient so every part of the glyph clears 3:1. Bars, progress and charts are solid `brand-500`.
- **Contrast is checked in CI.** `apps/web/scripts/check-contrast.mjs` reads the pairs straight from `globals.css`, in both themes, and runs as part of `npm run lint`. There are 30 pairs, and all pass.

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
| **Numerals** | **Unbounded** | 48–96 / 700, tabular | 0 |

- **Onest for everything with words.** It's the closest free, Cyrillic-complete match to Apple's SF: neutral grotesk, tight at display sizes with negative tracking. Cyrillic matters because Kazakh and Russian interfaces are on the roadmap.
- **Unbounded for numbers only**: bands, margins, streaks, stat tiles. It's wide, rounded and confident, which is where the Duolingo energy lives. A band score is the product's reward moment, so it gets the characterful face; paragraphs don't.
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

- **The hero backdrop** is a three.js scene of eight shapes (icosahedron, torus, rounded cube, sphere, octahedron, torus knot, capsule) in two materials:
  - icy glass: transmission, IOR 1.3–1.35
  - clearcoated brand-blue solids
  
  They're lit by a procedural room environment, drift on sine waves, lean toward the pointer and lift with scroll. They sit in two clusters at the edges so the headline stays clear.
- **three.js is dynamically imported** inside the effect, so it doesn't count toward the page's first-load JS. The scene stops its render loop when offscreen, skips WebGL if it's unavailable, and draws one still frame under reduced motion.
- **The criteria cube** is plain CSS 3D (`preserve-3d`), one face per criterion. It's `aria-hidden`; the same content sits in the list beside it.
- **The hero card** tilts with the pointer (Aceternity 3D card), but only on hover-capable devices with motion allowed.

## Motion

Tokens: `globals.css` (`--duration-*`, `--ease-*`) and `src/lib/motion.ts` (`duration`, `scoreSpring`, `revealStagger`). anime.js v4 runs the timeline and scroll work. The two Magic UI components keep their built-in motion library, fed the same spring params.

| Token | Value | Used for |
|---|---|---|
| fast | 150ms, ease-out | Hover, press, the button ledge |
| base | 200ms | Tabs, switch thumb, tilt settle |
| slow | 300ms | Progress fill, margin fade-in |
| `scoreSpring` | stiffness 140, damping 18, mass 1 | Score reveal, 3D shapes arriving, swatches |
| `revealStagger` | 40ms | Criterion bars |
| Heatmap stagger | 14ms from centre, grid-aware | Streak heatmap |
| Scroll sync | lerp 0.25–0.4 | Statement words, criteria cube |

**The hero timeline** is one orchestrated sequence:

1. Headline words rise, staggered by 35ms.
2. The card springs up.
3. The band counts from 0.0 and lands with a slight overshoot.
4. The bars fill in criterion order.
5. The **margin fades in last**. That's deliberate: the band isn't finished until its margin arrives.

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
  - Magic UI `border-beam`: hero card only; recoloured cyan → 500, hidden under reduced motion.
  - Aceternity `bento-grid`: dashboard widgets; neutral colours replaced with tokens, and a missing `shadow-input` class replaced.
  - Aceternity `3d-card`: hero only; rewritten with types, ease-out instead of linear, and a hover/motion gate.

## Content rules

- **Never show a bare band.** Every band on screen carries its margin (`7 ± 0.5`), including badges and gallery cards.
- **Claims carry footnotes**, Apple style. That includes the "not an official IELTS result" and "not affiliated" notes in the footer.
- **No invented metrics.** The stat tiles state facts about the product contract (4 criteria, a 0–9 scale, 6 pipeline stages, 1 margin per band), not accuracy numbers we haven't measured.

## Anti-patterns (checked)

- Warm cream + terracotta, near-black + neon, a broadsheet serif: none.
- Gradient everywhere: the gradient is limited to the brand mark, the cube caps and the stat numerals.
- One radius and one shadow everywhere: no. There are five depth tiers and four radius roles.
- Three equal icon + heading + text columns: none.
- Uppercase eyebrow above every section: removed.
- Emoji as icons: none. Lucide throughout, one stroke weight.
