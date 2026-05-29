/**
 * Google Drive (read-only use) for serverless — REST API, no SDK, no rclone.
 *
 * Reuses the OAuth refresh token that rclone already has (rclone's built-in
 * Drive client), so there's no Google Cloud / service-account setup. We only
 * read camp folders under "Rockbusters Marketing/05_UGC_Community/Camps/".
 *
 * Images are read via Drive's own `thumbnailLink` — a Google-hosted JPEG that
 * works for any source format (incl. HEIC) and can be resized via `=s<px>`,
 * so we never decode HEIC or resize ourselves.
 */

const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const API = 'https://www.googleapis.com/drive/v3';

let _accessToken = null;
let _tokenExp = 0;

export async function getAccessToken() {
  if (_accessToken && Date.now() < _tokenExp - 60000) return _accessToken;
  const body = new URLSearchParams({
    client_id: process.env.GOOGLE_OAUTH_CLIENT_ID,
    client_secret: process.env.GOOGLE_OAUTH_CLIENT_SECRET,
    refresh_token: process.env.GOOGLE_OAUTH_REFRESH_TOKEN,
    grant_type: 'refresh_token',
  });
  const r = await fetch(TOKEN_URL, { method: 'POST', body });
  const d = await r.json();
  if (!d.access_token) throw new Error('Drive token refresh failed: ' + JSON.stringify(d));
  _accessToken = d.access_token;
  _tokenExp = Date.now() + (d.expires_in || 3600) * 1000;
  return _accessToken;
}

async function driveGet(pathAndQuery) {
  const token = await getAccessToken();
  const r = await fetch(`${API}${pathAndQuery}`, { headers: { Authorization: `Bearer ${token}` } });
  if (!r.ok) throw new Error(`Drive API ${r.status}: ${(await r.text()).slice(0, 200)}`);
  return r.json();
}

// Find a child folder by name under parentId (or root if null). Returns id or null.
async function childFolder(name, parentId) {
  const parentClause = parentId ? `'${parentId}' in parents` : `'root' in parents`;
  const q = encodeURIComponent(
    `mimeType='application/vnd.google-apps.folder' and trashed=false and name='${name.replace(/'/g, "\\'")}' and ${parentClause}`
  );
  const d = await driveGet(`/files?q=${q}&fields=files(id,name)&pageSize=5`);
  return d.files?.[0]?.id || null;
}

// Resolve a path like ["Rockbusters Marketing","05_UGC_Community","Camps"] to a folder id.
export async function resolveFolderPath(segments) {
  let parent = null;
  for (const seg of segments) {
    const id = await childFolder(seg, parent);
    if (!id) return null;
    parent = id;
  }
  return parent;
}

// List immediate children (files + folders) of a folder.
export async function listChildren(folderId) {
  const out = [];
  let pageToken = '';
  do {
    const q = encodeURIComponent(`'${folderId}' in parents and trashed=false`);
    const pt = pageToken ? `&pageToken=${pageToken}` : '';
    const d = await driveGet(`/files?q=${q}&fields=nextPageToken,files(id,name,mimeType,size,thumbnailLink)&pageSize=200${pt}`);
    out.push(...(d.files || []));
    pageToken = d.nextPageToken || '';
  } while (pageToken);
  return out;
}

// Download a small text file (e.g. quotes.md) as a string.
export async function downloadText(fileId) {
  const token = await getAccessToken();
  const r = await fetch(`${API}/files/${fileId}?alt=media`, { headers: { Authorization: `Bearer ${token}` } });
  if (!r.ok) return '';
  return r.text();
}

// Fetch a JPEG render of an image at the requested max size (px) as a Buffer.
// Uses thumbnailLink, swapping its size suffix (=s220) for the size we want.
export async function imageJpeg(file, sizePx = 1280) {
  if (!file.thumbnailLink) throw new Error(`no thumbnail for ${file.name}`);
  const url = file.thumbnailLink.replace(/=s\d+(-[a-z]+)?$/i, `=s${sizePx}`);
  const token = await getAccessToken();
  let r = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!r.ok) r = await fetch(url); // some thumbnail links are public/time-limited
  if (!r.ok) throw new Error(`thumb fetch ${r.status} for ${file.name}`);
  return Buffer.from(await r.arrayBuffer());
}

const IMAGE_MIME = /^image\//;
export function isImage(file) {
  return IMAGE_MIME.test(file.mimeType || '') || /\.(jpe?g|png|heic|webp)$/i.test(file.name || '');
}
