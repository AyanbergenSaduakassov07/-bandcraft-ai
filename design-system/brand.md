# BandCraft brand

## The mark

A lowercase **b** whose bowl is a **score dial**. The ring is the band scale, and the short cyan arc is the **margin of error**, centred on the reading. That is the whole product in one glyph: a band, and how sure we are.

Source: `apps/web/src/components/landing/logo.tsx` (`LogoMark`, `LogoTile`, `Logo`).

### Construction (48-unit grid)

| Part | Spec |
|---|---|
| Stem | rect x 10, y 6, 6.5 × 36, fully rounded ends (r 3.25) |
| Bowl | circle centre (27, 30), r 10.2, stroke 6.5; overlaps the stem so the b reads as one stroke |
| Margin arc | same ring, from −78° to −22° (centred on 1:30), stroke 6.5, round caps, `#29B6F6` |
| Tile | `#1565C0` square, corner radius 28% of its size, mark at 72% of the tile |

## Lockups

| Lockup | Use |
|---|---|
| `Logo` (mark + `bandcraft`) | Nav, footer, documents. The wordmark is lowercase Onest 700 at −0.05em tracking |
| `LogoTile` | App icon, favicon (`app/icon.svg`), Apple touch icon (`app/apple-icon.tsx`), social avatars |
| `LogoMark` alone | When the name is already on screen |

The product name in running text stays "BandCraft AI". The wordmark is the logo, not a spelling rule.

## Colour

| Tone | Mark | Arc | On |
|---|---|---|---|
| `color` | `#1565C0` | `#29B6F6` | White and `#F5F5F7` |
| `reversed` | `#FFFFFF` | `#29B6F6` | `#1565C0`, `#0B1F33`, photography |
| `mono` | `currentColor` | `currentColor` | Single-colour print, embossing |

## Size and space

- **Minimum size:** 16px for the tile and 20px for the bare mark. Below that, the arc merges into the ring.
- **Clear space:** half the mark's height on every side.

## Don't

- Don't recolour the arc, move it off the ring, or animate it away from the 1:30 position in the logo. (Animation belongs to the `BandGauge` data visual, not the mark.)
- Don't add gradients, shadows, outlines or a 3D bevel to the mark. The 3D certificate draws it flat on paper.
- Don't set the wordmark in title case or another typeface.

## In the interface

`BandGauge` (`components/ui/band-gauge.tsx`) is the mark's dial used as data: a 0–9 ring filled to the band in blue, with a cyan arc spanning band ± margin. It appears in the score card, the "Honest margins" feature, the 3D certificate and `/design`. When the logo and the core data visual share one shape, the brand is the product.

## Social

The Open Graph card (`app/opengraph-image.tsx`) sets the mark and wordmark on white with the hero line. Next.js generates it at build time.
