import { kv } from '@vercel/kv';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');

  const { name, action } = req.query;

  if (!name || !action) {
    return res.status(400).json({ error: 'Missing name or action' });
  }

  try {
    const draft = await kv.get(`draft:${name}`);
    if (!draft) {
      return res.status(404).json({ error: `Draft ${name} not found` });
    }

    const data = typeof draft === 'string' ? JSON.parse(draft) : draft;
    const meta = data._meta || {};

    // Handle different actions
    if (action === 'approve') {
      meta.status = 'approved';
      meta.updated_at = new Date().toISOString();
      data._meta = meta;
      await kv.set(`draft:${name}`, JSON.stringify(data));
      return res.json({ success: true, status: 'approved' });
    }

    if (action === 'reject') {
      meta.status = 'rejected';
      meta.updated_at = new Date().toISOString();
      data._meta = meta;
      await kv.set(`draft:${name}`, JSON.stringify(data));
      return res.json({ success: true, status: 'rejected' });
    }

    if (action === 'comment') {
      const { comment } = req.body || {};
      if (!comment) {
        return res.status(400).json({ error: 'Missing comment text' });
      }

      // Add comment to the draft
      meta.comments = meta.comments || [];
      meta.comments.push({
        text: comment,
        at: new Date().toISOString()
      });

      // Change status to needs_revision if commenting
      meta.status = 'needs_revision';
      meta.updated_at = new Date().toISOString();

      data._meta = meta;
      await kv.set(`draft:${name}`, JSON.stringify(data));

      return res.json({
        success: true,
        status: 'needs_revision',
        comment: meta.comments[meta.comments.length - 1]
      });
    }

    return res.status(400).json({ error: `Unknown action: ${action}` });

  } catch (err) {
    console.error(`Draft action error for ${name}/${action}:`, err);
    return res.status(500).json({ error: err.message });
  }
}
