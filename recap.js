#!/usr/bin/env node
/**
 * recap.js — build a "week recap" post from a camp's participant content.
 *
 * Reads a per-camp folder from Google Drive (via rclone):
 *   05_UGC_Community/Camps/<Camp Name>/
 *     • participant photos (jpg/png/heic)
 *     • quotes.md  — participants' own words ("quote" — Name), one per line
 *
 * Then: vision-picks the best shots → writes a recap carousel using ONLY the
 * participants' words → uploads photos to Blob → pushes a draft to KV
 * (status pending_review) so it shows up in the review app.
 *
 * Usage:
 *   node recap.js "Rodellar 2026-05"
 *   node recap.js "Rodellar 2026-05" --slides 4
 */

require('dotenv').config({ override: true });
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');
const Anthropic = require('@anthropic-ai/sdk');
const { put } = require('@vercel/blob');

const DRIVE_BASE = 'rockbusters_drive:Rockbusters Marketing/05_UGC_Community/Camps';
const KV_URL = () => process.env.KV_REST_API_URL;
const KV_TOKEN = () => process.env.KV_REST_API_TOKEN;
const IMAGE_EXT = /\.(jpe?g|png|heic|webp)$/i;

const TONE = `You are the content writer for Rockbusters Climbing (Jany, Rodellar). Write like a real climber, not marketing: short sentences, specific details, honest about fear before the breakthrough, understated. Use "we". Never use "embark on a journey", "transform", "incredible", "amazing", "are you ready", exclamation marks (unless quoting), emojis, corporate phrases. The first line is the hook (Instagram cuts captions at ~125 chars). Hashtags: 3-5 only, never more than 5.

STRICT participant rule: use ONLY the participants' own words provided. Do not invent quotes, feelings, achievements, grades, or events they did not state. If material is thin, write less.`;

// ─── rclone helpers ───────────────────────────────────────────────────────────

function rclone(args) {
  const r = spawnSync('rclone', args, { encoding: 'utf8' });
  if (r.status !== 0) throw new Error(`rclone failed: ${r.stderr || r.stdout}`);
  return r.stdout;
}

function listCampFiles(camp) {
  const out = rclone(['lsjson', `${DRIVE_BASE}/${camp}`]);
  return JSON.parse(out).filter(f => !f.IsDir);
}

// ─── KV helpers ───────────────────────────────────────────────────────────────

async function kvSet(key, value) {
  const res = await fetch(`${KV_URL()}/set/${encodeURIComponent(key)}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${KV_TOKEN()}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(JSON.stringify(value)),
  });
  if (!res.ok) throw new Error(`KV set ${res.status}`);
}
async function kvSAdd(key, member) {
  await fetch(`${KV_URL()}/sadd/${encodeURIComponent(key)}/${encodeURIComponent(member)}`, {
    method: 'POST', headers: { Authorization: `Bearer ${KV_TOKEN()}` },
  });
}

// ─── Image helpers ──────────────────────────────────────────────────────────--

function toJpeg(srcPath) {
  if (/\.jpe?g$/i.test(srcPath)) return srcPath;
  const out = srcPath.replace(/\.[^.]+$/, '.jpg');
  const r = spawnSync('sips', ['-s', 'format', 'jpeg', srcPath, '--out', out], { encoding: 'utf8' });
  if (r.status !== 0) return srcPath; // fall back to original if sips unavailable
  return out;
}
function fixOrientation(srcPath) {
  // strip EXIF rotation by re-encoding through sips (no-op rotation normalizes it)
  spawnSync('sips', ['-r', '0', srcPath], { encoding: 'utf8' });
  return srcPath;
}
// Make a resized copy (max dimension `max`) — keeps requests small + web-sized
function resized(srcPath, max, suffix) {
  const out = srcPath.replace(/\.jpe?g$/i, `.${suffix}.jpg`);
  const r = spawnSync('sips', ['-Z', String(max), srcPath, '--out', out], { encoding: 'utf8' });
  return r.status === 0 ? out : srcPath;
}
function b64(p) { return fs.readFileSync(p).toString('base64'); }

// ─── Vision: pick the best N photos ─────────────────────────────────────────--

async function pickBestPhotos(client, files, n) {
  const sample = files.slice(0, 12);
  const content = [{
    type: 'text',
    text: `These are participant photos from a climbing camp. Pick the ${n} best for a "week recap" carousel — prefer real candid/action moments with people, sharp and well-framed. Avoid blurry, dark, or near-duplicate shots.\n\nReply ONLY with JSON: {"choices":[<indexes>]} (length ${n}, numbered from 0).`,
  }];
  sample.forEach((f, i) => {
    content.push({ type: 'text', text: `Photo ${i}:` });
    content.push({ type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: b64(f.visionThumb) } });
  });
  try {
    const resp = await client.messages.create({ model: 'claude-opus-4-7', max_tokens: 300, messages: [{ role: 'user', content }] });
    const tb = resp.content.find(b => b.type === 'text');
    const m = tb?.text.match(/\{[\s\S]*\}/);
    const choices = m ? JSON.parse(m[0]).choices : null;
    if (Array.isArray(choices) && choices.length) return choices.map(i => sample[i]).filter(Boolean).slice(0, n);
  } catch (e) { console.warn('  ⚠ vision pick failed, using first photos:', e.message); }
  return sample.slice(0, n);
}

// ─── Generate recap content ─────────────────────────────────────────────────--

async function writeRecap(client, camp, quotes, nSlides) {
  const prompt = `Write a "week recap" Instagram carousel for the Rockbusters camp: ${camp}.

Participants' own words (use ONLY these — do not invent anything):
${quotes || '(no quotes provided — keep text minimal and general about the week, no invented details)'}

Return JSON for a ${nSlides}-slide carousel:
{
  "type": "carousel",
  "caption": "full caption with 3-5 hashtags",
  "slides": [
    { "label": "short label", "headline": "optional 2-4 words", "body": "1-3 lines" }
    // ${nSlides} slides total; the cover slide can use eyebrow/headline/subline
  ]
}
Return only valid JSON.`;
  const resp = await client.messages.create({
    model: 'claude-opus-4-7', max_tokens: 2000, thinking: { type: 'adaptive' },
    system: [{ type: 'text', text: TONE, cache_control: { type: 'ephemeral' } }],
    messages: [{ role: 'user', content: prompt }],
  });
  const tb = resp.content.find(b => b.type === 'text');
  const m = tb.text.match(/\{[\s\S]*\}/);
  if (!m) throw new Error('recap text was not JSON');
  return JSON.parse(m[0]);
}

// ─── Main ───────────────────────────────────────────────────────────────────--

async function main() {
  const args = process.argv.slice(2);
  const camp = args.find(a => !a.startsWith('--'));
  const nSlides = Number((args.find(a => a.startsWith('--slides')) || '').split('=')[1] || args[args.indexOf('--slides') + 1]) || 4;
  if (!camp) { console.error('Usage: node recap.js "<Camp folder name>"'); process.exit(1); }
  if (!process.env.ANTHROPIC_API_KEY) { console.error('Missing ANTHROPIC_API_KEY'); process.exit(1); }

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const slug = camp.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
  const name = `recap_${slug}`;

  console.log(`\n📸 Building recap for "${camp}"\n`);

  // 1. List + download camp folder
  const files = listCampFiles(camp);
  const photoFiles = files.filter(f => IMAGE_EXT.test(f.Name));
  const quoteFile = files.find(f => /^quotes\.(md|txt)$/i.test(f.Name));
  console.log(`  ${photoFiles.length} photos, quotes file: ${quoteFile ? 'yes' : 'no'}`);
  if (!photoFiles.length) { console.error('  No photos in folder — add participant photos first.'); process.exit(1); }

  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'recap-'));
  rclone(['copy', `${DRIVE_BASE}/${camp}`, tmp, '--include', '*.{jpg,jpeg,JPG,JPEG,png,PNG,heic,HEIC,webp,md,txt}']);

  let quotes = '';
  if (quoteFile && fs.existsSync(path.join(tmp, quoteFile.Name))) {
    quotes = fs.readFileSync(path.join(tmp, quoteFile.Name), 'utf8').trim();
  }

  // 2. Normalize photos (HEIC→jpg, fix rotation)
  const prepared = [];
  for (const f of photoFiles) {
    const local = path.join(tmp, f.Name);
    if (!fs.existsSync(local)) continue;
    const jpeg = fixOrientation(toJpeg(local));
    prepared.push({
      Name: f.Name,
      localJpeg: jpeg,
      visionThumb: resized(jpeg, 768, 'vthumb'), // small, for the vision request
      webJpeg: resized(jpeg, 1280, 'web'),       // web-sized, for Blob
    });
  }

  // 3. Vision-pick the best shots (cover + slides)
  console.log('  🔍 Vision-selecting best photos...');
  const chosen = await pickBestPhotos(client, prepared, nSlides);
  console.log(`     picked: ${chosen.map(c => c.Name).join(', ')}`);

  // 4. Write recap text from participant words
  console.log('  ✍️  Writing recap from participants\' words...');
  const draft = await writeRecap(client, camp, quotes, nSlides);
  draft.name = name;
  draft.type = 'carousel';

  // 5. Upload chosen photos to Blob, attach to slides + cover
  console.log('  ☁️  Uploading photos to Blob...');
  const urls = [];
  for (let i = 0; i < chosen.length; i++) {
    const buf = fs.readFileSync(chosen[i].webJpeg || chosen[i].localJpeg);
    const { url } = await put(`drafts/${name}/slide${i}.jpg`, buf, {
      access: 'public', addRandomSuffix: false, allowOverwrite: true, token: process.env.BLOB_READ_WRITE_TOKEN,
    });
    urls.push(url);
  }
  draft.photo = urls[0];
  draft.slides = (draft.slides || []).slice(0, urls.length).map((s, i) => ({ ...s, photo: urls[i] }));
  // pad slides if model returned fewer than photos
  while (draft.slides.length < urls.length) draft.slides.push({ photo: urls[draft.slides.length], label: '', body: '' });

  draft._meta = {
    generated_at: new Date().toISOString(),
    status: 'pending_review',
    version: 1,
    comments: [],
    source: `Drive: 05_UGC_Community/Camps/${camp}`,
    _pcloud_paths: {}, // recap photos come from Drive, not pCloud
  };

  // 6. Push to KV + drafts list
  await kvSet(`draft:${name}`, draft);
  await kvSAdd('drafts:list', name);
  console.log(`\n✅ Recap draft "${name}" pushed. Open the review app to see it.\n`);

  fs.rmSync(tmp, { recursive: true, force: true });
}

main().catch(err => { console.error('\n❌ recap error:', err.message); process.exit(1); });
