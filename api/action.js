import { kv } from '@vercel/kv';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');

  // Parse path: /api/action?draft=name&action=approve
  const { draft: name, action } = req.query;

  if (!name || !action) {
    return res.status(400).json({ error: 'Missing draft name or action' });
  }

  try {
    const draft = await kv.get(`draft:${name}`);
    if (!draft) {
      return res.status(404).json({ error: `Draft ${name} not found` });
    }

    const data = typeof draft === 'string' ? JSON.parse(draft) : draft;
    const meta = data._meta || {};

    if (action === 'approve') {
      meta.status = 'approved';
      meta.approved_at = new Date().toISOString();
      meta.updated_at = new Date().toISOString();

      // Approving resolves any open comments — archive them so they don't linger.
      if (meta.comments && meta.comments.length) {
        meta.comments_history = [
          ...(meta.comments_history || []),
          ...meta.comments.map(c => ({ ...c, resolved_by: 'approve', resolved_at: new Date().toISOString() })),
        ];
        meta.comments = [];
      }

      // Capture human text edits made before approving
      const { edited_caption } = req.body || {};
      if (edited_caption && edited_caption.trim() !== (data.caption || '').trim()) {
        meta.human_edits = meta.human_edits || [];
        meta.human_edits.push({
          field: 'caption',
          original: data.caption || '',
          edited: edited_caption.trim(),
          at: new Date().toISOString()
        });
        data.caption = edited_caption.trim(); // apply the edit to the stored draft
      }

      data._meta = meta;
      await kv.set(`draft:${name}`, JSON.stringify(data));
      return res.json({ success: true, status: 'approved', human_edits: meta.human_edits?.length || 0 });
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

      meta.comments = meta.comments || [];
      meta.comments.push({
        text: comment,
        at: new Date().toISOString()
      });

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
