# Rockbusters — Editorial Guidelines

Last updated: 2026-05-26

---

## North Star

Every piece of content should make someone feel: "I want to be part of this."
Not: "This looks like a professional climbing company."
Not: "This is a good travel product."
But: "These are real people. This is real progress. I could be there."

---

## Brand Voice

Write like a real climber, not a marketing team.

- **Short sentences.** Fragments are fine.
- **Specific over generic** — name the route, the grade, the moment, the person
- **Honest about fear and failure** before the breakthrough
- **No manufactured inspiration** — real emotions, understated
- Use **"we"** not "our community" or "our clients"
- No exclamation marks (unless quoting someone directly)
- No emojis
- No more than 12 hashtags

### Forbidden phrases
Never write: "embark on a journey", "transform", "incredible", "amazing", "are you ready to...", "game-changer", "next level", "stunning", any corporate buzzwords

---

## Content Types

### 1. Announcement Carousels (highest priority)
- 5-slide format: cover → coach intro → program → testimonial/detail → CTA
- Must include: camp name, exact dates, location, coach name, website URL
- Photos: from pCloud, matching the camp location
- Caption: follows structural pattern below

### 2. Highlights (storytelling covers)
- NOT just a cover image — must have full narrative text
- Photos MUST come from pCloud archive (photos/jany/{location}/). If no photos found, post is blocked until photos are provided
- Anna or Jany can provide a photo link or upload replacement in the review app
- Text overlaid on cover photo = the story headline + subline

### 3. Interview / Participant Posts (STRICT RULES)
- Content source: **ONLY** what the participant themselves wrote or said
  (bio, registration form, direct messages, interview document in Drive)
- **Zero fabrication policy**: do not add facts, invent emotions, enhance achievements, or describe their climbing beyond what they stated
- If source material is thin → write a shorter post; never fill gaps with assumptions
- If no participant data is found in Drive → set status to `blocked_needs_participant_data`
- Always confirm with the participant before publishing

### 4. Stories (future phase)
- Daily when camp is live, 3–4x per week otherwise
- Repost tagged content (@rockbusters mentions)
- Not automated — manual checklist in daily todo

---

## Caption Structure

1. **Sharp scene-setter** — drop the reader in, no preamble
2. **Specific detail** — route name, grade, the exact moment, who was there
3. **The doubt or the struggle** — what made it hard
4. **The turn** — what shifted
5. **The simple truth** — one line that lands
6. **CTA** (optional) — next camp, link in bio — only if relevant
7. **Hashtags** — max 12, relevant only

---

## Photo Rules

- All photos sourced from pCloud archive: `photos/jany/{location}/`
- pCloud code for public link: configured in .env as PCLOUD_CODE
- If pCloud URLs expire, re-resolve via `_meta._pcloud_paths` in push-drafts.js
- Photo replacement: upload directly in review app, or paste a URL in comments
- Photo must match content — no stock photos, no re-used shots from unrelated camps

---

## Post Approval Process

1. Agent generates draft → saves to `drafts/{name}.json`
2. `push-drafts.js` resolves pCloud URLs → stores in Vercel KV
3. Anna + Jany review in Vercel review app (URL sent in morning email)
4. Options:
   - **Approve** → status = `approved`, ready to post
   - **Reject** → status = `rejected`, increment reject count
   - **Comment** → status = `needs_revision`, agent regens on next morning run
   - **Upload photo** → replacement photo attached, agent regens
5. If rejected 3× → flagged as `needs_rethink`, added to info_needed list
6. Approved drafts → move to `output/` via `generate.js` → post to Instagram

---

## Daily Agent Schedule

| Time | Agent | Action |
|------|-------|--------|
| 9:00 CET | Morning agent | Pull Drive → process feedback → regen → generate new → email |
| 15:00 CET | Afternoon agent | Pull feedback → regen new comments → sync Drive → email if changes |

---

## What the Agent Should Always Check

Each morning run:
- [ ] Are there new guidelines added manually to this document? (pull from Drive)
- [ ] Any new participant interview docs in Drive `03_Trainer_Content/`?
- [ ] Any drafts with `needs_revision` status? → regen
- [ ] Any plan items with `pending` status and no draft? → generate
- [ ] Are pCloud CDN URLs still valid? → re-resolve if expired
- [ ] Any plan comments in KV (`plan:comments:*`)? → inject into briefs

---

## Key People

| Name | Role | Content angle |
|------|------|--------------|
| Jany (Jan Novotny) | Founder, lead coach | Mental coaching, Rodellar obsession, pushing limits |
| Klemen Becan | Senior coach (IFMGA) | World-class movement, precision, alpine + limestone |
| Petra Pivonkova | Coach | 8c climber, sharp eye for movement |
| Laszlo Juhasz | Coach | Technique, confidence, beginner-friendly |
| Arturo Aparicio | Coach | Psicobloc, Mallorca, adventure climbing |

---

## Tone Reference (from approved content)

Good examples to study:
- Anna's Rodellar story (`anna_story_post`) — first-person, honest, un-polished
- Sport Basics announcement — clear structure, specific dates/coaches
- Rodellar highlight cover — place portrait, one strong line

---

*These guidelines live in Google Drive: Rockbusters Marketing / 00_Brand / editorial-guidelines*
*Agent reads this file every morning. To update a rule, edit here — changes take effect the following morning.*
