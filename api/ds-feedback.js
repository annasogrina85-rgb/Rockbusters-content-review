import { kv } from '@vercel/kv';

/**
 * Design-system feedback — per-section comments from the team on /design-review.
 *   GET  /api/ds-feedback            → { items: [...] } (newest first)
 *   POST /api/ds-feedback            → body { section, name, text }
 *
 * Stored in KV under `ds:feedback` (JSON array). Surfaced back on the review
 * page under each section, and new items are flagged in the daily email so
 * the agent (and Anna) can act on them.
 */
const KEY = 'ds:feedback';
const MAX_ITEMS = 500;
const MAX_TEXT = 2000;

async function readAll() {
  const raw = await kv.get(KEY);
  const arr = typeof raw === 'string' ? JSON.parse(raw) : raw;
  return Array.isArray(arr) ? arr : [];
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    if (req.method === 'GET') {
      const items = await readAll();
      return res.json({ items: items.slice().reverse() });
    }

    if (req.method === 'POST') {
      const { section, name, text } = req.body || {};
      if (!section || !text || !String(text).trim()) {
        return res.status(400).json({ error: 'Missing section or text' });
      }
      const items = await readAll();
      const item = {
        id: `fb_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        section: String(section).slice(0, 80),
        name: String(name || 'anonymous').slice(0, 60),
        text: String(text).trim().slice(0, MAX_TEXT),
        at: new Date().toISOString(),
        status: 'new', // -> 'done' once applied by the agent
      };
      items.push(item);
      await kv.set(KEY, JSON.stringify(items.slice(-MAX_ITEMS)));
      return res.json({ ok: true, item });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
