#!/usr/bin/env node
/**
 * Smoke test — run before every deploy to catch broken infra early
 *
 * Usage: node test-smoke.js
 * Exits 0 if all checks pass, 1 if any fail.
 */

require('dotenv').config({ override: true });
const fs = require('fs');
const nodemailer = require('nodemailer');

const PROD_URL = 'https://vercel-five-rho-74.vercel.app';

let passed = 0;
let failed = 0;
const failures = [];

function ok(label) {
  console.log(`  ✅  ${label}`);
  passed++;
}

function fail(label, reason) {
  console.log(`  ❌  ${label}`);
  console.log(`       ${reason}`);
  failed++;
  failures.push({ label, reason });
}

async function kvCheck() {
  const url   = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  if (!url || !token) { fail('KV read/write', 'KV_REST_API_URL or KV_REST_API_TOKEN missing'); return; }
  try {
    // Write (Upstash REST: value goes in the URL path, not body)
    const w = await fetch(`${url}/set/${encodeURIComponent('test:smoke')}/smoke-ok`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!w.ok) throw new Error(`set HTTP ${w.status}`);
    // Read back
    const r = await fetch(`${url}/get/${encodeURIComponent('test:smoke')}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const d = await r.json();
    if (d.result !== 'smoke-ok') throw new Error(`got ${JSON.stringify(d.result)}`);
    // Delete
    await fetch(`${url}/del/${encodeURIComponent('test:smoke')}`, {
      method: 'POST', headers: { Authorization: `Bearer ${token}` }
    });
    ok('KV read/write');
  } catch (e) {
    fail('KV read/write', e.message);
  }
}

async function blobCheck() {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) {
    fail('Vercel Blob', 'BLOB_READ_WRITE_TOKEN not set — add it from Vercel dashboard → Storage → Blob');
    return;
  }
  try {
    let blobPut, blobDel;
    try { ({ put: blobPut, del: blobDel } = require('@vercel/blob')); } catch {
      fail('Vercel Blob', '@vercel/blob not installed — run: npm install @vercel/blob'); return;
    }
    // Upload a tiny 1×1 pixel PNG
    const png1px = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64');
    const { url } = await blobPut('test/smoke-test.png', png1px, { access: 'public', addRandomSuffix: false, token });
    // HEAD check
    const r = await fetch(url, { method: 'HEAD' });
    if (r.status !== 200) throw new Error(`HEAD returned ${r.status}`);
    // Cleanup
    await blobDel(url, { token });
    ok('Vercel Blob upload/read/delete');
  } catch (e) {
    fail('Vercel Blob', e.message);
  }
}

async function vercelDraftsCheck() {
  try {
    const r = await fetch(`${PROD_URL}/api/drafts`);
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const drafts = await r.json();
    if (!Array.isArray(drafts)) throw new Error('Response is not an array');
    if (drafts.length === 0) throw new Error('No drafts returned — KV may be empty');
    ok(`Vercel /api/drafts (${drafts.length} drafts)`);
  } catch (e) {
    fail('Vercel /api/drafts', e.message);
  }
}

async function vercelActionCheck() {
  try {
    // Get first draft name
    const r = await fetch(`${PROD_URL}/api/drafts`);
    const drafts = await r.json();
    const name = drafts[0]?.name;
    if (!name) throw new Error('No drafts to test action on');

    // Approve
    const ar = await fetch(`${PROD_URL}/api/action?draft=${name}&action=approve`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}'
    });
    const ad = await ar.json();
    if (!ad.success) throw new Error(`approve failed: ${JSON.stringify(ad)}`);

    // Revert to pending by setting back via KV directly
    const kvUrl   = process.env.KV_REST_API_URL;
    const kvToken = process.env.KV_REST_API_TOKEN;
    if (kvUrl && kvToken) {
      const raw = await fetch(`${kvUrl}/get/${encodeURIComponent(`draft:${name}`)}`, {
        headers: { Authorization: `Bearer ${kvToken}` }
      });
      const kd = await raw.json();
      const obj = typeof kd.result === 'string' ? JSON.parse(kd.result) : kd.result;
      if (obj) {
        obj._meta.status = 'pending';
        delete obj._meta.approved_at;
        await fetch(`${kvUrl}/set/${encodeURIComponent(`draft:${name}`)}`, {
          method: 'POST', headers: { Authorization: `Bearer ${kvToken}`, 'Content-Type': 'application/json' },
          body: JSON.stringify(JSON.stringify(obj))
        });
      }
    }
    ok(`Vercel /api/action (approve + revert on "${name}")`);
  } catch (e) {
    fail('Vercel /api/action', e.message);
  }
}

async function gmailCheck() {
  const user = process.env.GMAIL_FROM;
  const pass = process.env.GMAIL_APP_PASSWORD;
  if (!user || !pass) { fail('Gmail SMTP', 'GMAIL_FROM or GMAIL_APP_PASSWORD missing'); return; }
  try {
    const t = nodemailer.createTransport({ service: 'gmail', auth: { user, pass } });
    await t.verify();
    ok('Gmail SMTP');
  } catch (e) {
    fail('Gmail SMTP', e.message);
  }
}

async function photoUrlsCheck() {
  const kvUrl   = process.env.KV_REST_API_URL;
  const kvToken = process.env.KV_REST_API_TOKEN;
  if (!kvUrl || !kvToken) { fail('Photo URLs', 'KV credentials missing'); return; }
  try {
    const nr = await fetch(`${kvUrl}/smembers/${encodeURIComponent('drafts:list')}`, {
      headers: { Authorization: `Bearer ${kvToken}` }
    });
    const { result: names } = await nr.json();
    if (!names?.length) { fail('Photo URLs', 'No drafts in KV'); return; }

    const broken = [];
    for (const name of names) {
      const dr = await fetch(`${kvUrl}/get/${encodeURIComponent(`draft:${name}`)}`, {
        headers: { Authorization: `Bearer ${kvToken}` }
      });
      const { result } = await dr.json();
      const obj = typeof result === 'string' ? JSON.parse(result) : result;
      if (!obj) continue;

      const photos = [];
      if (obj.photo) photos.push({ url: obj.photo, tag: 'cover' });
      (obj.slides || []).forEach((s, i) => s.photo && photos.push({ url: s.photo, tag: `slide${i}` }));

      for (const { url, tag } of photos.slice(0, 1)) { // check first photo per draft
        if (!url || !url.startsWith('http')) { broken.push(`${name}/${tag}: no URL`); continue; }
        const hr = await fetch(url, { method: 'HEAD' });
        if (hr.status !== 200) broken.push(`${name}/${tag}: HTTP ${hr.status} — ${url.slice(0,60)}`);
      }
    }

    if (broken.length === 0) {
      ok(`Photo URLs (${names.length} drafts checked)`);
    } else {
      fail(`Photo URLs`, `${broken.length} broken:\n       ${broken.slice(0, 5).join('\n       ')}`);
    }
  } catch (e) {
    fail('Photo URLs', e.message);
  }
}

(async () => {
  console.log('\n🔍  Rockbusters Smoke Test\n');

  await kvCheck();
  await blobCheck();
  await vercelDraftsCheck();
  await vercelActionCheck();
  await gmailCheck();
  await photoUrlsCheck();

  console.log(`\n${'─'.repeat(44)}`);
  if (failed === 0) {
    console.log(`  ✅  All ${passed} checks passed — safe to deploy\n`);
    process.exit(0);
  } else {
    console.log(`  ❌  ${failed} check(s) failed, ${passed} passed\n`);
    console.log(`  Fix these before deploying:\n`);
    failures.forEach(f => console.log(`  → ${f.label}: ${f.reason.split('\n')[0]}`));
    console.log('');
    process.exit(1);
  }
})();
