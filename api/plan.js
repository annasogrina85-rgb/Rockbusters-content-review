import { kv } from '@vercel/kv';
import { reviewPlan } from './_lib/plan-review.js';

function normalizeName(n) {
  if (Array.isArray(n)) return n[0];
  if (typeof n === 'string') { try { const p = JSON.parse(n); if (Array.isArray(p)) return p[0]; } catch {} }
  return n;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    // GET /api/plan — return content plan from KV + a fresh plan review
    if (req.method === 'GET') {
      const raw = await kv.get('content-plan');
      const plan = !raw ? { upcoming_camps: [], posts: [], highlights: [], info_needed: [] }
        : (typeof raw === 'string' ? JSON.parse(raw) : raw);

      // Pull live draft statuses so the review reflects current approvals
      const kvDrafts = {};
      try {
        const names = ((await kv.smembers('drafts:list')) || []).map(normalizeName).filter(Boolean);
        for (const name of names) {
          const d = await kv.get(`draft:${name}`);
          const obj = typeof d === 'string' ? JSON.parse(d) : d;
          if (obj) kvDrafts[name] = obj._meta || {};
        }
      } catch {}

      plan._review = reviewPlan(plan, kvDrafts);
      return res.json(plan);
    }

    // POST /api/plan/comment?item=NAME — add comment to a plan item
    if (req.method === 'POST') {
      const { item } = req.query;
      const { comment, from } = req.body || {};

      if (!item || !comment) {
        return res.status(400).json({ error: 'Missing item or comment' });
      }

      const key = `plan:comments:${item}`;
      const existing = await kv.get(key);
      const data = existing ? (typeof existing === 'string' ? JSON.parse(existing) : existing) : { comments: [] };

      data.comments = data.comments || [];
      data.comments.push({
        text: comment,
        from: from || 'anonymous',
        at: new Date().toISOString()
      });

      await kv.set(key, JSON.stringify(data));
      return res.json({ success: true, comment: data.comments[data.comments.length - 1] });
    }

    return res.status(405).json({ error: 'Method not allowed' });

  } catch (err) {
    console.error('Plan API error:', err);
    return res.status(500).json({ error: err.message });
  }
}
