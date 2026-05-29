import { kv } from '@vercel/kv';
import Anthropic from '@anthropic-ai/sdk';

/**
 * Comment-driven regeneration — shared logic used by the cron endpoints.
 *
 * For every draft with status `needs_revision` and human comments, ask Claude
 * to rewrite ONLY the text fields to address the feedback, keeping the same
 * structure. Photos/videos are never touched here (photo swaps stay manual).
 *
 * After a successful rewrite the draft goes back to `pending_review` so the
 * morning email surfaces it for a fresh look.
 */

const MODEL = 'claude-opus-4-7';

const TONE = `You are the content writer for Rockbusters Climbing — a climbing camp company run by Jany (Jan Novotny) in Rodellar, Spain. Coaches: Klemen Becan, Petra Pivonkova, Laszlo Juhasz, Arturo Aparicio.

Brand voice — write like a real climber, not a marketing team:
- Short sentences. Fragments are fine.
- Specific over generic — name the route, the grade, the moment, the person.
- Honest about fear and failure before the breakthrough. Understated emotion.
- Use "we", never "our community"/"our clients".
- Never use: "embark on a journey", "transform", "incredible", "amazing", "are you ready", exclamation marks (unless quoting someone), emojis, more than 12 hashtags, corporate phrases.`;

// Text fields we allow regen to overwrite (everything else — photos, video, meta — is preserved)
const TOP_TEXT_KEYS = ['caption', 'quote', 'attribution', 'context', 'title', 'subtitle', 'eyebrow', 'headline'];
const SLIDE_TEXT_KEYS = ['label', 'headline', 'body', 'eyebrow', 'subline'];

function normalizeName(n) {
  if (Array.isArray(n)) return n[0];
  if (typeof n === 'string') {
    try { const p = JSON.parse(n); if (Array.isArray(p)) return p[0]; } catch {}
  }
  return n;
}

// Strip a draft down to the text the model should revise (no photo/video URLs)
function textView(draft) {
  const view = { type: draft.type, name: draft.name };
  for (const k of TOP_TEXT_KEYS) if (draft[k] !== undefined) view[k] = draft[k];
  if (Array.isArray(draft.slides)) {
    view.slides = draft.slides.map(s => {
      const o = {};
      for (const k of SLIDE_TEXT_KEYS) if (s[k] !== undefined) o[k] = s[k];
      return o;
    });
  }
  return view;
}

// Merge revised text back into the original draft, preserving photos/videos/meta
function mergeText(original, revised) {
  for (const k of TOP_TEXT_KEYS) {
    if (revised[k] !== undefined && typeof revised[k] === 'string') original[k] = revised[k];
  }
  if (Array.isArray(original.slides) && Array.isArray(revised.slides)) {
    original.slides.forEach((slide, i) => {
      const r = revised.slides[i];
      if (!r) return;
      for (const k of SLIDE_TEXT_KEYS) {
        if (r[k] !== undefined && typeof r[k] === 'string') slide[k] = r[k];
      }
    });
  }
  return original;
}

function humanComments(meta) {
  return (meta?.comments || []).filter(c =>
    c?.text && !c.text.startsWith('⚠️') && !c.text.startsWith('Note:') && !c.text.startsWith('TODO:')
  );
}

const PHOTO_HINT = /(photo|picture|image|cover|фот|обложк|сним|картин|видео|video)/i;

async function regenOne(client, name) {
  const draft = await kv.get(`draft:${name}`);
  const obj = typeof draft === 'string' ? JSON.parse(draft) : draft;
  if (!obj) return { name, skipped: 'not found' };

  const comments = humanComments(obj._meta);
  if (!comments.length) return { name, skipped: 'no human comments' };

  const photoRequested = comments.some(c => PHOTO_HINT.test(c.text));

  const prompt = `Here is the current Instagram post (text only — photos are managed separately and must NOT change):

${JSON.stringify(textView(obj), null, 2)}

The reviewer left this feedback:
${comments.map((c, i) => `${i + 1}. "${c.text}"`).join('\n')}

Rewrite the TEXT to address every point of feedback. Keep exactly the same JSON structure and keys as above (same number of slides, same field names). Do not add or remove slides. Do not include any photo or video fields. If the feedback is about a photo/video, ignore that part here (it is handled separately) and focus on the text.

Return ONLY the JSON object, no preamble.`;

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 4000,
    thinking: { type: 'adaptive' },
    system: [{ type: 'text', text: TONE, cache_control: { type: 'ephemeral' } }],
    messages: [{ role: 'user', content: prompt }],
  });

  const textBlock = response.content.find(b => b.type === 'text');
  if (!textBlock) return { name, error: 'no text block from model' };
  const m = textBlock.text.match(/\{[\s\S]*\}/);
  if (!m) return { name, error: 'model returned non-JSON' };

  let revised;
  try { revised = JSON.parse(m[0]); } catch (e) { return { name, error: 'JSON parse failed: ' + e.message }; }

  const merged = mergeText(obj, revised);

  // Bookkeeping
  merged._meta = merged._meta || {};
  const prevVersion = merged._meta.version || 1;
  merged._meta.version = prevVersion + 1;
  merged._meta.status = 'pending_review';
  merged._meta.comments_history = [
    ...(merged._meta.comments_history || []),
    ...comments.map(c => ({ ...c, addressed_in_version: prevVersion + 1 })),
  ];
  merged._meta.comments = photoRequested
    ? [{ text: '⚠️ Photo/video change requested — handle manually (text was auto-revised)', at: new Date().toISOString(), system: true }]
    : [];
  merged._meta.last_regen = new Date().toISOString();

  await kv.set(`draft:${name}`, JSON.stringify(merged));
  return { name, ok: true, version: merged._meta.version, photoRequested };
}

/**
 * Process up to `limit` drafts that need revision.
 * Returns a summary array. Never throws — individual failures are captured.
 */
export async function runRegen({ limit = 6 } = {}) {
  if (!process.env.ANTHROPIC_API_KEY) return { ran: false, reason: 'no ANTHROPIC_API_KEY', results: [] };

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const rawNames = await kv.smembers('drafts:list');
  const names = (rawNames || []).map(normalizeName).filter(Boolean);

  // Find drafts that actually need revision
  const queue = [];
  for (const name of names) {
    const d = await kv.get(`draft:${name}`);
    const obj = typeof d === 'string' ? JSON.parse(d) : d;
    if (obj?._meta?.status === 'needs_revision' && humanComments(obj._meta).length) {
      queue.push(name);
    }
  }

  const results = [];
  for (const name of queue.slice(0, limit)) {
    try {
      results.push(await regenOne(client, name));
    } catch (e) {
      results.push({ name, error: e.message });
    }
  }

  return { ran: true, found: queue.length, processed: results.length, results };
}
