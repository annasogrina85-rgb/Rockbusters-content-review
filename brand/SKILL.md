---
name: rockbusters-design
description: Use this skill to generate well-branded interfaces and assets for Rockbusters (a global community of elite rock-climbing guides & coaches), either for production or throwaway prototypes/mocks/etc. Contains essential design guidelines, colors, type, fonts, assets, and UI kit components for prototyping.
user-invocable: true
---

# Rockbusters Design System

Read `readme.md` for the full guide — brand context, content/voice fundamentals,
visual foundations, iconography, and a file index. Then explore the other files.

**Quick orientation**
- Tokens / CSS: `styles.css` (entry) → `tokens/*.css` + `components.css`. Link `styles.css`.
- Components: `components/core/` — `Button`, `IconButton`, `Badge`, `Tag`, `Card`,
  `Stat`, `Input`, `Eyebrow`. Each has a `.jsx`, `.d.ts` and `.prompt.md`.
- UI kit: `ui_kits/website/` — interactive marketing-site recreation.
- Assets: `assets/` — logos (`logo-02` lockup, `logo-03` mark), grungy halftone
  textures (`pattern-*`), slogan lockup (`climb-hard-sleep`).

**Brand in one breath:** signal **red `#E30613`** + hard **black** + **white**;
**Montserrat** worked hard (Black uppercase display, sentence-case body); grungy
halftone textures on black sections; hard-edged, athletic, pill buttons; voice is
bold, punchy, insider — *"Climb better, harder & more."* / *"Play hard. Work harder."*
No emoji. Icons = Lucide (line).

**When working:**
- For visual artifacts (slides, mocks, throwaway prototypes): copy assets out and produce
  static HTML files the user can view.
- For production code: copy assets and follow the rules here to design on-brand.
- If invoked with no other guidance, ask what the user wants to build, ask a few focused
  questions, then act as an expert Rockbusters designer outputting HTML artifacts _or_
  production code as needed.
