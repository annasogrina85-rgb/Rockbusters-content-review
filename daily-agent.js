#!/usr/bin/env node
/**
 * Rockbusters Daily Agent
 *
 * Two scheduled runs per day:
 *   9:00 CET  — morning: Drive sync → pull KV → regen revised → generate new → push → email
 *   15:00 CET — afternoon: pull KV → regen new comments → push → Drive sync → email if changes
 *
 * Usage:
 *   node daily-agent.js --morning     Full morning pipeline
 *   node daily-agent.js --afternoon   Afternoon check + sync
 *   node daily-agent.js               Build todo + store in KV (quick, no generation)
 *
 * Outcomes handled:
 *   - nobody reviewed     → resend reminder in email
 *   - draft approved      → mark in content-plan, "ready to post"
 *   - draft rejected      → increment count; if 3× flag as "needs rethink"
 *   - comment added       → auto-regen on next morning run
 *   - photo uploaded      → apply on regen
 *   - pCloud URLs expired → re-resolve from _meta._pcloud_paths
 *   - Drive unreachable   → fall back to local content-plan.json
 *   - plan updated        → detect new items, generate drafts
 *   - guidelines updated  → reload on next generation run
 */

require('dotenv').config({ override: true });
const fs   = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const nodemailer = require('nodemailer');

const REVIEW_URL  = 'https://rockbusters-content-maker.vercel.app';
const JANY_DOC    = 'https://docs.google.com/document/d/1xgABM6ukVvb0OdwVOTp8N-42xdpfiQdg7W9HbB5DWII/edit';
const DRIVE_FOLDER = 'https://drive.google.com/drive/folders/1zvbmuYWH-k3TMXNxA_N1ZKZCHHBlzDpj';
const KV_URL      = () => process.env.KV_REST_API_URL;
const KV_TOKEN    = () => process.env.KV_REST_API_TOKEN;
const PLAN_FILE   = path.join(__dirname, 'content-plan.json');
const BASE_DIR    = __dirname;

const ANNA_EMAIL  = 'annasogrina85@gmail.com';
const JANY_EMAIL  = 'jany.rockbusters@gmail.com';

// ─── KV helpers ───────────────────────────────────────────────────────────────

async function kvGet(key) {
  const res = await fetch(`${KV_URL()}/get/${encodeURIComponent(key)}`, {
    headers: { Authorization: `Bearer ${KV_TOKEN()}` }
  });
  if (!res.ok) return null;
  const data = await res.json();
  const val = data.result;
  if (!val) return null;
  return typeof val === 'string' ? JSON.parse(val) : val;
}

async function kvSet(key, value) {
  await fetch(`${KV_URL()}/set/${encodeURIComponent(key)}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${KV_TOKEN()}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(value)
  });
}

async function kvSMembers(key) {
  const res = await fetch(`${KV_URL()}/smembers/${encodeURIComponent(key)}`, {
    headers: { Authorization: `Bearer ${KV_TOKEN()}` }
  });
  if (!res.ok) return [];
  return (await res.json()).result || [];
}

async function kvScan(pattern) {
  // Upstash KV: use SCAN to find keys matching a pattern
  const res = await fetch(`${KV_URL()}/scan/0?match=${encodeURIComponent(pattern)}&count=100`, {
    headers: { Authorization: `Bearer ${KV_TOKEN()}` }
  });
  if (!res.ok) return [];
  const data = await res.json();
  return data.result?.[1] || [];
}

// ─── Subprocess runner ────────────────────────────────────────────────────────

function run(script, args = [], { silent = false } = {}) {
  const result = spawnSync('node', [path.join(BASE_DIR, script), ...args], {
    stdio: silent ? 'pipe' : 'inherit',
    cwd: BASE_DIR,
    env: { ...process.env }
  });
  return { ok: result.status === 0, stdout: result.stdout?.toString() || '', stderr: result.stderr?.toString() || '' };
}

// ─── Email ────────────────────────────────────────────────────────────────────

async function sendEmail({ to, subject, html }) {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_FROM,
      pass: process.env.GMAIL_APP_PASSWORD
    }
  });

  try {
    await transporter.sendMail({
      from: `Rockbusters Content Agent <${process.env.GMAIL_FROM}>`,
      to: Array.isArray(to) ? to.join(', ') : to,
      subject,
      html
    });
    console.log(`  📧 Email sent → ${Array.isArray(to) ? to.join(', ') : to}`);
  } catch (err) {
    console.warn(`  ⚠ Email failed: ${err.message}`);
  }
}

// ─── Plan comments from KV ────────────────────────────────────────────────────

async function getPlanComments() {
  const keys = await kvScan('plan:comments:*');
  const comments = {};
  for (const key of keys) {
    const item = key.replace('plan:comments:', '');
    const val = await kvGet(key);
    if (val) comments[item] = val;
  }
  return comments;
}

// ─── Pull KV decisions ────────────────────────────────────────────────────────

async function pullDecisions() {
  console.log('  📥 Pulling decisions from KV...');
  const { ok, stderr } = run('push-drafts.js', ['--pull'], { silent: true });
  if (!ok) console.warn(`  ⚠ Pull had warnings: ${stderr.slice(0, 200)}`);
  else console.log('  ✓ Decisions pulled');
}

// ─── Regen all needs_revision drafts ─────────────────────────────────────────

async function regenRevised() {
  console.log('  🔄 Regenerating drafts with comments...');
  const { ok, stdout } = run('regen.js', [], { silent: true });
  if (stdout.includes('Nothing to regenerate') || stdout.includes('No drafts need revision')) {
    console.log('  ✓ No drafts need revision');
  } else if (ok) {
    console.log('  ✓ Regen complete');
  } else {
    console.warn('  ⚠ Regen had issues — check manually');
  }
}

// ─── Generate new drafts for pending plan items ───────────────────────────────

async function generateNewDrafts(plan, kvDrafts, planComments = {}) {
  const toGenerate = [];

  for (const post of plan.posts) {
    const kv = kvDrafts[post.name];
    const status = kv?.status || post.status;

    // Skip if already in KV or blocked
    if (kv) continue;
    if (post.blocker && !post.status?.includes('pending')) continue;
    if (status === 'blocked' || status === 'blocked_needs_context' || status === 'blocked_needs_participant_data') continue;

    toGenerate.push(post.name);
  }

  if (toGenerate.length === 0) {
    console.log('  ✓ No new drafts to generate');
    return;
  }

  // Write plan comments to .plan_context.json so content-manager.js can inject them into briefs
  const planContextFile = path.join(BASE_DIR, '.plan_context.json');
  const relevantComments = {};
  for (const name of toGenerate) {
    const itemComments = planComments[name];
    if (itemComments?.comments?.length) {
      relevantComments[name] = itemComments.comments.map(c => `- ${c.from || 'anonymous'}: "${c.text}"`).join('\n');
    }
  }
  if (Object.keys(relevantComments).length) {
    fs.writeFileSync(planContextFile, JSON.stringify(relevantComments, null, 2));
  }

  try {
    console.log(`  🏔️  Generating ${toGenerate.length} new draft(s): ${toGenerate.join(', ')}`);
    for (const name of toGenerate) {
      if (relevantComments[name]) console.log(`     💬 ${name} has plan comments — injecting into brief`);
      console.log(`     → ${name}`);
      const { ok } = run('content-manager.js', ['--job', name], { silent: true });
      if (ok) console.log(`     ✓ ${name} generated`);
      else console.warn(`     ⚠ ${name} generation failed — check job name matches`);
    }
  } finally {
    // Always clean up temp file
    if (fs.existsSync(planContextFile)) fs.unlinkSync(planContextFile);
  }
}

// ─── Refresh pCloud URLs ──────────────────────────────────────────────────────

async function refreshPCloudUrls() {
  console.log('  📡 Refreshing pCloud URLs (re-push all drafts)...');
  const { ok } = run('push-drafts.js', [], { silent: true });
  if (ok) console.log('  ✓ All pCloud URLs refreshed');
  else console.warn('  ⚠ pCloud refresh had errors — check manually');
}

// ─── Sync Drive ───────────────────────────────────────────────────────────────

async function syncFromDrive() {
  console.log('  📂 Syncing content-plan from Drive...');
  const { ok } = run('sync-gdrive.js', ['--pull-plan'], { silent: true });
  if (ok) console.log('  ✓ Content plan synced from Drive');
  else console.warn('  ⚠ Drive sync failed — using local content-plan.json');
}

async function syncToDrive() {
  console.log('  📂 Pushing content-plan to Drive...');
  const { ok } = run('sync-gdrive.js', ['--push-plan'], { silent: true });
  if (ok) console.log('  ✓ Content plan pushed to Drive');
  else console.warn('  ⚠ Drive push failed');
}

// ─── Update content-plan statuses ────────────────────────────────────────────

async function updatePlanStatuses(kvDrafts) {
  const plan = JSON.parse(fs.readFileSync(PLAN_FILE, 'utf8'));
  let changed = false;

  for (const post of plan.posts) {
    const kv = kvDrafts[post.name];
    if (!kv) continue;

    const kvStatus = kv.status;

    // Mark as approved in plan if KV says approved
    if (kvStatus === 'approved' && post.status !== 'approved') {
      post.status = 'approved';
      post.blocker = null;
      changed = true;
    }

    // Track rejection count — if rejected 3× flag as needs_rethink
    if (kvStatus === 'rejected') {
      post._reject_count = (post._reject_count || 0) + 1;
      if (post._reject_count >= 3) {
        post.status = 'needs_rethink';
        post.blocker = 'Rejected 3 times — needs full rethink. Add context to content-plan.json.';
      }
      changed = true;
    }
  }

  if (changed) {
    plan.updated = new Date().toISOString().slice(0, 10);
    fs.writeFileSync(PLAN_FILE, JSON.stringify(plan, null, 2));
    console.log('  ✓ content-plan.json statuses updated');
  }

  return plan;
}

// ─── Build todo markdown ──────────────────────────────────────────────────────

function statusEmoji(status) {
  const map = { approved: '✅', rejected: '❌', needs_revision: '💬', pending: '⏳', needs_rethink: '🔁' };
  return map[status] || '⏳';
}

function todayStr() {
  return new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
}

async function buildTodo(plan, kvDrafts) {
  const lines = [];

  lines.push(`# Rockbusters · Daily Todo`);
  lines.push(`**${todayStr()}**`);
  lines.push('');

  // ── Upcoming camps ──
  const upcoming = plan.upcoming_camps.filter(c => !c._note && new Date(c.date) >= new Date());
  if (upcoming.length) {
    lines.push('## 📅 Upcoming camps');
    for (const c of upcoming) {
      const days = Math.ceil((new Date(c.date) - new Date()) / 86400000);
      lines.push(`- **${c.name}** with ${c.coach} — ${c.location}, ${c.date} (in ${days} day${days === 1 ? '' : 's'})`);
    }
    lines.push('');
  }

  // ── Review needed ──
  const needsReview = [];
  for (const post of plan.posts) {
    const kv = kvDrafts[post.name];
    const status = kv?.status || post.status;
    if (status === 'pending_review' || status === 'pending') {
      needsReview.push({ ...post, kvStatus: status });
    }
  }

  if (needsReview.length) {
    lines.push(`## 🔍 Needs review (${needsReview.length})`);
    lines.push(`→ [Open review app](${REVIEW_URL})`);
    lines.push('');
    for (const p of needsReview) {
      const blocker = p.blocker ? ` ⚠️ *${p.blocker}*` : '';
      lines.push(`- **${p.name.replace(/_/g, ' ')}** [${p.type}]${blocker}`);
    }
    lines.push('');
  }

  // ── Comments needing regen ──
  const needsRegen = [];
  for (const [name, meta] of Object.entries(kvDrafts)) {
    if (meta?.status === 'needs_revision' && meta?.comments?.length) {
      needsRegen.push({ name, comments: meta.comments });
    }
  }

  if (needsRegen.length) {
    lines.push(`## 💬 Comments added (will regen next morning)`);
    for (const d of needsRegen) {
      lines.push(`- **${d.name.replace(/_/g, ' ')}**:`);
      for (const c of d.comments) lines.push(`  *"${c.text}"*`);
    }
    lines.push('');
  }

  // ── Ready to post ──
  const readyToPost = plan.posts.filter(p => {
    const kv = kvDrafts[p.name];
    return (kv?.status === 'approved' || p.status === 'approved') && !p.blocker;
  });

  if (readyToPost.length) {
    lines.push(`## 🚀 Ready to post (${readyToPost.length})`);
    lines.push(`→ Generate final images: \`node generate.js --all\``);
    lines.push('');
    for (const p of readyToPost) {
      lines.push(`- **${p.name.replace(/_/g, ' ')}** — post after ${p.publish_after || 'now'}`);
    }
    lines.push('');
  }

  // ── Needs rethink (rejected 3×) ──
  const needsRethink = plan.posts.filter(p => p.status === 'needs_rethink');
  if (needsRethink.length) {
    lines.push(`## 🔁 Needs rethink (rejected 3× — add context)`);
    for (const p of needsRethink) {
      lines.push(`- **${p.name.replace(/_/g, ' ')}**: ${p.blocker}`);
    }
    lines.push('');
  }

  // ── Info needed ──
  if (plan.info_needed?.length) {
    const jany = plan.info_needed.filter(i => i.from === 'Jany');
    const anna = plan.info_needed.filter(i => i.from === 'Anna');

    if (jany.length) {
      lines.push(`## 📋 Jany: info needed`);
      lines.push(`→ [Fill in answers](${JANY_DOC})`);
      lines.push('');
      for (const i of jany) lines.push(`- **${i.what}** *(for: ${i.for})*`);
      lines.push('');
    }

    if (anna.length) {
      lines.push(`## 📋 Anna: action needed`);
      for (const i of anna) lines.push(`- ${i.what} *(for: ${i.for})*`);
      lines.push('');
    }
  }

  // ── Highlights blocked ──
  const blockedHighlights = plan.highlights.filter(h => h.status === 'blocked');
  if (blockedHighlights.length) {
    lines.push(`## 🔒 Highlights blocked`);
    for (const h of blockedHighlights) {
      lines.push(`- **${h.name}**: ${h.blocker}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

// ─── Build structured todos ───────────────────────────────────────────────────

async function buildStructuredTodos(plan, kvDrafts) {
  const todos = [];
  const postMap = {};

  // Blockers
  for (const post of plan.posts) {
    if (post.blocker && post.status !== 'approved') {
      const id = `blocker-${post.name}`;
      todos.push({ id, type: 'blocker', title: post.blocker, postName: post.name,
        postLabel: post.name.replace(/_/g, ' '), priority: 'high', emoji: '⚠️' });
      (postMap[post.name] = postMap[post.name] || []).push(id);
    }
  }

  // Review needed
  for (const post of plan.posts) {
    const kv = kvDrafts[post.name];
    const status = kv?.status || post.status;
    if (status === 'pending_review' || status === 'pending') {
      const id = `review-${post.name}`;
      todos.push({ id, type: 'review', title: `Review: ${post.name.replace(/_/g, ' ')} [${post.type}]`,
        postName: post.name, postLabel: post.name.replace(/_/g, ' '), priority: 'high', emoji: '🔍' });
      (postMap[post.name] = postMap[post.name] || []).push(id);
    }
  }

  // Regen needed
  for (const [name, meta] of Object.entries(kvDrafts)) {
    if (meta?.status === 'needs_revision' && meta?.comments?.length) {
      const id = `regen-${name}`;
      todos.push({ id, type: 'regen', title: `Regenerate: ${name.replace(/_/g, ' ')}`,
        postName: name, postLabel: name.replace(/_/g, ' '),
        commandHint: `node regen.js ${name}`, priority: 'high', emoji: '💬' });
      (postMap[name] = postMap[name] || []).push(id);
    }
  }

  // Jany input
  for (const task of (plan.info_needed?.filter(i => i.from === 'Jany') || [])) {
    const id = `jany-${task.for.replace(/\s+/g, '-')}`;
    todos.push({ id, type: 'jany-input', title: task.what, for: task.for, priority: 'medium', emoji: '📋' });
  }

  // Ready to post
  const readyNames = plan.posts.filter(p => {
    const kv = kvDrafts[p.name];
    return (kv?.status === 'approved' || p.status === 'approved') && !p.blocker;
  }).map(p => p.name);

  if (readyNames.length) {
    todos.push({ id: 'ready-to-post', type: 'ready',
      title: `Ready to post: ${readyNames.length} draft${readyNames.length > 1 ? 's' : ''} approved`,
      postNames: readyNames, priority: 'medium', emoji: '🚀' });
  }

  // Highlight blockers
  for (const h of plan.highlights.filter(h => h.status === 'blocked')) {
    todos.push({ id: `highlight-${h.name}`, type: 'highlight-blocked',
      title: `${h.name} Highlight: ${h.blocker}`, highlightName: h.name, priority: 'medium', emoji: '🔒' });
  }

  // Upcoming camps
  for (const camp of plan.upcoming_camps.filter(c => !c._note && new Date(c.date) >= new Date())) {
    const days = Math.ceil((new Date(camp.date) - new Date()) / 86400000);
    todos.push({ id: `camp-${camp.name.replace(/\s+/g, '-')}`, type: 'camp',
      title: `${camp.name} with ${camp.coach}`, camp: camp.name, location: camp.location,
      date: camp.date, daysUntil: days, priority: 'low', emoji: '📅' });
  }

  return { todos, postMap };
}

// ─── Build morning email HTML ─────────────────────────────────────────────────

function buildMorningEmail(plan, kvDrafts, { newDrafts = [], regenned = [], isReminder = false }) {
  const reviewPosts = plan.posts.filter(p => {
    const kv = kvDrafts[p.name];
    return (kv?.status === 'pending_review' || kv?.status === 'pending' || p.status === 'pending_review') && !kv?.status?.includes('approved');
  });
  const readyPosts = plan.posts.filter(p => {
    const kv = kvDrafts[p.name];
    return kv?.status === 'approved' && !p.blocker;
  });
  const needsInfo = plan.info_needed || [];
  const upcoming = plan.upcoming_camps.filter(c => !c._note && new Date(c.date) >= new Date());
  const blockers = plan.posts.filter(p => p.blocker && p.status !== 'approved');

  const reminderBanner = isReminder ? `
    <div style="background:#ff6b00;color:white;padding:12px 20px;border-radius:6px;margin-bottom:20px;font-weight:bold;">
      ⏰ Reminder — drafts are waiting for your review
    </div>` : '';

  const section = (title, items) => items.length === 0 ? '' : `
    <div style="margin:24px 0">
      <h3 style="color:#ff6b00;font-size:14px;text-transform:uppercase;letter-spacing:1px;margin:0 0 12px">${title}</h3>
      <ul style="margin:0;padding:0 0 0 20px">${items.map(i => `<li style="margin:6px 0">${i}</li>`).join('')}</ul>
    </div>`;

  return `
  <div style="font-family:system-ui,sans-serif;max-width:600px;margin:0 auto;color:#222;background:#fafafa;padding:32px;border-radius:12px">
    <div style="margin-bottom:24px">
      <span style="font-size:22px;font-weight:bold;color:#111">🏔 Rockbusters</span>
      <span style="color:#888;font-size:13px;margin-left:12px">Daily Brief · ${todayStr()}</span>
    </div>
    ${reminderBanner}

    ${section('🔍 Needs your review', [
      ...reviewPosts.map(p => `<a href="${REVIEW_URL}" style="color:#ff6b00"><strong>${p.name.replace(/_/g, ' ')}</strong></a> [${p.type}]${p.blocker ? ` — <em>${p.blocker}</em>` : ''}`),
      reviewPosts.length ? `<a href="${REVIEW_URL}" style="color:#ff6b00;font-weight:bold">→ Open review app</a>` : ''
    ].filter(Boolean))}

    ${section('✨ Newly generated', newDrafts.map(n => `<strong>${n.replace(/_/g, ' ')}</strong>`))}
    ${section('🔄 Regenerated with feedback', regenned.map(n => `<strong>${n.replace(/_/g, ' ')}</strong>`))}
    ${section('🚀 Ready to post', readyPosts.map(p => `<strong>${p.name.replace(/_/g, ' ')}</strong> — publish after ${p.publish_after || 'now'}`))}

    ${section('📅 Upcoming camps', upcoming.map(c => {
      const d = Math.ceil((new Date(c.date) - new Date()) / 86400000);
      return `<strong>${c.name}</strong> with ${c.coach} · ${c.location} · ${c.date} <em>(${d} days)</em>`;
    }))}

    ${section('⚠️ Blockers', blockers.map(p => `<strong>${p.name.replace(/_/g, ' ')}</strong>: ${p.blocker}`))}
    ${section('📋 Info needed', needsInfo.map(i => `<strong>${i.from}</strong>: ${i.what} <em>(for: ${i.for})</em>`))}

    <div style="margin-top:32px;padding-top:20px;border-top:1px solid #eee;font-size:12px;color:#999">
      <a href="${REVIEW_URL}" style="color:#ff6b00">Review app</a> ·
      <a href="${DRIVE_FOLDER}" style="color:#ff6b00">Content plan in Drive</a> ·
      <a href="${JANY_DOC}" style="color:#ff6b00">Jany's input doc</a>
    </div>
  </div>`;
}

// ─── Morning pipeline ─────────────────────────────────────────────────────────

async function runMorning() {
  console.log('\n🌅 Rockbusters Morning Agent\n');

  // 1. Sync content plan from Drive
  await syncFromDrive();
  const plan = JSON.parse(fs.readFileSync(PLAN_FILE, 'utf8'));

  // 2. Pull overnight KV decisions
  await pullDecisions();

  // 3. Fetch KV drafts snapshot
  const draftNames = await kvSMembers('drafts:list');
  const kvDrafts = {};
  for (const name of draftNames) {
    const d = await kvGet(`draft:${name}`);
    if (d) kvDrafts[name] = d._meta || {};
  }

  // 4. Pull plan-level comments from review app — will be injected into new draft briefs
  const planComments = await getPlanComments();
  if (Object.keys(planComments).length) {
    console.log(`  📝 Found ${Object.keys(planComments).length} plan comment(s) — injecting into briefs`);
  }

  // 5. Regen all needs_revision drafts
  const regenBefore = Object.keys(kvDrafts).filter(n => kvDrafts[n]?.status === 'needs_revision');
  await regenRevised();
  const regenned = regenBefore; // names that were regenerated

  // 6. Generate new drafts for pending plan items (pass plan comments so briefs pick them up)
  const newDraftsBefore = new Set(Object.keys(kvDrafts));
  await generateNewDrafts(plan, kvDrafts, planComments);

  // 7. Refresh all pCloud URLs (CDN links expire — re-resolve from _pcloud_paths)
  await refreshPCloudUrls();

  // 8. Rebuild todo
  const updatedDraftNames = await kvSMembers('drafts:list');
  const freshKvDrafts = {};
  for (const name of updatedDraftNames) {
    const d = await kvGet(`draft:${name}`);
    if (d) freshKvDrafts[name] = d._meta || {};
  }
  const freshPlan = JSON.parse(fs.readFileSync(PLAN_FILE, 'utf8'));

  const todo = await buildTodo(freshPlan, freshKvDrafts);
  fs.writeFileSync(path.join(__dirname, 'todo.md'), todo);

  const { todos, postMap } = await buildStructuredTodos(freshPlan, freshKvDrafts);
  await kvSet('todo:latest', { content: todo, generated_at: new Date().toISOString() });
  await kvSet('todos:structured', { todos, postMap, generated_at: new Date().toISOString() });
  console.log('  ✓ Todo rebuilt and stored in KV');

  // 9. Detect reminder situation (nobody reviewed since last run)
  const allPending = Object.values(freshKvDrafts).filter(m => m?.status === 'pending' || m?.status === 'pending_review');
  const isReminder = allPending.length > 3;

  // 10. Send morning email
  const newDrafts = updatedDraftNames.filter(n => !newDraftsBefore.has(n));
  const emailHtml = buildMorningEmail(freshPlan, freshKvDrafts, { newDrafts, regenned, isReminder });
  const subject = isReminder
    ? `⏰ [Rockbusters] Reminder: ${allPending.length} drafts waiting for review`
    : `🏔 [Rockbusters] Morning brief · ${todayStr()}`;

  await sendEmail({ to: [ANNA_EMAIL, JANY_EMAIL], subject, html: emailHtml });

  console.log('\n✅ Morning agent complete.\n');
}

// ─── Afternoon pipeline ───────────────────────────────────────────────────────

async function runAfternoon() {
  console.log('\n🌇 Rockbusters Afternoon Agent\n');

  // 1. Pull daytime decisions
  await pullDecisions();

  // 2. Fetch KV snapshot
  const draftNames = await kvSMembers('drafts:list');
  const kvDrafts = {};
  for (const name of draftNames) {
    const d = await kvGet(`draft:${name}`);
    if (d) kvDrafts[name] = d._meta || {};
  }

  // 3. Regen any newly commented drafts
  const needsRegen = Object.keys(kvDrafts).filter(n => kvDrafts[n]?.status === 'needs_revision');
  if (needsRegen.length) {
    console.log(`  🔄 ${needsRegen.length} draft(s) need regen...`);
    await regenRevised();
    await refreshPCloudUrls(); // push updated + refresh URLs
  } else {
    console.log('  ✓ No drafts need regen');
  }

  // 4. Update plan statuses (approved / rejected counts)
  const plan = await updatePlanStatuses(kvDrafts);

  // 5. Sync updated plan to Drive
  await syncToDrive();

  // 6. Rebuild todo
  const freshPlan = JSON.parse(fs.readFileSync(PLAN_FILE, 'utf8'));
  const todo = await buildTodo(freshPlan, kvDrafts);
  fs.writeFileSync(path.join(__dirname, 'todo.md'), todo);

  const { todos, postMap } = await buildStructuredTodos(freshPlan, kvDrafts);
  await kvSet('todo:latest', { content: todo, generated_at: new Date().toISOString() });
  await kvSet('todos:structured', { todos, postMap, generated_at: new Date().toISOString() });
  console.log('  ✓ Todo updated');

  // 7. Send update email only if there were changes
  const hasChanges = needsRegen.length > 0 ||
    Object.values(kvDrafts).some(m => m?.status === 'approved') ||
    Object.values(kvDrafts).some(m => m?.updated_at && new Date(m.updated_at) > new Date(Date.now() - 6 * 3600 * 1000));

  if (hasChanges) {
    const emailHtml = buildMorningEmail(freshPlan, kvDrafts, { newDrafts: [], regenned: needsRegen });
    await sendEmail({
      to: [ANNA_EMAIL, JANY_EMAIL],
      subject: `🔄 [Rockbusters] Afternoon update · ${todayStr()}`,
      html: emailHtml
    });
  } else {
    console.log('  📭 No changes — skipping afternoon email');
  }

  console.log('\n✅ Afternoon agent complete.\n');
}

// ─── Quick build (no generation) ─────────────────────────────────────────────

async function runQuick() {
  console.log('\n📋 Rockbusters Daily Agent (quick build)\n');

  const draftNames = await kvSMembers('drafts:list');
  const kvDrafts = {};
  for (const name of draftNames) {
    const d = await kvGet(`draft:${name}`);
    if (d) kvDrafts[name] = d._meta || {};
  }

  const plan = JSON.parse(fs.readFileSync(PLAN_FILE, 'utf8'));
  const todo = await buildTodo(plan, kvDrafts);

  fs.writeFileSync(path.join(__dirname, 'todo.md'), todo);
  console.log('✓ todo.md written');

  const { todos, postMap } = await buildStructuredTodos(plan, kvDrafts);
  await kvSet('todo:latest', { content: todo, generated_at: new Date().toISOString() });
  await kvSet('todos:structured', { todos, postMap, generated_at: new Date().toISOString() });
  console.log('✓ KV updated\n');
  console.log(todo);
}

// ─── Notify-only (for remote CCR — no local files needed) ────────────────────
// Reads KV → builds todo → updates KV → sends email
// Does NOT run content generation or Drive sync (those need local machine)

async function runNotifyOnly() {
  console.log('\n📧 Rockbusters Notify Agent\n');

  const draftNames = await kvSMembers('drafts:list');
  const kvDrafts = {};
  for (const name of draftNames) {
    const d = await kvGet(`draft:${name}`);
    if (d) kvDrafts[name] = d._meta || {};
  }

  const planRaw = await kvGet('content-plan');
  let plan;
  if (planRaw) {
    plan = planRaw;
  } else {
    // No plan in KV — build minimal plan from KV draft statuses only
    plan = { upcoming_camps: [], posts: Object.keys(kvDrafts).map(n => ({ name: n, type: 'unknown', status: kvDrafts[n]?.status || 'pending' })), highlights: [], info_needed: [] };
  }

  const todo = await buildTodo(plan, kvDrafts);
  const { todos, postMap } = await buildStructuredTodos(plan, kvDrafts);

  await kvSet('todo:latest', { content: todo, generated_at: new Date().toISOString() });
  await kvSet('todos:structured', { todos, postMap, generated_at: new Date().toISOString() });
  console.log('  ✓ Todo updated in KV');

  // Check if this is morning or afternoon based on UTC hour
  const hour = new Date().getUTCHours();
  const isMorning = hour < 12;

  const allPending = Object.values(kvDrafts).filter(m => m?.status === 'pending' || m?.status === 'pending_review');
  const isReminder = allPending.length > 3;

  const emailHtml = buildMorningEmail(plan, kvDrafts, { newDrafts: [], regenned: [], isReminder });
  const prefix = isMorning ? '🏔' : '🔄';
  const timeLabel = isMorning ? 'Morning brief' : 'Afternoon update';
  const subject = isReminder
    ? `⏰ [Rockbusters] Reminder: ${allPending.length} drafts waiting`
    : `${prefix} [Rockbusters] ${timeLabel} · ${todayStr()}`;

  await sendEmail({ to: [ANNA_EMAIL, JANY_EMAIL], subject, html: emailHtml });

  console.log('\n✅ Notify agent complete.\n');
}

// ─── Push content plan to KV (so notify-only can read it) ────────────────────

async function pushPlanToKV() {
  if (fs.existsSync(PLAN_FILE)) {
    const plan = JSON.parse(fs.readFileSync(PLAN_FILE, 'utf8'));
    await kvSet('content-plan', plan);
    console.log('  ✓ content-plan pushed to KV');
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);

  if (args.includes('--morning')) return runMorning();
  if (args.includes('--afternoon')) return runAfternoon();
  if (args.includes('--notify-only')) return runNotifyOnly();
  if (args.includes('--push-plan')) return pushPlanToKV();
  return runQuick();
}

main().catch(err => {
  console.error('\n❌ Daily agent error:', err.message);
  process.exit(1);
});
