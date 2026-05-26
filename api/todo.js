import { kv } from '@vercel/kv';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  const raw = await kv.get('todo:latest');
  if (!raw) return res.status(404).json({ error: 'No todo yet' });

  const todo = typeof raw === 'string' ? JSON.parse(raw) : raw;

  // Return as HTML if browser, JSON if API call
  const accept = req.headers.accept || '';
  if (accept.includes('text/html')) {
    const html = `<!DOCTYPE html><html><head>
      <meta charset="UTF-8"><title>Rockbusters · Todo</title>
      <style>
        body { font-family: -apple-system, sans-serif; max-width: 680px; margin: 48px auto; padding: 0 24px;
               background: #0d0d0d; color: #e0e0e0; line-height: 1.7; }
        h1 { font-size: 20px; color: #fff; }
        h2 { font-size: 14px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase;
             color: #ff6b00; margin-top: 32px; }
        p, li { font-size: 14px; color: #bbb; }
        strong { color: #f0f0f0; }
        em { color: #888; font-style: normal; }
        code { background: #1a1a1a; padding: 2px 6px; border-radius: 4px; font-size: 12px; color: #aaa; }
        a { color: #6699ff; }
        ul { padding-left: 20px; }
        .meta { font-size: 12px; color: #444; margin-top: 32px; }
      </style>
    </head><body>
      <div id="content"></div>
      <div class="meta">Generated: ${todo.generated_at}</div>
      <script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>
      <script>
        document.getElementById('content').innerHTML = marked.parse(${JSON.stringify(todo.content)});
      </script>
    </body></html>`;
    res.setHeader('Content-Type', 'text/html');
    return res.send(html);
  }

  res.json(todo);
}
