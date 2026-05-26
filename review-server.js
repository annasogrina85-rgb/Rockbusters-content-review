#!/usr/bin/env node
/**
 * Rockbusters Draft Review Server
 * Serves the approval UI at http://localhost:4201
 *
 * Usage:
 *   node review-server.js
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

const PORT = 4201;
const BASE_DIR = __dirname;
const DRAFTS_DIR = path.join(BASE_DIR, 'drafts');
const FEEDBACK_FILE = path.join(BASE_DIR, 'feedback.json');

// ─── Helpers ──────────────────────────────────────────────────────────────────

function readJSON(filePath) {
  try { return JSON.parse(fs.readFileSync(filePath, 'utf8')); }
  catch { return null; }
}

function writeJSON(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

function loadFeedback() {
  return readJSON(FEEDBACK_FILE) || { approved: [], rejected: [], comments: [] };
}

function loadDrafts() {
  if (!fs.existsSync(DRAFTS_DIR)) return [];
  return fs.readdirSync(DRAFTS_DIR)
    .filter(f => f.endsWith('.json'))
    .map(f => readJSON(path.join(DRAFTS_DIR, f)))
    .filter(Boolean);
}

function respond(res, status, data) {
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  });
  res.end(JSON.stringify(data));
}

function serveFile(res, filePath, contentType) {
  if (!fs.existsSync(filePath)) {
    res.writeHead(404); res.end('Not found'); return;
  }
  res.writeHead(200, { 'Content-Type': contentType });
  res.end(fs.readFileSync(filePath));
}

function bodyJSON(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try { resolve(JSON.parse(body)); }
      catch { reject(new Error('Invalid JSON')); }
    });
  });
}

// ─── Serve photo files ────────────────────────────────────────────────────────

function servePhoto(res, photoPath) {
  const fullPath = path.join(BASE_DIR, photoPath);
  if (!fs.existsSync(fullPath)) {
    res.writeHead(404); res.end('Photo not found'); return;
  }
  const ext = path.extname(fullPath).toLowerCase();
  const mime = ext === '.png' ? 'image/png' : 'image/jpeg';
  res.writeHead(200, { 'Content-Type': mime });
  fs.createReadStream(fullPath).pipe(res);
}

// ─── Request Handler ──────────────────────────────────────────────────────────

async function handleRequest(req, res) {
  const parsed = new URL(req.url, `http://localhost:${PORT}`);
  const pathname = parsed.pathname;

  // CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    });
    res.end(); return;
  }

  // Static UI
  if (pathname === '/' || pathname === '/index.html') {
    serveFile(res, path.join(BASE_DIR, 'drafts.html'), 'text/html'); return;
  }

  // Photos
  if (pathname.startsWith('/photos/')) {
    servePhoto(res, pathname.slice(1)); return;
  }

  // API: list drafts
  if (pathname === '/api/drafts' && req.method === 'GET') {
    respond(res, 200, loadDrafts()); return;
  }

  // API: update draft status
  if (pathname.startsWith('/api/draft/') && req.method === 'POST') {
    const parts = pathname.split('/'); // ['', 'api', 'draft', name, action]
    const draftName = parts[3];
    const action = parts[4]; // approve | reject | comment | regenerate

    const draftPath = path.join(DRAFTS_DIR, `${draftName}.json`);
    if (!fs.existsSync(draftPath)) {
      respond(res, 404, { error: 'Draft not found' }); return;
    }

    let body = {};
    try { body = await bodyJSON(req); } catch {}

    const draft = readJSON(draftPath);
    const feedback = loadFeedback();
    const now = new Date().toISOString();

    if (action === 'approve') {
      draft._meta.status = 'approved';
      draft._meta.approved_at = now;
      if (!feedback.approved.includes(draftName)) feedback.approved.push(draftName);
      feedback.rejected = feedback.rejected.filter(n => n !== draftName);
      writeJSON(draftPath, draft);
      writeJSON(FEEDBACK_FILE, feedback);
      console.log(`✅ Approved: ${draftName}`);
      respond(res, 200, { status: 'approved' }); return;
    }

    if (action === 'reject') {
      draft._meta.status = 'rejected';
      draft._meta.rejected_at = now;
      if (!feedback.rejected.includes(draftName)) feedback.rejected.push(draftName);
      feedback.approved = feedback.approved.filter(n => n !== draftName);
      writeJSON(draftPath, draft);
      writeJSON(FEEDBACK_FILE, feedback);
      console.log(`❌ Rejected: ${draftName}`);
      respond(res, 200, { status: 'rejected' }); return;
    }

    if (action === 'comment') {
      const comment = body.comment?.trim();
      if (!comment) { respond(res, 400, { error: 'comment required' }); return; }

      draft._meta.comments = draft._meta.comments || [];
      draft._meta.comments.push({ text: comment, at: now });
      draft._meta.status = 'needs_revision';

      feedback.comments = feedback.comments || [];
      feedback.comments.push({ post: draftName, comment, timestamp: now });

      writeJSON(draftPath, draft);
      writeJSON(FEEDBACK_FILE, feedback);
      console.log(`💬 Comment on ${draftName}: "${comment}"`);
      respond(res, 200, { status: 'commented' }); return;
    }

    respond(res, 400, { error: 'Unknown action' }); return;
  }

  res.writeHead(404); res.end('Not found');
}

// ─── Start ────────────────────────────────────────────────────────────────────

if (!fs.existsSync(DRAFTS_DIR)) fs.mkdirSync(DRAFTS_DIR, { recursive: true });

const server = http.createServer(async (req, res) => {
  try {
    await handleRequest(req, res);
  } catch (err) {
    console.error('Server error:', err.message);
    if (!res.headersSent) { res.writeHead(500); res.end('Server error'); }
  }
});

server.listen(PORT, () => {
  const drafts = loadDrafts();
  console.log(`\n🏔️  Rockbusters Draft Review`);
  console.log(`   http://localhost:${PORT}`);
  console.log(`   ${drafts.length} draft(s) ready for review\n`);
});
