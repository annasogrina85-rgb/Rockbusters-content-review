#!/usr/bin/env node
/**
 * Google Drive sync for Rockbusters content OS
 *
 * Uses rclone (rockbusters_drive remote) to read/write files in Google Drive.
 * Drive folder: Rockbusters Marketing/
 *   01_Content_Calendar/          — content-plan.json, monthly plans
 *   00_Brand/editorial-guidelines/ — rockbusters-editorial-rules.md
 *   03_Trainer_Content/            — coach input, participant interviews
 *
 * Usage:
 *   node sync-gdrive.js --pull-plan         — download content-plan from Drive → local
 *   node sync-gdrive.js --push-plan         — upload local content-plan.json → Drive
 *   node sync-gdrive.js --pull-guidelines   — download editorial guidelines
 *   node sync-gdrive.js --list-interviews   — list participant interview files
 *   node sync-gdrive.js --read-interview NAME — read one participant doc
 *   node sync-gdrive.js --create-guidelines — create guidelines doc in Drive (first run)
 */

const fs   = require('fs');
const path = require('path');
const { execSync, spawnSync } = require('child_process');

const RCLONE_REMOTE   = 'rockbusters_drive:Rockbusters Marketing';
const BASE_DIR        = __dirname;
const CONTENT_PLAN    = path.join(BASE_DIR, 'content-plan.json');
const GUIDELINES_FILE = path.join(BASE_DIR, 'editorial-guidelines.md');
const DRIVE_PLAN_PATH = '01_Content_Calendar/content-plan.json';
const DRIVE_GUIDE_DIR = '00_Brand/editorial-guidelines';
const DRIVE_GUIDE_PATH = `${DRIVE_GUIDE_DIR}/rockbusters-editorial-rules.md`;
const DRIVE_INTERVIEWS_DIR = '03_Trainer_Content/interviews';
const TMP_DIR = '/tmp/rbdocs';

// ─── rclone helpers ───────────────────────────────────────────────────────────

function rcloneRun(args, { silent = false } = {}) {
  const result = spawnSync('rclone', args, { encoding: 'utf8' });
  if (result.status !== 0 && !silent) {
    throw new Error(`rclone error: ${result.stderr || result.stdout}`);
  }
  return result.stdout;
}

function rcloneCopy(src, dest) {
  rcloneRun(['copy', src, dest]);
}

function rcloneCopyFile(src, destDir) {
  rcloneRun(['copyto', src, destDir]);
}

function ensureTmp() {
  if (!fs.existsSync(TMP_DIR)) fs.mkdirSync(TMP_DIR, { recursive: true });
}

/**
 * Extract plain text from a .docx file.
 */
function docxToText(filePath) {
  try {
    const result = spawnSync('python3', ['-c', `
import zipfile, re, sys
path = sys.argv[1]
with zipfile.ZipFile(path) as z:
    with z.open('word/document.xml') as f:
        content = f.read().decode('utf-8')
        text = re.sub(r'<[^>]+>', ' ', content)
        text = re.sub(r'\\s+', ' ', text).strip()
        print(text)
`, filePath], { encoding: 'utf8' });
    return result.stdout.trim();
  } catch {
    return null;
  }
}

// ─── Content Plan ─────────────────────────────────────────────────────────────

/**
 * Pull content-plan.json from Drive. Falls back silently to local copy on error.
 */
async function pullContentPlan() {
  try {
    ensureTmp();
    const tmpFile = path.join(TMP_DIR, 'content-plan.json');
    rcloneCopyFile(`${RCLONE_REMOTE}/${DRIVE_PLAN_PATH}`, tmpFile);
    if (fs.existsSync(tmpFile)) {
      const data = JSON.parse(fs.readFileSync(tmpFile, 'utf8'));
      fs.writeFileSync(CONTENT_PLAN, JSON.stringify(data, null, 2));
      console.log(`  ✓ content-plan.json pulled from Drive`);
      return data;
    }
  } catch (err) {
    console.warn(`  ⚠ Could not pull content-plan from Drive: ${err.message}`);
    console.warn(`    Using local content-plan.json`);
  }
  return JSON.parse(fs.readFileSync(CONTENT_PLAN, 'utf8'));
}

/**
 * Push local content-plan.json to Drive.
 */
async function pushContentPlan() {
  try {
    rcloneCopyFile(CONTENT_PLAN, `${RCLONE_REMOTE}/${DRIVE_PLAN_PATH}`);
    console.log(`  ✓ content-plan.json pushed to Drive`);
  } catch (err) {
    console.error(`  ✗ Failed to push content-plan to Drive: ${err.message}`);
    throw err;
  }
}

// ─── Editorial Guidelines ─────────────────────────────────────────────────────

/**
 * Pull editorial guidelines from Drive.
 */
async function pullEditorialGuidelines() {
  try {
    ensureTmp();
    const tmpFile = path.join(TMP_DIR, 'editorial-guidelines.md');
    rcloneCopyFile(`${RCLONE_REMOTE}/${DRIVE_GUIDE_PATH}`, tmpFile);
    if (fs.existsSync(tmpFile)) {
      const text = fs.readFileSync(tmpFile, 'utf8');
      fs.writeFileSync(GUIDELINES_FILE, text);
      console.log(`  ✓ Editorial guidelines pulled from Drive`);
      return text;
    }
  } catch (err) {
    console.warn(`  ⚠ Could not pull guidelines from Drive: ${err.message}`);
  }
  if (fs.existsSync(GUIDELINES_FILE)) {
    return fs.readFileSync(GUIDELINES_FILE, 'utf8');
  }
  return null;
}

/**
 * Create editorial guidelines in Drive (first-run setup).
 */
async function createEditorialGuidelines() {
  const content = generateEditorialGuidelinesDoc();
  fs.writeFileSync(GUIDELINES_FILE, content);

  try {
    rcloneCopyFile(GUIDELINES_FILE, `${RCLONE_REMOTE}/${DRIVE_GUIDE_PATH}`);
    console.log(`  ✓ Editorial guidelines created in Drive at: ${DRIVE_GUIDE_PATH}`);
  } catch (err) {
    console.warn(`  ⚠ Failed to push to Drive: ${err.message}`);
    console.log(`  ✓ Editorial guidelines saved locally at: ${GUIDELINES_FILE}`);
  }
  return content;
}

// ─── Participant Interviews ───────────────────────────────────────────────────

/**
 * List participant interview files in Drive.
 */
async function listInterviews() {
  try {
    // Check both the interviews subfolder and the main trainer content folder
    const output = rcloneRun(['lsf', `${RCLONE_REMOTE}/03_Trainer_Content`, '--include', '*.docx'], { silent: true });
    const files = output.trim().split('\n').filter(Boolean);
    return files;
  } catch {
    return [];
  }
}

/**
 * Read a participant/trainer interview doc by partial name.
 */
async function readParticipantDoc(nameFragment) {
  ensureTmp();
  const files = await listInterviews();
  const match = files.find(f => f.toLowerCase().includes(nameFragment.toLowerCase()));

  if (!match) {
    console.warn(`  ⚠ No interview doc found matching: ${nameFragment}`);
    return null;
  }

  const tmpFile = path.join(TMP_DIR, match);
  rcloneCopyFile(`${RCLONE_REMOTE}/03_Trainer_Content/${match}`, tmpFile);

  if (match.endsWith('.docx')) {
    return docxToText(tmpFile);
  }
  return fs.readFileSync(tmpFile, 'utf8');
}

// ─── Generate Guidelines Doc ─────────────────────────────────────────────────

function generateEditorialGuidelinesDoc() {
  return `# Rockbusters — Editorial Guidelines

Last updated: ${new Date().toISOString().slice(0, 10)}

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
- If no participant data is found in Drive → set status to \`blocked_needs_participant_data\`
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

- All photos sourced from pCloud archive: \`photos/jany/{location}/\`
- pCloud code for public link: configured in .env as PCLOUD_CODE
- If pCloud URLs expire, re-resolve via \`_meta._pcloud_paths\` in push-drafts.js
- Photo replacement: upload directly in review app, or paste a URL in comments
- Photo must match content — no stock photos, no re-used shots from unrelated camps

---

## Post Approval Process

1. Agent generates draft → saves to \`drafts/{name}.json\`
2. \`push-drafts.js\` resolves pCloud URLs → stores in Vercel KV
3. Anna + Jany review in Vercel review app (URL sent in morning email)
4. Options:
   - **Approve** → status = \`approved\`, ready to post
   - **Reject** → status = \`rejected\`, increment reject count
   - **Comment** → status = \`needs_revision\`, agent regens on next morning run
   - **Upload photo** → replacement photo attached, agent regens
5. If rejected 3× → flagged as \`needs_rethink\`, added to info_needed list
6. Approved drafts → move to \`output/\` via \`generate.js\` → post to Instagram

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
- [ ] Any new participant interview docs in Drive \`03_Trainer_Content/\`?
- [ ] Any drafts with \`needs_revision\` status? → regen
- [ ] Any plan items with \`pending\` status and no draft? → generate
- [ ] Are pCloud CDN URLs still valid? → re-resolve if expired
- [ ] Any plan comments in KV (\`plan:comments:*\`)? → inject into briefs

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
- Anna's Rodellar story (\`anna_story_post\`) — first-person, honest, un-polished
- Sport Basics announcement — clear structure, specific dates/coaches
- Rodellar highlight cover — place portrait, one strong line

---

*These guidelines live in Google Drive: Rockbusters Marketing / 00_Brand / editorial-guidelines*
*Agent reads this file every morning. To update a rule, edit here — changes take effect the following morning.*
`;
}

// ─── CLI ─────────────────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);

  if (args.includes('--pull-plan')) {
    await pullContentPlan();
    return;
  }

  if (args.includes('--push-plan')) {
    await pushContentPlan();
    return;
  }

  if (args.includes('--pull-guidelines')) {
    const text = await pullEditorialGuidelines();
    if (!text) console.log('  No guidelines found in Drive or locally.');
    return;
  }

  if (args.includes('--create-guidelines')) {
    await createEditorialGuidelines();
    return;
  }

  if (args.includes('--list-interviews')) {
    const files = await listInterviews();
    if (files.length === 0) {
      console.log('  No interview docs found.');
    } else {
      console.log(`  Found ${files.length} interview docs:`);
      files.forEach(f => console.log(`    • ${f}`));
    }
    return;
  }

  const readIdx = args.indexOf('--read-interview');
  if (readIdx !== -1) {
    const name = args[readIdx + 1];
    if (!name) {
      console.error('Usage: node sync-gdrive.js --read-interview NAME');
      process.exit(1);
    }
    const text = await readParticipantDoc(name);
    if (text) console.log(text);
    return;
  }

  console.log(`
Rockbusters Google Drive Sync
Usage:
  node sync-gdrive.js --pull-plan            Download content-plan from Drive
  node sync-gdrive.js --push-plan            Upload content-plan to Drive
  node sync-gdrive.js --pull-guidelines      Download editorial guidelines
  node sync-gdrive.js --create-guidelines    Create guidelines doc in Drive (first run)
  node sync-gdrive.js --list-interviews      List participant interview docs
  node sync-gdrive.js --read-interview NAME  Read a participant doc (partial name match)
  `);
}

module.exports = { pullContentPlan, pushContentPlan, pullEditorialGuidelines, readParticipantDoc, listInterviews };

main().catch(err => {
  console.error('\nFatal:', err.message);
  process.exit(1);
});
