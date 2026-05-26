#!/usr/bin/env node
/**
 * Rockbusters Daily Agent
 * Reads content-plan.json + KV draft statuses → writes todo.md + stores in KV
 *
 * Runs daily at 9am. Designed to work both locally and as a remote CCR agent.
 *
 * Usage:
 *   node daily-agent.js
 */

require('dotenv').config({ override: true });
const fs = require('fs');
const path = require('path');

const REVIEW_URL  = 'https://vercel-five-rho-74.vercel.app';
const JANY_DOC    = 'https://docs.google.com/document/d/1xgABM6ukVvb0OdwVOTp8N-42xdpfiQdg7W9HbB5DWII/edit';
const KV_URL      = process.env.KV_REST_API_URL;
const KV_TOKEN    = process.env.KV_REST_API_TOKEN;
const PLAN_FILE   = path.join(__dirname, 'content-plan.json');

// ─── KV helpers ───────────────────────────────────────────────────────────────

async function kvGet(key) {
  const res = await fetch(`${KV_URL}/get/${encodeURIComponent(key)}`, {
    headers: { Authorization: `Bearer ${KV_TOKEN}` }
  });
  if (!res.ok) return null;
  const data = await res.json();
  const val = data.result;
  if (!val) return null;
  return typeof val === 'string' ? JSON.parse(val) : val;
}

async function kvSet(key, value) {
  await fetch(`${KV_URL}/set/${encodeURIComponent(key)}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${KV_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(value)
  });
}

async function kvSMembers(key) {
  const res = await fetch(`${KV_URL}/smembers/${encodeURIComponent(key)}`, {
    headers: { Authorization: `Bearer ${KV_TOKEN}` }
  });
  if (!res.ok) return [];
  return (await res.json()).result || [];
}

// ─── Build todo ───────────────────────────────────────────────────────────────

function statusEmoji(status) {
  const map = { approved: '✅', rejected: '❌', needs_revision: '💬', pending: '⏳' };
  return map[status] || '⏳';
}

function today() {
  return new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
}

async function buildTodo() {
  const plan = JSON.parse(fs.readFileSync(PLAN_FILE, 'utf8'));

  // Fetch all draft statuses from KV
  const draftNames = await kvSMembers('drafts:list');
  const kvDrafts = {};
  for (const name of draftNames) {
    const draft = await kvGet(`draft:${name}`);
    if (draft) kvDrafts[name] = draft._meta || {};
  }

  const lines = [];

  lines.push(`# Rockbusters · Daily Todo`);
  lines.push(`**${today()}**`);
  lines.push('');

  // ── Upcoming camps ──
  const upcoming = plan.upcoming_camps.filter(c => new Date(c.date) >= new Date());
  if (upcoming.length) {
    lines.push('## 📅 Upcoming camps');
    for (const c of upcoming) {
      const days = Math.ceil((new Date(c.date) - new Date()) / 86400000);
      lines.push(`- **${c.name}** with ${c.coach} — ${c.location}, ${c.date} (in ${days} day${days === 1 ? '' : 's'})`);
    }
    lines.push('');
  }

  // ── Jany: approve / review ──
  const needsJany = [];
  for (const post of plan.posts) {
    const kv = kvDrafts[post.name];
    const status = kv?.status || post.status;
    if (status === 'pending_review' || status === 'pending') {
      needsJany.push({ ...post, kvStatus: status, comments: kv?.comments || [] });
    }
  }

  if (needsJany.length) {
    lines.push(`## 🔍 Jany: needs your review`);
    lines.push(`→ [Open review app](${REVIEW_URL})`);
    lines.push('');
    for (const p of needsJany) {
      const blocker = p.blocker ? ` ⚠️ *${p.blocker}*` : '';
      lines.push(`- **${p.name.replace(/_/g, ' ')}** [${p.type}]${blocker}`);
    }
    lines.push('');
  }

  // ── Comments from Jany waiting for regeneration ──
  const needsRegen = [];
  for (const name of draftNames) {
    const kv = kvDrafts[name];
    if (kv?.status === 'needs_revision' && kv?.comments?.length) {
      needsRegen.push({ name, comments: kv.comments });
    }
  }

  if (needsRegen.length) {
    lines.push(`## 💬 Comments from Jany (needs regeneration)`);
    lines.push(`→ Run: \`node push-drafts.js --pull && node content-manager.js --job <name>\``);
    lines.push(`→ [See comments in review app](${REVIEW_URL})`);
    lines.push('');
    for (const d of needsRegen) {
      lines.push(`- **${d.name.replace(/_/g, ' ')}**:`);
      for (const c of d.comments) lines.push(`  *"${c.text}"*`);
    }
    lines.push('');
  }

  // ── Approved and ready to post ──
  const readyToPost = [];
  for (const post of plan.posts) {
    const kv = kvDrafts[post.name];
    const status = kv?.status || post.status;
    if (status === 'approved' || post.status === 'ready') {
      if (!post.blocker) readyToPost.push(post);
    }
  }

  if (readyToPost.length) {
    lines.push(`## 🚀 Ready to post`);
    lines.push(`→ Generate final images: \`node generate.js --all\``);
    lines.push('');
    for (const p of readyToPost) {
      lines.push(`- **${p.name.replace(/_/g, ' ')}** — post after ${p.publish_after || 'now'}`);
    }
    lines.push('');
  }

  // ── Info needed (from Anna / Jany) ──
  if (plan.info_needed?.length) {
    const anna = plan.info_needed.filter(i => i.from === 'Anna');
    const jany = plan.info_needed.filter(i => i.from === 'Jany');

    if (jany.length) {
      lines.push(`## 📋 Jany: info still needed`);
      lines.push(`→ [Fill in answers here](${JANY_DOC})`);
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

  // ── Highlights still blocked ──
  const blockedHighlights = plan.highlights.filter(h => h.status === 'blocked');
  if (blockedHighlights.length) {
    lines.push(`## 🔒 Highlights blocked (can't publish yet)`);
    for (const h of blockedHighlights) {
      lines.push(`- **${h.name}**: ${h.blocker}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

// ─── Build structured todo JSON ───────────────────────────────────────────────

async function buildStructuredTodos() {
  const plan = JSON.parse(fs.readFileSync(PLAN_FILE, 'utf8'));

  // Fetch all draft statuses from KV
  const draftNames = await kvSMembers('drafts:list');
  const kvDrafts = {};
  for (const name of draftNames) {
    const draft = await kvGet(`draft:${name}`);
    if (draft) kvDrafts[name] = draft._meta || {};
  }

  const todos = [];
  const postMap = {}; // name → todoIds for bidirectional linking

  // ── Blockers for posts ──
  for (const post of plan.posts) {
    if (post.blocker) {
      const id = `blocker-${post.name}`;
      todos.push({
        id,
        type: 'blocker',
        title: post.blocker,
        postName: post.name,
        postLabel: post.name.replace(/_/g, ' '),
        priority: 'high',
        emoji: '⚠️'
      });
      if (!postMap[post.name]) postMap[post.name] = [];
      postMap[post.name].push(id);
    }
  }

  // ── Posts needing review ──
  for (const post of plan.posts) {
    const kv = kvDrafts[post.name];
    const status = kv?.status || post.status;
    if (status === 'pending_review' || status === 'pending') {
      const id = `review-${post.name}`;
      todos.push({
        id,
        type: 'review',
        title: `Review: ${post.name.replace(/_/g, ' ')} [${post.type}]`,
        postName: post.name,
        postLabel: post.name.replace(/_/g, ' '),
        priority: 'high',
        emoji: '🔍'
      });
      if (!postMap[post.name]) postMap[post.name] = [];
      postMap[post.name].push(id);
    }
  }

  // ── Comments awaiting regen ──
  for (const name of draftNames) {
    const kv = kvDrafts[name];
    if (kv?.status === 'needs_revision' && kv?.comments?.length) {
      const id = `regen-${name}`;
      todos.push({
        id,
        type: 'regen',
        title: `Regenerate: ${name.replace(/_/g, ' ')}`,
        postName: name,
        postLabel: name.replace(/_/g, ' '),
        commandHint: `node regen.js ${name}`,
        priority: 'high',
        emoji: '💬'
      });
      if (!postMap[name]) postMap[name] = [];
      postMap[name].push(id);
    }
  }

  // ── Info needed from Jany ──
  const janyTasks = plan.info_needed?.filter(i => i.from === 'Jany') || [];
  for (const task of janyTasks) {
    const id = `jany-${task.for.replace(/\s+/g, '-')}`;
    const relatedPost = task.for.split(' ')[0]; // extract post name from "for"
    todos.push({
      id,
      type: 'jany-input',
      title: task.what,
      for: task.for,
      priority: 'medium',
      emoji: '📋'
    });
  }

  // ── Highlighted posts ready to publish ──
  const readyToPost = [];
  for (const post of plan.posts) {
    const kv = kvDrafts[post.name];
    const status = kv?.status || post.status;
    if (status === 'approved' && !post.blocker) {
      readyToPost.push(post.name);
    }
  }
  if (readyToPost.length) {
    const id = `ready-to-post`;
    todos.push({
      id,
      type: 'ready',
      title: `Ready to post: ${readyToPost.length} drafts approved`,
      postNames: readyToPost,
      priority: 'medium',
      emoji: '🚀'
    });
  }

  // ── Highlight blockers ──
  const blockedHighlights = plan.highlights.filter(h => h.status === 'blocked');
  for (const h of blockedHighlights) {
    const id = `highlight-${h.name}`;
    todos.push({
      id,
      type: 'highlight-blocked',
      title: `${h.name} Highlight: ${h.blocker}`,
      highlightName: h.name,
      priority: 'medium',
      emoji: '🔒'
    });
  }

  // ── Upcoming camps (informational) ──
  const upcoming = plan.upcoming_camps.filter(c => new Date(c.date) >= new Date());
  for (const camp of upcoming) {
    const days = Math.ceil((new Date(camp.date) - new Date()) / 86400000);
    const id = `camp-${camp.name.replace(/\s+/g, '-')}`;
    todos.push({
      id,
      type: 'camp',
      title: `📅 ${camp.name} with ${camp.coach}`,
      camp: camp.name,
      location: camp.location,
      date: camp.date,
      daysUntil: days,
      priority: 'low',
      emoji: '📅'
    });
  }

  return { todos, postMap };
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n📋 Rockbusters Daily Agent\n');

  const todo = await buildTodo();

  // Write locally
  fs.writeFileSync(path.join(__dirname, 'todo.md'), todo);
  console.log('✓ todo.md written');

  // Generate structured todos
  const { todos, postMap } = await buildStructuredTodos();

  // Store in KV for Vercel app
  await kvSet('todo:latest', {
    content: todo,
    generated_at: new Date().toISOString()
  });
  console.log('✓ Stored markdown todo in KV');

  // Store structured todos
  await kvSet('todos:structured', {
    todos,
    postMap,
    generated_at: new Date().toISOString()
  });
  console.log('✓ Stored structured todos in KV');

  console.log('\n' + todo);
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
