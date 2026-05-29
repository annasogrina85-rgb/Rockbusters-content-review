/**
 * pCloud helpers for serverless (HTTP-only — no local files, no rclone).
 *
 * Jany keeps the photo library in a public pCloud link, organised in
 * location/date folders (e.g. "Mallorca", "Dolomity", "Cuenca/Beta Babes 2026").
 * We resolve a camp/location to its folder, list candidate photos, fetch small
 * thumbnails for a Claude-vision pick, then download the full-res winner.
 */

const PCLOUD_CODE = process.env.PCLOUD_CODE || 'kZe3ow7ZRNou6K5SCb4vpyjthO1rmkl4WL2X';
const API = 'https://api.pcloud.com';

// Known location → pCloud folderId (fast path; fuzzy search covers the rest)
const KNOWN_FOLDERS = {
  mallorca: '2292119458',
  dolomity: '21088910077',
  dolomites: '21088910077',
};

const IMAGE_EXT = /\.(jpe?g|png|heic|webp)$/i;

function slug(s) {
  return String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
}

async function getJson(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`pCloud HTTP ${r.status}`);
  const d = await r.json();
  if (d.result !== 0) throw new Error(`pCloud error ${d.result}`);
  return d;
}

// Walk the whole public link once, collect every folder as {name, slug, folderid, parentSlug}
let _folderCache = null;
async function allFolders() {
  if (_folderCache) return _folderCache;
  const d = await getJson(`${API}/showpublink?code=${PCLOUD_CODE}`);
  const out = [];
  const walk = (items, parentSlug) => {
    for (const it of (items || [])) {
      if (it.isfolder) {
        const s = slug(it.name);
        out.push({ name: it.name, slug: s, folderid: String(it.folderid), parentSlug });
        walk(it.contents || [], s);
      }
    }
  };
  walk(d.metadata.contents || [], slug(d.metadata.name));
  _folderCache = out;
  return out;
}

/**
 * Resolve a location/folder key (e.g. "mallorca", "rodellar_2025", "dolomity")
 * to a pCloud folderId. Prefers a curated WEB/Selection subfolder when present.
 * Returns { folderId, label } or null if nothing matches confidently.
 */
export async function resolveCampFolderId(key) {
  const k = slug(key);
  if (KNOWN_FOLDERS[k]) return { folderId: KNOWN_FOLDERS[k], label: key };

  const folders = await allFolders();

  // tokens from the key (drop pure-year and generic tokens for matching)
  const tokens = k.split('_').filter(t => t && !/^\d{4}$/.test(t) && !['photos', 'jany', 'web', 'selection'].includes(t));

  // score each folder by how many key tokens appear in its slug
  let best = null, bestScore = 0;
  for (const f of folders) {
    if (['web', 'selection', 'resized', 'accommodation'].includes(f.slug)) continue; // skip helper subfolders as primary match
    let score = 0;
    for (const t of tokens) if (f.slug.includes(t)) score += t.length; // longer token match = stronger
    if (score > bestScore) { bestScore = score; best = f; }
  }
  if (!best || bestScore === 0) return null;

  // Prefer a curated child (WEB / Selection / web) inside the matched folder
  const child = folders.find(f => f.parentSlug === best.slug && ['web', 'selection'].includes(f.slug));
  const chosen = child || best;
  return { folderId: chosen.folderId, label: best.name };
}

// Recursively list image files in a folder: [{ name, fileId, size }]
export async function listFolderImages(folderId) {
  const d = await getJson(`${API}/showpublink?code=${PCLOUD_CODE}&folderid=${folderId}`);
  const files = [];
  const walk = (items) => {
    for (const it of (items || [])) {
      if (it.isfolder) walk(it.contents || []);
      else if (IMAGE_EXT.test(it.name)) files.push({ name: it.name, fileId: String(it.fileid), size: it.size || 0 });
    }
  };
  walk(d.metadata.contents || []);
  return files;
}

// Small thumbnail as base64 (for the vision pass). Returns { data, mediaType } or null.
export async function thumbBase64(fileId, size = '400x400') {
  const r = await fetch(`${API}/getpubthumb?code=${PCLOUD_CODE}&fileid=${fileId}&size=${size}`);
  if (!r.ok) return null;
  const buf = Buffer.from(await r.arrayBuffer());
  if (buf.length < 500) return null; // guard against error payloads
  return { data: buf.toString('base64'), mediaType: 'image/jpeg' };
}

// Full-resolution download URL for a file
export async function fullResUrl(fileId) {
  const d = await getJson(`${API}/getpublinkdownload?code=${PCLOUD_CODE}&fileid=${fileId}`);
  return `https://${d.hosts[0]}${d.path}`;
}

// Download full-res bytes for a file
export async function downloadFile(fileId) {
  const url = await fullResUrl(fileId);
  const r = await fetch(url);
  if (!r.ok) throw new Error(`pCloud download HTTP ${r.status}`);
  return Buffer.from(await r.arrayBuffer());
}

/**
 * Pick the best photo from a list of candidates using Claude vision.
 * candidates: [{ name, fileId, size }]  (already filtered/sorted by caller)
 * Returns the chosen candidate, or the first one if vision fails.
 */
export async function pickBestPhotoWithVision(client, candidates, { brief = '', prefer = 'a sharp shot with people climbing or a real action/candid moment' } = {}) {
  const sample = candidates.slice(0, 8); // cap for request size
  const images = [];
  for (let i = 0; i < sample.length; i++) {
    const t = await thumbBase64(sample[i].fileId);
    if (t) images.push({ idx: i, t });
  }
  if (!images.length) return candidates[0];

  const content = [];
  content.push({
    type: 'text',
    text: `Pick the single best photo for this Instagram post.\n\nPost context: ${brief || '(climbing camp post)'}\nPrefer: ${prefer}. Avoid blurry, badly framed, empty-landscape, or near-duplicate shots.\n\nI will show ${images.length} photos numbered starting at 0. Reply with ONLY a JSON object: {"choice": <number>, "why": "<3-6 words>"}.`,
  });
  for (const im of images) {
    content.push({ type: 'text', text: `Photo ${im.idx}:` });
    content.push({ type: 'image', source: { type: 'base64', media_type: im.t.mediaType, data: im.t.data } });
  }

  try {
    const resp = await client.messages.create({
      model: 'claude-opus-4-7',
      max_tokens: 200,
      messages: [{ role: 'user', content }],
    });
    const tb = resp.content.find(b => b.type === 'text');
    const m = tb?.text.match(/\{[\s\S]*\}/);
    const parsed = m ? JSON.parse(m[0]) : null;
    const choice = parsed && Number.isInteger(parsed.choice) ? parsed.choice : 0;
    return sample[choice] || sample[0];
  } catch {
    return sample[0];
  }
}
