import { kv } from '@vercel/kv';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    // GET /api/plan — return content plan from KV
    if (req.method === 'GET') {
      const plan = await kv.get('content-plan');
      if (!plan) return res.json({ upcoming_camps: [], posts: [], highlights: [], info_needed: [] });
      return res.json(typeof plan === 'string' ? JSON.parse(plan) : plan);
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
