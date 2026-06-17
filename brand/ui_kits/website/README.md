# Rockbusters — Website UI kit

High-fidelity recreation of the Rockbusters marketing site, composed from the
design-system core components.

## Run
Open `index.html`. It loads `../../styles.css` + `../../_ds_bundle.js` (built by the
compiler), React, Babel and Lucide, then mounts the app.

## Screens / flow (interactive)
- **Home** — dark hero (`Hero`) → red `StatsBand` → "what we cover" (`Cover`) →
  filterable `Lineup` → `Coaches` → red `Philosophy` band → `Footer`.
- **Trips** — the `Lineup` grid with a working discipline filter (Sport / Bouldering /
  Trad / Multi-pitch / Beginner).
- **Coaches** — the roster grid.
- **Enquiry modal** (`EnquiryModal`) — opens from any "Book a camp" / "Enquire" / CTA;
  fake submit shows a success state.

Top-nav switches views; "Book a camp" opens the enquiry modal anywhere.

## Files
- `index.html` — app shell + tiny view router + enquiry modal state.
- `data.js` — fake trips & coaches (`window.RB_DATA`), drawn from the brand copy.
- `util.jsx` — `Ic` (Lucide renderer) + `Photo` (honest image placeholder).
- `Header.jsx`, `Home.jsx`, `Lineup.jsx`, `Coaches.jsx`, `EnquiryModal.jsx` — sections.

## Notes
- **Imagery is placeholdered** (`Photo`) — no invented photography. Real Rockbusters
  shots (warm rock, athletes mid-move) drop straight into those slots.
- Icons are **Lucide** (CDN) — see README §5 (substitution flagged there).
- Components come from the bundle namespace `window.RockbustersDesignSystem_5b5bc2`.
