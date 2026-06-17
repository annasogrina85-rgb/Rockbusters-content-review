# Rockbusters — Visual Identity

> **AUTHORITATIVE SOURCE:** the official Rockbusters design system now lives in
> `brand/` (tokens, assets, components, guidelines) — handoff from claude.ai/design.
> Use `brand/tokens/*.css` and `brand/assets/*` as the source of truth.
> Key corrections vs earlier sampling: brand red is **#e30613** (not #C31319),
> the display/body font is **Montserrat** (900 uppercase for display), light
> surface is chalk **#f5f4f2**, and real halftone textures live in
> `brand/assets/pattern-{red,dark-grey,white}.png`. Logo: `brand/assets/logo-02.png`
> (lockup) + `logo-03.png` (badge mark).

---

# Rockbusters — Visual Identity

Extracted from the official 2026 brand assets (ambassador posters + Eurotrip
Instagram carousels). Colors below are **sampled directly from the artwork**
(exact). This complements the written brand **voice** (`api/_lib/tone.js`).

## Color palette (sampled — exact)
| Role | Hex | Notes |
|---|---|---|
| Brand red | `#C31319` | the signature — pills, accents, shards, accent words, logo |
| Deep red | `#9C181A` | darker red for halftone dots / shadows |
| Ink (headline dark) | `#3C3C32` | warm dark olive-charcoal — NOT pure black |
| Paper (background) | `#F1F1F1` | neutral light grey, the house background |
| White | `#FFFFFF` | headline text over photos |

## Logo
- **Roundel mark**: solid red circle with a dark (near-black) comet/swoosh inside. Used as a compact badge, usually upper area of the post.
- **Wordmark**: `ROCKBUSTERS` heavy all-caps.
- ⛔ Source file still needed — see "What's still needed" below. Templates currently use a red-circle "R" placeholder.

## Typography
- Headlines: **heavy bold grotesque, ALL CAPS**, tight leading, broken into short stacked lines.
- **Two-color headlines**: most words in ink `#3C3C32`, key words in brand red `#C31319` (e.g. "BUILD **YOUR OWN** EUROTRIP", "WIN A **FREE WEEK**").
- Over photos: headline is **white** with a soft shadow.
- Labels/captions: clean bold sans, often the ink color, smaller.
- Exact font: TBD — need the name/file (placeholder: Anton + Archivo).

## Layout system (two modes)
**Mode A — light card:** `#F1F1F1` background covered in halftone dots; the photo sits in a **rounded-corner card**; the headline (ink + red words) sits above or below the card; a short caption + a thick **→ arrow** in a corner. Location posts add the place name + a **country flag emoji** (RODELLAR 🇪🇸, CEÜSE 🇫🇷, OLTRE FINALE 🇮🇹, FRANKENJURA 🇩🇪).

**Mode B — full-bleed photo:** photo fills the frame; **white** headline + location/flag over it; red pill CTA. (This is what the current carousel template renders.)

## Graphic language
- **Halftone dot field** — red `#C31319` + deep-red `#9C181A` dots over the paper background, denser at corners/edges.
- **Angular red shards** — rotated rounded rectangles as dynamic accents.
- **Rounded red "pill"** — CTA buttons ("BOOK NOW →", "swipe →", "Send this to your climbing partner →") and stat badges (alternating solid-red / red-outline, e.g. "1 WEEK · 1 ENTRY").
- **Thick arrow →** — repeated swipe/CTA cue (white on photo, ink on light).

## Photography
- Dramatic, high-contrast climbing **action** from above; real moments. B&W treatment used on some promo slides.
- Matches the agent's photo selection ("people / action / sharp") — keep preferring action over empty landscapes.

## Taglines / verbal-visual hooks
- "Join the Crew. Climb the World." · "CLIMB. HARD. EAT. SLEEP. CLIMB. AGAIN."
- Short, stacked, all-caps, period-separated phrasing.

## What's still needed (from the designer)
1. **Logo file** — the roundel + wordmark as **SVG** (and a transparent **PNG**). Drop in `00_Brand/Logos/`.
2. **Headline font** — the .otf/.ttf file or the exact font name (visible in Canva). Drop in `00_Brand/Fonts/`.
Everything else (colors, layout system, graphic language) is captured above.

## Source assets
Reference originals saved in Drive `00_Brand/visual-references/rb-2026-examples/`.
Full link list in `brand-identity-references.md`.
