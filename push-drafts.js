#!/usr/bin/env node
/**
 * Push local drafts to Vercel for Jany to review
 *
 * Photos: if BLOB_READ_WRITE_TOKEN is set → upload to Vercel Blob (permanent URLs).
 *         Otherwise → resolve pCloud CDN URLs (expire after a few hours).
 * Draft state is stored in Vercel KV.
 *
 * Usage:
 *   node push-drafts.js                          — push all drafts
 *   node push-drafts.js --draft a_muerte_camp    — push one draft
 *   node push-drafts.js --pull                   — pull decisions back
 */

require('dotenv').config({ override: true });
const fs   = require('fs');
const path = require('path');
const https = require('https');

// Vercel Blob — available when BLOB_READ_WRITE_TOKEN is set
let blobPut = null;
try { blobPut = require('@vercel/blob').put; } catch {}
const useBlob = () => !!(blobPut && process.env.BLOB_READ_WRITE_TOKEN);

// Blob upload — deterministic path so URL is stable across re-pushes
async function uploadPhotoToBlob(localPathOrBuffer, draftName, key, ext = null) {
  const resolvedExt = ext || (typeof localPathOrBuffer === 'string' ? path.extname(localPathOrBuffer).toLowerCase() : '') || '.jpg';
  const blobPath = `drafts/${draftName}/${key}${resolvedExt}`;
  process.stdout.write(`     ☁️  Blob upload ${key}... `);
  const content = Buffer.isBuffer(localPathOrBuffer) ? localPathOrBuffer : fs.readFileSync(localPathOrBuffer);
  const { url } = await blobPut(blobPath, content, {
    access: 'public',
    addRandomSuffix: false,
    allowOverwrite: true,
    token: process.env.BLOB_READ_WRITE_TOKEN,
  });
  process.stdout.write(`done\n`);
  return url;
}

// Download a file from a URL and return as Buffer
async function downloadBuffer(url) {
  const https = require('https');
  const http  = require('http');
  return new Promise((resolve, reject) => {
    const mod = url.startsWith('https') ? https : http;
    mod.get(url, res => {
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks)));
    }).on('error', reject);
  });
}

const DRAFTS_DIR    = path.join(__dirname, 'drafts');
const FEEDBACK_FILE = path.join(__dirname, 'feedback.json');
const PCLOUD_CODE   = 'kZe3ow7ZRNou6K5SCb4vpyjthO1rmkl4WL2X';

// ─── Env check ────────────────────────────────────────────────────────────────

function checkEnv() {
  const missing = ['KV_REST_API_URL', 'KV_REST_API_TOKEN'].filter(k => !process.env[k]);
  if (missing.length) {
    console.error(`\n❌ Missing env vars: ${missing.join(', ')}`);
    console.error(`   Run: cd vercel && npx vercel env pull ../.env.vercel && cd ..`);
    console.error(`   Then copy KV_REST_API_URL and KV_REST_API_TOKEN into .env\n`);
    process.exit(1);
  }
}

// ─── pCloud helpers ───────────────────────────────────────────────────────────

function httpsGet(url) {
  return new Promise((resolve, reject) => {
    https.get(url, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => { try { resolve(JSON.parse(data)); } catch(e) { reject(e); } });
    }).on('error', reject);
  });
}

function slugify(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
}

// Walk pCloud folder tree, collect WEB files as { folder, name, fileId }
function walkForWeb(node, insideWeb, folderLabel) {
  const results = [];
  const items = Array.isArray(node) ? node : (node.contents || []);
  for (const item of items) {
    if (item.isfolder) {
      const nowWeb = item.name === 'WEB';
      results.push(...walkForWeb(item.contents || [], nowWeb, nowWeb ? folderLabel : slugify(item.name)));
    } else if (insideWeb) {
      results.push({ folder: folderLabel, name: item.name, fileId: String(item.fileid) });
    }
  }
  return results;
}

// Fetch the full pCloud index once, return a map: "folder/filename" → fileId
let pcloudIndex = null;
async function getPCloudIndex() {
  if (pcloudIndex) return pcloudIndex;
  process.stdout.write('  📡 Fetching pCloud index... ');
  const data = await httpsGet(`https://api.pcloud.com/showpublink?code=${PCLOUD_CODE}`);
  if (data.result !== 0) throw new Error(`pCloud error ${data.result}`);
  const root = data.metadata;
  const files = walkForWeb(root.contents || [], false, slugify(root.name));
  pcloudIndex = {};
  for (const f of files) pcloudIndex[`${f.folder}/${f.name}`] = f.fileId;
  console.log(`${files.length} files indexed`);
  return pcloudIndex;
}

// Direct folder index for photos NOT in WEB subfolders (e.g. dolomity)
// localKey: the sanitized filename we saved locally (spaces→_, parens stripped)
// pCloudOriginal: the original filename in pCloud
const DIRECT_FOLDER_MAP = {
  // "local_folder_name": { pcloudFolderId, label }
  'dolomity': { folderId: '21088910077', label: 'Dolomity' },
  'mallorca':  { folderId: '2292119458',  label: 'Mallorca'  }
};

// ─── Photo selection algorithm ────────────────────────────────────────────────
//
// RULES (defined by Anna, 2026-05-27):
//   1. Find the pCloud subfolder matching the post's location (e.g. "Mallorca")
//   2. Collect all photo files with sizes from that folder (recursively)
//   3. Filter out photos already used in any other draft (KV-based exclusion)
//   4. Sort by file size descending — larger file = higher resolution / better quality
//   5. Take the top 40% of files by size (the "quality pool")
//   6. Select randomly from that pool
//   7. Prefer photos with people — visual check done by agent or human;
//      the algorithm picks from the quality pool randomly, leaning toward
//      action shots (future: use Claude vision on pCloud thumb URL to verify)
//
// Usage: node push-drafts.js --reselect-cover <draft-name>

// Collect all files recursively from pCloud folder with sizes
async function getPCloudFolderFiles(pcloudFolderId) {
  const data = await httpsGet(
    `https://api.pcloud.com/showpublink?code=${PCLOUD_CODE}&folderid=${pcloudFolderId}`
  );
  if (data.result !== 0) throw new Error(`pCloud error ${data.result}`);
  const files = [];
  function walk(items) {
    for (const item of (items || [])) {
      if (item.isfolder) walk(item.contents || []);
      else files.push({ name: item.name, fileId: String(item.fileid), size: item.size || 0 });
    }
  }
  walk(data.metadata.contents || []);
  return files;
}

// Get all photo filenames/fileIds currently used across all KV drafts
async function getUsedPhotoFileIds() {
  const res = await fetch(`${kvUrl()}/smembers/${encodeURIComponent('drafts:list')}`, {
    headers: { Authorization: `Bearer ${kvToken()}` }
  });
  const { result: rawNames } = await res.json();
  const names = (rawNames || []).map(n => { try { return JSON.parse(n); } catch { return n; } }).flat();

  const usedFileIds = new Set();
  for (const name of names) {
    const raw = await kvGet(`draft:${name}`);
    if (!raw) continue;
    try {
      const inner = typeof raw === 'string' ? JSON.parse(raw) : raw;
      const draft = typeof inner === 'string' ? JSON.parse(inner) : inner;
      const paths = draft?._meta?._pcloud_paths || {};
      // Extract fileIds from existing Blob URLs isn't possible, so track by pcloud_paths
      Object.values(paths).forEach(p => usedFileIds.add(p));
    } catch {}
  }
  return usedFileIds;
}

// Select the best photo from a pCloud folder for a given draft
// folderKey: key in DIRECT_FOLDER_MAP (e.g. 'mallorca')
// excludeDraftName: name of draft we're selecting for (don't exclude its own photos)
async function selectBestPhoto(folderKey, excludeDraftName = null) {
  const spec = DIRECT_FOLDER_MAP[folderKey];
  if (!spec) throw new Error(`Unknown pCloud folder key: ${folderKey}. Add it to DIRECT_FOLDER_MAP.`);

  console.log(`\n  🔍 Selecting best photo from pCloud/${spec.label}...`);

  // Step 1: Get all files in the folder
  const allFiles = await getPCloudFolderFiles(spec.folderId);
  console.log(`     ${allFiles.length} files in folder`);

  // Step 2: Get all photos already used in other drafts
  const usedPaths = await getUsedPhotoFileIds();
  console.log(`     ${usedPaths.size} photos already in use across drafts`);

  // Step 3: Filter out used photos
  const available = allFiles.filter(f => !usedPaths.has(`photos/jany/${folderKey}/${f.name}`));
  console.log(`     ${available.length} unused photos available`);

  if (!available.length) {
    console.log(`     ⚠️  All photos are already used — picking from full set`);
    available.push(...allFiles);
  }

  // Step 4: Sort by size descending (larger = better resolution)
  available.sort((a, b) => b.size - a.size);

  // Step 5: Take top 40% quality pool
  const poolSize = Math.max(1, Math.ceil(available.length * 0.4));
  const pool = available.slice(0, poolSize);
  console.log(`     Quality pool: top ${poolSize} files by size (≥${pool[pool.length-1].size.toLocaleString()} bytes)`);

  // Step 6: Pick randomly from pool
  const picked = pool[Math.floor(Math.random() * pool.length)];
  console.log(`     Selected: ${picked.name} (${(picked.size / 1024).toFixed(0)}KB)`);

  return picked;
}
let directFolderIndices = {};

async function getDirectFolderIndex(localFolder) {
  if (directFolderIndices[localFolder]) return directFolderIndices[localFolder];
  const spec = DIRECT_FOLDER_MAP[localFolder];
  if (!spec) return {};
  const data = await httpsGet(
    `https://api.pcloud.com/showpublink?code=${PCLOUD_CODE}&folderid=${spec.folderId}`
  );
  if (data.result !== 0) return {};
  const idx = {};
  const rootMeta = data.metadata;
  const items = rootMeta.contents || [];

  function indexFile(f) {
    const fid = String(f.fileid);
    idx[f.name] = fid;
    // Also index with spaces replaced by underscores so local filenames match
    idx[f.name.replace(/ /g, '_')] = fid;
  }

  for (const item of items) {
    if (item.isfolder) {
      // Walk into the target subfolder when the parent folder is returned
      for (const f of (item.contents || [])) {
        if (!f.isfolder) indexFile(f);
      }
    } else {
      indexFile(item);
    }
  }
  directFolderIndices[localFolder] = idx;
  return idx;
}

// Reverse-map our sanitized local filename back to the original pCloud filename
// Local: "Dolomiti-family-climbing-holidays_96_of_198.jpg"
// pCloud: "Dolomiti-family-climbing-holidays (96 of 198).jpg"
function localNameToPCloud(localName) {
  // Try to reverse our sanitization: _NN_of_NNN → " (NN of NNN)"
  return localName.replace(/_(\d+)_of_(\d+)\.jpg$/i, ' ($1 of $2).jpg');
}

// Get a fresh CDN download URL for a fileId (valid for several hours)
async function getPCloudUrl(fileId) {
  const data = await httpsGet(
    `https://api.pcloud.com/getpublinkdownload?code=${PCLOUD_CODE}&fileid=${fileId}`
  );
  if (data.result !== 0) throw new Error(`pCloud download error ${data.result}`);
  return `https://${data.hosts[0]}${data.path}`;
}

// Resolve a local photo path → pCloud CDN URL
// e.g. "photos/jany/2026_may_klemen/DSC01777.JPG" → "https://cdn.pcloud.com/..."
async function resolvePhotoUrl(photoPath) {
  if (!photoPath || photoPath.startsWith('http')) return photoPath;

  // Only pCloud-synced photos (under photos/jany/) can be resolved
  const match = photoPath.match(/^photos\/jany\/(.+)$/);
  if (!match) return null; // local-only photo — no remote URL available

  const relPath = match[1]; // e.g. "2026_may_klemen/DSC01777.JPG"
  const [localFolder, localFilename] = relPath.split('/');

  // 1. Try the WEB subfolder index first
  const index  = await getPCloudIndex();
  let fileId   = index[relPath];

  // 2. Fall back to direct folder index for known non-WEB folders (e.g. dolomity)
  if (!fileId && DIRECT_FOLDER_MAP[localFolder]) {
    const directIdx = await getDirectFolderIndex(localFolder);
    // Try both the local sanitized name and the reversed pCloud name
    const pcloudName = localNameToPCloud(localFilename);
    fileId = directIdx[pcloudName] || directIdx[localFilename];
  }

  if (!fileId) {
    console.log(`     ⚠️  Not found in pCloud: ${relPath}`);
    return null;
  }

  return getPCloudUrl(fileId);
}

// ─── KV helpers ───────────────────────────────────────────────────────────────

const kvUrl   = () => process.env.KV_REST_API_URL;
const kvToken = () => process.env.KV_REST_API_TOKEN;

async function kvSet(key, value) {
  const res = await fetch(`${kvUrl()}/set/${encodeURIComponent(key)}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${kvToken()}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(value)
  });
  if (!res.ok) throw new Error(`KV set failed (${res.status}): ${await res.text()}`);
}

async function kvGet(key) {
  const res = await fetch(`${kvUrl()}/get/${encodeURIComponent(key)}`, {
    headers: { Authorization: `Bearer ${kvToken()}` }
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data.result ?? null;
}

async function kvSAdd(key, ...members) {
  // Use URL path args — sending a JSON body stores the entire JSON string as one member
  const memberPath = members.map(m => encodeURIComponent(String(m))).join('/');
  const res = await fetch(`${kvUrl()}/sadd/${encodeURIComponent(key)}/${memberPath}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${kvToken()}` }
  });
  if (!res.ok) throw new Error(`KV sadd failed (${res.status}): ${await res.text()}`);
}

async function kvSMembers(key) {
  const res = await fetch(`${kvUrl()}/smembers/${encodeURIComponent(key)}`, {
    headers: { Authorization: `Bearer ${kvToken()}` }
  });
  if (!res.ok) return [];
  const data = await res.json();
  return data.result || [];
}

// ─── Photo URL resolution ─────────────────────────────────────────────────────

function collectPhotoPaths(draft) {
  const paths = new Set();
  if (draft.photo) paths.add(draft.photo);
  if (draft.slides) draft.slides.forEach(s => s.photo && paths.add(s.photo));
  return [...paths];
}

async function resolveAllPhotos(draft) {
  const draftName = draft.name || 'unknown';
  const d = JSON.parse(JSON.stringify(draft));

  if (useBlob()) {
    // ── Vercel Blob path (permanent URLs) ──────────────────────────────────────
    async function resolveToBlob(photoPath, draftName, key) {
      if (!photoPath || photoPath.startsWith('http')) return photoPath;
      if (!photoPath.startsWith('photos/')) return photoPath;
      const localPath = path.join(__dirname, photoPath);
      const ext = path.extname(photoPath).toLowerCase() || '.jpg';
      if (fs.existsSync(localPath)) {
        return uploadPhotoToBlob(localPath, draftName, key, ext);
      }
      // File not local — resolve from pCloud CDN, download, then upload to Blob
      const cdnUrl = await resolvePhotoUrl(photoPath);
      if (!cdnUrl) { console.log(`     ⚠️  Could not resolve ${photoPath}`); return null; }
      process.stdout.write(`     ☁️  Blob upload ${key} (from pCloud)... `);
      const buf = await downloadBuffer(cdnUrl);
      const { url } = await blobPut(`drafts/${draftName}/${key}${ext}`, buf, {
        access: 'public', addRandomSuffix: false, allowOverwrite: true,
        token: process.env.BLOB_READ_WRITE_TOKEN,
      });
      process.stdout.write(`done\n`);
      return url;
    }

    if (d.photo && d.photo.startsWith('photos/')) {
      d.photo = await resolveToBlob(d.photo, draftName, 'cover');
    }
    if (d.slides) {
      for (let i = 0; i < d.slides.length; i++) {
        const p = d.slides[i].photo;
        if (p && p.startsWith('photos/')) {
          d.slides[i].photo = await resolveToBlob(p, draftName, `slide${i}`);
        }
      }
    }
  } else {
    // ── pCloud CDN fallback (URLs expire after a few hours) ────────────────────
    const paths  = collectPhotoPaths(draft);
    const urlMap = {};
    for (const p of paths) {
      const url = await resolvePhotoUrl(p);
      if (url) urlMap[p] = url;
    }
    if (d.photo && urlMap[d.photo])      d.photo = urlMap[d.photo];
    if (d.slides) d.slides.forEach(s => {
      if (s.photo && urlMap[s.photo]) s.photo = urlMap[s.photo];
    });
  }

  return d;
}

// ─── Push ─────────────────────────────────────────────────────────────────────

async function pushDraft(draftFile) {
  const draft = JSON.parse(fs.readFileSync(draftFile, 'utf8'));
  const name  = draft.name || path.basename(draftFile, '.json');

  // Collect original pCloud paths before resolution so CCR agent can refresh them later
  const pcloudPaths = {};
  if (draft.photo && draft.photo.startsWith('photos/jany/')) pcloudPaths.photo = draft.photo;
  if (draft.slides) {
    draft.slides.forEach((s, i) => {
      if (s.photo && s.photo.startsWith('photos/jany/')) pcloudPaths[`slides.${i}`] = s.photo;
    });
  }

  const photoMode = useBlob() ? '☁️  uploading to Blob' : '📡 resolving pCloud URLs';
  process.stdout.write(`\n  📤 ${name} — ${photoMode}...\n`);
  const resolved = await resolveAllPhotos(draft);

  // Embed original paths so CCR daily agent can re-resolve expired CDN URLs
  resolved._meta = resolved._meta || {};
  resolved._meta._pcloud_paths = pcloudPaths;

  // Preserve review state from existing KV draft — don't reset status/comments on photo refresh
  const existingRaw = await kvGet(`draft:${name}`);
  if (existingRaw) {
    try {
      const existing = typeof existingRaw === 'string' ? JSON.parse(existingRaw) : existingRaw;
      const inner = typeof existing === 'string' ? JSON.parse(existing) : existing;
      const existingMeta = inner?._meta || {};
      const preserve = ['status', 'comment', 'comments', 'approved_at', 'rejected_at', 'human_edits', 'uploads'];
      for (const key of preserve) {
        if (existingMeta[key] !== undefined) resolved._meta[key] = existingMeta[key];
      }
    } catch {}
  }

  await kvSet(`draft:${name}`, resolved);
  await kvSAdd('drafts:list', name);
  console.log(`     ✓ stored in KV`);
}

// ─── Pull ─────────────────────────────────────────────────────────────────────

async function pullDecisions() {
  console.log('\n📥 Pulling decisions from Vercel...\n');

  const names = await kvSMembers('drafts:list');
  if (!names.length) { console.log('  No drafts in KV yet.'); return; }

  const feedbackRaw = fs.existsSync(FEEDBACK_FILE) ? fs.readFileSync(FEEDBACK_FILE, 'utf8') : '{}';
  const feedback = { approved: [], rejected: [], comments: [], ...JSON.parse(feedbackRaw) };

  const uploadsDir = path.join(__dirname, 'photos', 'uploads');
  if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

  let changed = 0;
  let uploadsSaved = 0;

  for (const name of names) {
    const remoteRaw = await kvGet(`draft:${name}`);
    if (!remoteRaw) continue;
    const remote = typeof remoteRaw === 'string' ? JSON.parse(remoteRaw) : remoteRaw;

    const localPath = path.join(DRAFTS_DIR, `${name}.json`);
    if (!fs.existsSync(localPath)) continue;

    const local        = JSON.parse(fs.readFileSync(localPath, 'utf8'));
    const remoteStatus = remote._meta?.status;
    const localStatus  = local._meta?.status;
    const remoteComments = remote._meta?.comments || [];
    const localComments  = local._meta?.comments  || [];
    const remoteUploads  = remote._meta?.uploads   || [];
    const localUploads   = local._meta?.uploads    || [];

    // Save any newly uploaded photos to disk
    if (remoteUploads.length > localUploads.length) {
      const newUploads = remoteUploads.slice(localUploads.length);
      for (const upload of newUploads) {
        const ts = upload.at ? upload.at.replace(/[:.]/g, '-').replace('Z', '') : Date.now();
        const slideTag = upload.slideIndex != null ? `_slide${upload.slideIndex + 1}` : '';
        const ext = (upload.contentType || 'image/jpeg').includes('png') ? 'png' : 'jpg';
        const filename = `${name}${slideTag}_${ts}.${ext}`;
        const filePath = path.join(uploadsDir, filename);
        fs.writeFileSync(filePath, Buffer.from(upload.photoBase64, 'base64'));

        // Store relative path back on upload record (strip base64 to save space locally)
        upload.localPath = `photos/uploads/${filename}`;
        delete upload.photoBase64;

        const slideNote = upload.slideIndex != null ? ` (slide ${upload.slideIndex + 1})` : '';
        console.log(`  📎 Saved upload: ${filename}${slideNote}${upload.comment ? ' — ' + upload.comment : ''}`);
        uploadsSaved++;
      }
      changed++;
    }

    const statusChanged   = remoteStatus !== localStatus;
    const commentsChanged = remoteComments.length !== localComments.length;
    if (!statusChanged && !commentsChanged && remoteUploads.length === localUploads.length) continue;

    // Merge status + comments back into local file (keep base64 stripped)
    local._meta.status   = remoteStatus;
    local._meta.comments = remoteComments;
    local._meta.uploads  = remoteUploads.map((u, i) => {
      // Use stripped version (localPath, no photoBase64) if we just saved it
      if (i >= localUploads.length) {
        const { photoBase64: _, ...rest } = u;
        return rest;
      }
      return u;
    });
    if (remote._meta?.approved_at) local._meta.approved_at = remote._meta.approved_at;
    if (remote._meta?.rejected_at) local._meta.rejected_at = remote._meta.rejected_at;
    fs.writeFileSync(localPath, JSON.stringify(local, null, 2));

    // Update feedback.json
    if (remoteStatus === 'approved') {
      if (!feedback.approved.includes(name)) feedback.approved.push(name);
      feedback.rejected = feedback.rejected.filter(n => n !== name);

      // Capture human text edits — these teach the agent preferred style
      const humanEdits = remote._meta?.human_edits || [];
      feedback.style_edits = feedback.style_edits || [];
      const existingKeys = new Set(feedback.style_edits.map(e => e.key));
      for (const edit of humanEdits) {
        const key = `${name}:${edit.field}:${edit.at}`;
        if (!existingKeys.has(key) && edit.original && edit.edited && edit.original !== edit.edited) {
          feedback.style_edits.push({ key, post: name, field: edit.field, original: edit.original, edited: edit.edited, at: edit.at });
          console.log(`  ✏️  Style edit captured for "${name}" — will teach agent`);
        }
      }
    }
    if (remoteStatus === 'rejected') {
      if (!feedback.rejected.includes(name)) feedback.rejected.push(name);
      feedback.approved = feedback.approved.filter(n => n !== name);
    }
    const existingTexts = new Set(feedback.comments.map(c => c.comment));
    for (const c of remoteComments) {
      if (!existingTexts.has(c.text)) {
        feedback.comments.push({ post: name, comment: c.text, timestamp: c.at });
      }
    }

    if (statusChanged || commentsChanged) {
      const label = statusChanged
        ? `${localStatus || 'pending'} → ${remoteStatus}`
        : `${remoteComments.length - localComments.length} new comment(s)`;
      console.log(`  ✓ ${name}: ${label}`);
      changed++;
    }
  }

  fs.writeFileSync(FEEDBACK_FILE, JSON.stringify(feedback, null, 2));

  // Sync feedback to KV so CCR cloud agents can access it
  await kvSet('agent:feedback', JSON.stringify(feedback));

  if (!changed && !uploadsSaved) {
    console.log('  No changes — nothing new from Jany yet.');
  } else {
    if (uploadsSaved) console.log(`\n  ${uploadsSaved} photo(s) saved to photos/uploads/`);
    if (changed)      console.log(`  ${changed} draft(s) updated. feedback.json synced.`);
    const recentComments = feedback.comments.slice(-5);
    if (recentComments.length) {
      console.log('\n  Recent comments:');
      recentComments.forEach(c => console.log(`  → "${c.comment}" (${c.post})`));
    }
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function kvDel(key) {
  const res = await fetch(`${kvUrl()}/del/${encodeURIComponent(key)}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${kvToken()}` }
  });
  if (!res.ok) throw new Error(`KV del failed (${res.status}): ${await res.text()}`);
}

async function kvSRem(key, member) {
  const res = await fetch(`${kvUrl()}/srem/${encodeURIComponent(key)}/${encodeURIComponent(member)}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${kvToken()}` }
  });
  if (!res.ok) throw new Error(`KV srem failed (${res.status}): ${await res.text()}`);
}

async function deleteDraft(name) {
  process.stdout.write(`\n  🗑  ${name} — deleting from KV... `);
  await kvDel(`draft:${name}`);
  await kvSRem('drafts:list', name);
  console.log('done');

  // Also remove local draft file if it exists
  const localFile = path.join(DRAFTS_DIR, `${name}.json`);
  if (fs.existsSync(localFile)) {
    fs.unlinkSync(localFile);
    console.log(`     ✓ local draft file removed`);
  }
}

async function main() {
  const args = process.argv.slice(2);

  if (args.includes('--pull')) {
    checkEnv();
    await pullDecisions();
    return;
  }

  if (args.includes('--reselect-cover')) {
    checkEnv();
    const idx = args.indexOf('--reselect-cover');
    const draftName = args[idx + 1];
    if (!draftName) {
      console.error('\n❌ Usage: node push-drafts.js --reselect-cover <draft-name> [--folder <folder-key>]\n');
      console.error('   folder-key options:', Object.keys(DIRECT_FOLDER_MAP).join(', '));
      process.exit(1);
    }
    // Determine folder from draft JSON or --folder flag
    const folderIdx = args.indexOf('--folder');
    let folderKey = folderIdx !== -1 ? args[folderIdx + 1] : null;
    if (!folderKey) {
      // Try to infer from draft file
      const draftFile = path.join(DRAFTS_DIR, `${draftName}.json`);
      if (fs.existsSync(draftFile)) {
        const draft = JSON.parse(fs.readFileSync(draftFile, 'utf8'));
        // Look at existing pcloud paths to infer folder
        const paths = Object.values(draft._meta?._pcloud_paths || {});
        const match = paths[0]?.match(/^photos\/jany\/([^/]+)\//);
        if (match) folderKey = match[1];
      }
    }
    if (!folderKey || !DIRECT_FOLDER_MAP[folderKey]) {
      console.error(`\n❌ Could not determine pCloud folder. Use --folder <key>\n`);
      console.error('   Available:', Object.keys(DIRECT_FOLDER_MAP).join(', '));
      process.exit(1);
    }

    const picked = await selectBestPhoto(folderKey, draftName);

    // Resolve picked photo: get CDN URL via fileId, upload to Blob, store URL
    let finalPhotoUrl;
    if (useBlob()) {
      console.log(`  ⬇️  Downloading from pCloud (fileId: ${picked.fileId})...`);
      const cdnUrl = await getPCloudUrl(picked.fileId);
      const ext = path.extname(picked.name).toLowerCase() || '.jpg';
      const buf = await downloadBuffer(cdnUrl);
      const blobPath = `drafts/${draftName}/cover${ext}`;
      process.stdout.write(`  ☁️  Uploading to Blob... `);
      const { url } = await blobPut(blobPath, buf, {
        access: 'public', addRandomSuffix: false, allowOverwrite: true,
        token: process.env.BLOB_READ_WRITE_TOKEN,
      });
      process.stdout.write(`done\n`);
      finalPhotoUrl = url;
    } else {
      // No Blob — store as pCloud local path (will be resolved to CDN on next push)
      finalPhotoUrl = `photos/jany/${folderKey}/${picked.name}`;
    }

    // Update the draft JSON file
    const draftFile = path.join(DRAFTS_DIR, `${draftName}.json`);
    if (!fs.existsSync(draftFile)) {
      console.error(`\n❌ Draft file not found: ${draftFile}\n`); process.exit(1);
    }
    const draft = JSON.parse(fs.readFileSync(draftFile, 'utf8'));
    draft.photo = finalPhotoUrl;
    if (!draft._meta) draft._meta = {};
    draft._meta._pcloud_paths = draft._meta._pcloud_paths || {};
    draft._meta._pcloud_paths.photo = `photos/jany/${folderKey}/${picked.name}`;
    fs.writeFileSync(draftFile, JSON.stringify(draft, null, 2));

    // Also update KV directly (preserve existing review state)
    console.log(`  💾 Updating KV...`);
    const existingRaw = await kvGet(`draft:${draftName}`);
    if (existingRaw) {
      try {
        const inner = typeof existingRaw === 'string' ? JSON.parse(existingRaw) : existingRaw;
        const existing = typeof inner === 'string' ? JSON.parse(inner) : inner;
        existing.photo = finalPhotoUrl;
        if (!existing._meta) existing._meta = {};
        existing._meta._pcloud_paths = existing._meta._pcloud_paths || {};
        existing._meta._pcloud_paths.photo = `photos/jany/${folderKey}/${picked.name}`;
        await kvSet(`draft:${draftName}`, existing);
      } catch (e) {
        console.log(`  ⚠️  Could not update KV: ${e.message}`);
      }
    }

    console.log(`\n  ✅ Cover photo updated: ${picked.name} (${(picked.size/1024).toFixed(0)}KB)`);
    console.log(`     Blob URL: ${finalPhotoUrl}\n`);
    return;
  }

  if (args.includes('--delete')) {
    checkEnv();
    const deleteIdx = args.indexOf('--delete');
    const name = args[deleteIdx + 1];
    if (!name) {
      console.error('\n❌ Usage: node push-drafts.js --delete <draft-name>\n');
      process.exit(1);
    }
    await deleteDraft(name);
    console.log(`\n✅ Draft "${name}" deleted from KV and local drafts.\n`);
    return;
  }

  checkEnv();

  const draftIdx  = args.indexOf('--draft');
  const draftFilter = draftIdx !== -1 ? args[draftIdx + 1] : null;

  const files = fs.readdirSync(DRAFTS_DIR)
    .filter(f => f.endsWith('.json'))
    .filter(f => !draftFilter || f === `${draftFilter}.json`);

  if (!files.length) {
    console.error('\n❌ No drafts found. Run node content-manager.js first.\n');
    process.exit(1);
  }

  console.log(`\n🚀 Pushing ${files.length} draft(s) to Vercel...\n`);

  for (const file of files) {
    try {
      await pushDraft(path.join(DRAFTS_DIR, file));
    } catch (err) {
      console.error(`  ✗ ${file}: ${err.message}`);
    }
  }

  console.log('\n✅ Done. Share the Vercel URL with Jany.');
  console.log('   When he\'s reviewed: node push-drafts.js --pull\n');
}

main().catch(err => {
  console.error('\nFatal error:', err.message);
  process.exit(1);
});
