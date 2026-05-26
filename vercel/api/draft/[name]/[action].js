import { kv } from '@vercel/kv';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { name, action } = req.query;
  const body = req.body || {};
  const now = new Date().toISOString();

  const raw = await kv.get(`draft:${name}`);
  if (!raw) return res.status(404).json({ error: 'Draft not found' });
  const draft = typeof raw === 'string' ? JSON.parse(raw) : raw;

  if (action === 'approve') {
    draft._meta.status = 'approved';
    draft._meta.approved_at = now;
    await kv.set(`draft:${name}`, draft);
    return res.json({ status: 'approved' });
  }

  if (action === 'reject') {
    draft._meta.status = 'rejected';
    draft._meta.rejected_at = now;
    await kv.set(`draft:${name}`, draft);
    return res.json({ status: 'rejected' });
  }

  if (action === 'comment') {
    const comment = body.comment?.trim();
    if (!comment) return res.status(400).json({ error: 'comment required' });

    draft._meta.status = 'needs_revision';
    draft._meta.comments = draft._meta.comments || [];
    draft._meta.comments.push({ text: comment, at: now });
    await kv.set(`draft:${name}`, draft);
    return res.json({ status: 'commented' });
  }

  res.status(400).json({ error: 'Unknown action' });
}
