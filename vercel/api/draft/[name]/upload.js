import { kv } from '@vercel/kv';

export const config = { api: { bodyParser: { sizeLimit: '4mb' } } };

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { name } = req.query;
  const { slideIndex, photoBase64, contentType, comment } = req.body || {};

  if (!photoBase64) return res.status(400).json({ error: 'photoBase64 required' });

  // Load draft from KV
  const raw = await kv.get(`draft:${name}`);
  if (!raw) return res.status(404).json({ error: 'Draft not found' });
  const draft = typeof raw === 'string' ? JSON.parse(raw) : raw;

  // Store upload in _meta
  draft._meta.uploads = draft._meta.uploads || [];
  draft._meta.uploads.push({
    slideIndex: slideIndex ?? null,
    photoBase64,
    contentType: contentType || 'image/jpeg',
    comment: comment || '',
    at: new Date().toISOString()
  });

  // Also add a comment for visibility
  draft._meta.comments = draft._meta.comments || [];
  const slideNote = slideIndex != null ? ` (slide ${slideIndex + 1})` : '';
  draft._meta.comments.push({
    text: `📎 Photo attached${slideNote}${comment ? ': ' + comment : ''}`,
    at: new Date().toISOString()
  });

  draft._meta.status = 'needs_revision';

  await kv.set(`draft:${name}`, draft);
  res.json({ status: 'uploaded', uploads: draft._meta.uploads.length });
}
