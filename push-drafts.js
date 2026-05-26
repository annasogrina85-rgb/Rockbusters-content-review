#!/usr/bin/env node
/**
 * Push local drafts to Vercel for Jany to review
 *
 * Photos are served directly from pCloud CDN — no Blob storage needed.
 * Draft state is stored in Vercel KV.
 *
 * Usage:
 *   node push-drafts.js                          — push all drafts
 *   node push-drafts.js --draft a_muerte_camp    — push one draft
 *   node push-drafts.js --pull                   — pull Jany's decisions back
 */

require('dotenv').config({ override: true });
const fs   = require('fs');
const path = require('path');
const https = require('https');

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
  const paths  = collectPhotoPaths(draft);
  const urlMap = {};

  for (const p of paths) {
    const url = await resolvePhotoUrl(p);
    if (url) urlMap[p] = url;
  }

  // Swap paths → CDN URLs in a deep clone
  const d = JSON.parse(JSON.stringify(draft));
  if (d.photo && urlMap[d.photo])      d.photo = urlMap[d.photo];
  if (d.slides) d.slides.forEach(s => {
    if (s.photo && urlMap[s.photo]) s.photo = urlMap[s.photo];
  });

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

  process.stdout.write(`\n  📤 ${name} — resolving photos... `);
  const resolved = await resolveAllPhotos(draft);
  console.log('done');

  // Embed original paths so CCR daily agent can re-resolve expired CDN URLs
  resolved._meta = resolved._meta || {};
  resolved._meta._pcloud_paths = pcloudPaths;

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
