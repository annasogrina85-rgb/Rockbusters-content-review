# Rockbusters — Design System

> **Climb better, harder & more.**
> Brand system for Rockbusters, a global community of elite rock-climbing guides & coaches.

This project is a machine-readable design system. A compiler bundles the components in
`components/` into a runtime library and indexes the tokens in `styles.css`. The
Design System tab renders every `@dsCard`-tagged HTML file.

---

## 1. What is Rockbusters?

Rockbusters is **not a tour operator that "sells climbing holidays."** It is a
community of pro climbers, guides and coaches who run coaching camps, courses and
road trips that fast-track real progression and plug clients into the global climbing
culture. Tagline energy: **"Crush your goals. Chill with the legends. Live the lifestyle."**

**What they do (the lineup):** Sport climbing courses & trips · Pro-climber coaching
clinics · Sport climbing road trips · Women-only camps · Beginner / learn-to-lead ·
Bouldering · Trad climbing · Multi-pitch mastery · Deep-water solo.

**Proof points:** roster of legendary athletes (Adam Ondra, Daila Ojeda, Klemen Becan,
Dave Graham, Edu Marin, Alizée Dufraisse…); tight **1 coach : 2–6 climbers** ratio;
"100% rock time — dawn till dusk"; hassle-free logistics from the nearest airport;
family-friendly; proud partner of **1% For The Planet**.

**Philosophy:** *"Play hard. Work harder."* Climbing is frustrating, painful and mentally
exhausting — and that's the point. Growing as a climber means growing as a person; respect
the rock, respect nature.

---

## 2. Sources

The system was reconstructed from materials in the attached
`Rockbusters communications/` folder:

- **Logos** — `ROCKBUSTERS_LOGO_F2-02.png` (full lockup), `ROCKBUSTERS_LOGO_F2-03.png`
  (badge mark). → copied to `assets/logo-02.png`, `assets/logo-03.png`.
- **Brand textures** — `pattern---red.png`, `pattern---dark_grey.png`, `pattern---white.png`
  (grungy halftone overlays). → `assets/pattern-*.png`.
- **Slogan lockup** — `Climb-Hard-Sleep.png` ("CLIMB. HARD. EAT. SLEEP. CLIMB. AGAIN.",
  white, for dark backgrounds). → `assets/climb-hard-sleep.png`.
- **Copy** — `About us.docx` (full brand narrative; mined for tone + content fundamentals).

External references the user provided (access may require auth — stored for the reader):
- Logos: `https://u.pcloud.link/publink/show?code=kZfleNXZb21aDpPpCU03JoF32w8mDXIJTsm7`
- Styles: `https://drive.google.com/drive/folders/124I3DVe0WAWTz21ZwxiQo45vqxhsW2sp`
- More: `https://drive.google.com/drive/folders/1UazKJtEhNd7DIR0gVkoprg8TK5KLTRTY`
- Website: `https://rockbusters.net` · Video: `https://vimeo.com/596061261`
- Font family specified by client: **Montserrat**.

---

## 3. Content fundamentals (voice & tone)

**Vibe:** bold, punchy, insider, motivational, a little irreverent. The voice of a strong
climber hyping you up at the crag — confident, never corporate.

- **Person:** first-person plural **"We"** (the community) talking directly to **"you"**
  (the climber). Inclusive and direct: *"We will push you as hard as you let us, and you
  will leave a better climber."*
- **Casing:** **headlines are ALL-CAPS**, short, declarative, often three-beat:
  *"CRUSH YOUR GOALS. CHILL WITH THE LEGENDS. LIVE THE LIFESTYLE."* Body copy is normal
  sentence case.
- **Punctuation:** staccato. Periods used as drumbeats inside slogans
  (*"CLIMB. HARD. EAT. SLEEP. CLIMB. AGAIN."*). Em-dashes and ellipses for momentum.
- **Climbing fluency:** uses the real lexicon as a badge of authenticity — *beta, send,
  redpoint, onsight, flash, 8a, crusher, tie in, plastic, drop-knee, flagging, spotting,
  multi-pitch, DWS, trad, project.* Don't over-explain it.
- **Numbers as flex:** *"1 coach / 2–6 climbers", "100% rock time", "1% For The Planet"*.
- **Emoji:** none. Energy comes from typography and red, not emoji.
- **Do / Don't:** DO say *"stop wishing and start sending."* DON'T say *"book your premium
  guided climbing experience today."*

**Reusable phrases:** "Climb better, harder & more" · "Play hard. Work harder." ·
"Run by climbers, for climbers." · "100% rock time." · "Come alone, leave with a crew."

---

## 4. Visual foundations

**Palette.** Three brand colours do the heavy lifting: **signal red `#E30613`**
(sampled from the logo), **hard black `#000`**, **clean white `#FFF`**. Red is an accent
and an attention weapon — used for one thing per view (CTA, the logo "O", a key stat),
never as a wash. Black is structural (type, dark sections). A cool granite-grey neutral
ramp (`--rb-grey-50 … --rb-grey-950`) handles surfaces, borders and secondary text.
Semantic success/warning/info exist but are rarely seen.

**Typography.** One family — **Montserrat** — pushed to its extremes. Display/headlines are
**800–900 weight, UPPERCASE, tight tracking (`-0.02em`), near-solid leading (`0.95`)** so
words stack into a block (mirrors the logo). Body is **400–600, sentence case, 1.55 leading**.
Eyebrows/overlines are **bold uppercase with wide `0.14em` tracking** in red. No serif, no
second family.

**Backgrounds.** Two registers. (1) Clean white or chalk off-white for content. (2) Hard
**black sections** for impact (heroes, philosophy, CTAs) — this is where the brand lives.
Over the dark register, the **grungy halftone textures** (`pattern-*.png`) are dropped in at
low opacity as a gritty overlay; the white texture goes on dark, the red/grey on light.
**No smooth gradients, no blurry glows.** Real climbing photography (warm rock, dramatic
light, athletes mid-move) is the imagery target — full-bleed, often desaturated or with a
black/red duotone treatment and a dark protection gradient for legible overlaid type.

**Layout.** Confident, grid-driven, generous vertical rhythm (`--section-y: 96px`). Strong
left-aligned headline blocks. Big type allowed to dominate. Edge-to-edge dark bands break
the page. Max content width 1200px.

**Shape & depth.** Hard-edged and athletic. Radii stay tight — cards/inputs at **6px**,
feature cards **12px max**; **buttons, tags and badges are full pills**. Borders are crisp
1–2px (heavy 3px for emphasis / the "stamp" look). Shadows are **neutral and restrained**
(no coloured glow) — most depth comes from the black/white contrast and texture, not blur.

**Motion.** Quick and punchy, never floaty. `120–200ms`, ease-out
(`cubic-bezier(0.16,1,0.3,1)`). Buttons: **hover** darkens red / lifts 1px;
**press** shrinks to `0.97` scale. Links underline-on-hover. Focus shows a **red ring**
(`--shadow-focus`). No bounce, no infinite decorative loops.

See the **Design System tab** for live specimen cards of every token.

---

## 5. Iconography

Rockbusters' own artwork is **the logo helmet mark** and **grungy halftone textures** —
there is no proprietary icon font in the supplied materials. For UI icons we standardise on
**[Lucide](https://lucide.dev)** (loaded from CDN): an open, outline icon set with a clean
~2px stroke that matches the brand's sharp, athletic, no-frills feel. Use line (not filled)
icons; size 20–24px; colour `currentColor` so they inherit text/accent colour.

- **Brand marks** (`assets/logo-*.png`): the badge mark (`logo-03`) works as a favicon /
  avatar / loading mark; the full lockup (`logo-02`) for headers and footers.
- **Emoji / unicode as icons:** never. Energy comes from the helmet mark + red, not emoji.
- If you need a "helmet" or climbing-specific glyph that Lucide lacks, prefer the brand
  badge mark over inventing an SVG.

> ⚠️ **Substitution flag:** Lucide is a chosen substitute (no icon set shipped with the
> brand materials). If Rockbusters has a preferred icon library, point us at it and we'll
> swap it in.

---

## 6. Index / manifest

**Root**
- `styles.css` — global entry (only `@import`s). Consumers link this.
- `tokens/` — `fonts.css`, `colors.css`, `typography.css`, `spacing.css`, `effects.css`.
- `assets/` — logos, halftone textures, slogan lockup. (See `assets/` listing.)
- `SKILL.md` — Agent-Skills-compatible entry for using this system.

**Foundations** (Design System tab cards): `guidelines/`

**Components** (`components/`)
- `components/core/` — Button, IconButton, Badge, Tag, Card, Stat, Input, Eyebrow.

**UI kits** (`ui_kits/`)
- `ui_kits/website/` — Rockbusters marketing site recreation (hero, lineup, coaches, CTA).

**Slides** (`slides/`)
- Sample 16:9 deck templates in the Rockbusters brand.

Run `check_design_system` after edits to confirm the project compiles cleanly.
