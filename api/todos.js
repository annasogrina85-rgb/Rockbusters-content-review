import { kv } from '@vercel/kv';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');

  try {
    const raw = await kv.get('todos:structured');

    if (!raw) {
      return res.status(404).json({
        error: 'No todos yet',
        todos: [],
        postMap: {}
      });
    }

    const data = typeof raw === 'string' ? JSON.parse(raw) : raw;
    return res.json(data);
  } catch (err) {
    console.error('Todos API error:', err);
    return res.status(500).json({ error: err.message });
  }
}
