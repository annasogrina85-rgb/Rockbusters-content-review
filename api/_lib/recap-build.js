import { kv } from '@vercel/kv';
import Anthropic from '@anthropic-ai/sdk';
import { put } from '@vercel/blob';
import { findFolderByName, listChildren, downloadText, imageJpeg, isImage } from './gdrive.js';

/**
 * Cloud "week recap" generator. Reads a camp folder from Drive
 * (05_UGC_Community/Camps/<Camp>/), vision-picks the best participant photos,
 * writes a recap from ONLY the participants' own words, and pushes a draft.
 */

// The service account only has the "Camps" folder shared to it, so we locate
// it directly by name rather than walking down from the Drive root.
async function getCampsFolderId() {
  const id = await findFolderByName('Camps');
  if (!id) throw new Error('Camps folder not visible — is it shared with the service account?');
  return id;
}

const TONE = `You are the content writer for Rockbusters Climbing (Jany, Rodellar). Write like a real climber, not marketing: short sentences, specific details, honest about fear before the breakthrough, understated. Use "we". Never use "embark on a journey", "transform", "incredible", "amazing", "are you ready", exclamation marks (unless quoting), emojis, or more than 12 hashtags.

STRICT participant rule: use ONLY the participants' own words provided. Do not invent quotes, feelings, achievements, grades, or events they did not state. If material is thin, write less.`;

function slugify(s) {
  return String(s).toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
}

async function pickBestPhotos(client, images, n) {
  const sample = images.slice(0, 10);
  const content = [{
    type: 'text',
    text: `These are participant photos from a climbing camp. Pick the ${n} best for a "week recap" carousel — prefer real candid/action moments with people, sharp and well-framed. Avoid blurry, dark, or near-duplicate shots.\nReply ONLY with JSON: {"choices":[<indexes>]} (length ${n}, from 0).`,
  }];
  for (let i = 0; i < sample.length; i++) {
    try {
      const buf = await imageJpeg(sample[i], 512);
      content.push({ type: 'text', text: `Photo ${i}:` });
      content.push({ type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: buf.toString('base64') } });
      sample[i]._ok = true;
    } catch { /* skip unreadable */ }
  }
  const usable = sample.filter(s => s._ok);
  try {
    const resp = await client.messages.create({ model: 'claude-opus-4-7', max_tokens: 300, messages: [{ role: 'user', content }] });
    const tb = resp.content.find(b => b.type === 'text');
    const m = tb?.text.match(/\{[\s\S]*\}/);
    const choices = m ? JSON.parse(m[0]).choices : null;
    if (Array.isArray(choices) && choices.length) {
      const picked = choices.map(i => sample[i]).filter(f => f && f._ok);
      if (picked.length) return picked.slice(0, n);
    }
  } catch { /* fall through */ }
  return usable.slice(0, n);
}

async function writeRecap(client, camp, quotes, nSlides) {
  const prompt = `Write a "week recap" Instagram carousel for the Rockbusters camp: ${camp}.

Participants' own words (use ONLY these — invent nothing):
${quotes || '(no quotes provided — keep text minimal and general about the week, no invented details)'}

Return JSON for a ${nSlides}-slide carousel:
{ "type":"carousel", "caption":"caption with up to 12 hashtags",
  "slides":[ { "label":"short label", "headline":"optional 2-4 words", "body":"1-3 lines" } ] }
${nSlides} slides total. Return only valid JSON.`;
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

/** Generate (or regenerate) the recap draft for one camp folder. */
export async function buildRecap(camp, { slides = 4 } = {}) {
  if (!process.env.ANTHROPIC_API_KEY) throw new Error('no ANTHROPIC_API_KEY');
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const campsId = await getCampsFolderId();
  const campFolder = (await listChildren(campsId)).find(
    e => e.mimeType === 'application/vnd.google-apps.folder' && e.name === camp
  );
  if (!campFolder) throw new Error(`camp folder not found: ${camp}`);

  const children = await listChildren(campFolder.id);
  const images = children.filter(isImage);
  if (!images.length) throw new Error('no photos in camp folder');

  const quotesFile = children.find(f => /^quotes\.(md|txt)$/i.test(f.name));
  const quotes = quotesFile ? (await downloadText(quotesFile.id)).trim() : '';

  const chosen = await pickBestPhotos(client, images, slides);
  if (!chosen.length) throw new Error('no usable photos');

  const draft = await writeRecap(client, camp, quotes, chosen.length);
  const name = `recap_${slugify(camp)}`;
  draft.name = name;
  draft.type = 'carousel';

  // Upload web-sized JPEGs (Drive thumbnails) to Blob
  const urls = [];
  for (let i = 0; i < chosen.length; i++) {
    const buf = await imageJpeg(chosen[i], 1280);
    const { url } = await put(`drafts/${name}/slide${i}.jpg`, buf, {
      access: 'public', addRandomSuffix: false, allowOverwrite: true, token: process.env.BLOB_READ_WRITE_TOKEN,
    });
    urls.push(url);
  }
  draft.photo = urls[0];
  draft.slides = (draft.slides || []).slice(0, urls.length).map((s, i) => ({ ...s, photo: urls[i] }));
  while (draft.slides.length < urls.length) draft.slides.push({ photo: urls[draft.slides.length], label: '', body: '' });

  draft._meta = {
    generated_at: new Date().toISOString(),
    status: 'pending_review',
    version: 1,
    comments: [],
    source: `Drive: 05_UGC_Community/Camps/${camp}`,
    _pcloud_paths: {},
  };

  await kv.set(`draft:${name}`, JSON.stringify(draft));
  await kv.sadd('drafts:list', name);
  return { name, photos: urls.length, quotes: !!quotes };
}

/**
 * Auto-detect: camp folders that are READY (contain a file named `ready*`),
 * have photos, and don't yet have a recap draft. Returns camp names to build.
 */
export async function findReadyCamps() {
  const campsId = await getCampsFolderId();
  const entries = await listChildren(campsId);
  const folders = entries.filter(e => e.mimeType === 'application/vnd.google-apps.folder');

  const ready = [];
  for (const f of folders) {
    const kids = await listChildren(f.id);
    const hasReady = kids.some(k => /^ready\b/i.test(k.name));
    const hasPhotos = kids.some(isImage);
    if (!hasReady || !hasPhotos) continue;
    const exists = await kv.get(`draft:recap_${slugify(f.name)}`);
    if (exists) continue; // already generated — skip
    ready.push(f.name);
  }
  return ready;
}
