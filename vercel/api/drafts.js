import { kv } from '@vercel/kv';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const rawNames = await kv.smembers('drafts:list');
    if (!rawNames || !rawNames.length) return res.json([]);

    // Normalize names — they may be stored as plain strings or as ["name"] arrays
    // depending on whether they were written via @vercel/kv or raw Upstash REST API
    const names = rawNames.map(n => {
      if (Array.isArray(n)) return n[0];
      if (typeof n === 'string') {
        try {
          const parsed = JSON.parse(n);
          if (Array.isArray(parsed)) return parsed[0];
        } catch {}
      }
      return n;
    }).filter(Boolean);

    const raw = await Promise.all(
      names.map(name => kv.get(`draft:${name}`))
    );

    // KV may return stored JSON strings — parse if needed
    const drafts = raw
      .filter(Boolean)
      .map(d => typeof d === 'string' ? JSON.parse(d) : d);

    res.json(drafts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
