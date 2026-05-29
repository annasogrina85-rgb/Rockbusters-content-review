import { kv } from '@vercel/kv';
import nodemailer from 'nodemailer';
import { runRegen } from '../_lib/regen.js';
import { findReadyCamps, buildRecap } from '../_lib/recap-build.js';

/**
 * Daily notify endpoint — runs on Vercel Cron (see vercel.json `crons`).
 *
 * Replaces the fragile CCR remote agent for the morning/afternoon email.
 * Reads current KV state (drafts + content-plan), rebuilds the todo,
 * stores it in KV, and emails Anna + Jany.
 *
 * Morning vs afternoon is decided by UTC hour (< 12 = morning).
 *
 * Auth: Vercel Cron sends `Authorization: Bearer <CRON_SECRET>`.
 * Manual trigger: pass ?key=<CRON_SECRET> or the same Bearer header.
 */

const REVIEW_URL   = 'https://rockbusters-content-maker.vercel.app';
const JANY_DOC     = 'https://docs.google.com/document/d/1xgABM6ukVvb0OdwVOTp8N-42xdpfiQdg7W9HbB5DWII/edit';
const DRIVE_FOLDER = 'https://drive.google.com/drive/folders/1zvbmuYWH-k3TMXNxA_N1ZKZCHHBlzDpj';
const ANNA_EMAIL   = 'annasogrina85@gmail.com';
const JANY_EMAIL   = 'jany.rockbusters@gmail.com';

function todayStr() {
  return new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
}

function buildTodo(plan, kvDrafts) {
  const lines = [];
  lines.push(`# Rockbusters · Daily Todo`);
  lines.push(`**${todayStr()}**`);
  lines.push('');

  const upcoming = (plan.upcoming_camps || []).filter(c => !c._note && new Date(c.date) >= new Date());
  if (upcoming.length) {
    lines.push('## 📅 Upcoming camps');
    for (const c of upcoming) {
      const days = Math.ceil((new Date(c.date) - new Date()) / 86400000);
      lines.push(`- **${c.name}** with ${c.coach} — ${c.location}, ${c.date} (in ${days} day${days === 1 ? '' : 's'})`);
    }
    lines.push('');
  }

  const needsReview = [];
  for (const post of (plan.posts || [])) {
    const kvm = kvDrafts[post.name];
    const status = kvm?.status || post.status;
    if (status === 'pending_review' || status === 'pending') needsReview.push({ ...post, kvStatus: status });
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

  const needsRegen = [];
  for (const [name, meta] of Object.entries(kvDrafts)) {
    if (meta?.status === 'needs_revision' && meta?.comments?.length) needsRegen.push({ name, comments: meta.comments });
  }
  if (needsRegen.length) {
    lines.push(`## 💬 Comments added (will regen next morning)`);
    for (const d of needsRegen) {
      lines.push(`- **${d.name.replace(/_/g, ' ')}**:`);
      for (const c of d.comments) lines.push(`  *"${c.text}"*`);
    }
    lines.push('');
  }

  const readyToPost = (plan.posts || []).filter(p => {
    const kvm = kvDrafts[p.name];
    return (kvm?.status === 'approved' || p.status === 'approved') && !p.blocker;
  });
  if (readyToPost.length) {
    lines.push(`## 🚀 Ready to post (${readyToPost.length})`);
    lines.push('');
    for (const p of readyToPost) lines.push(`- **${p.name.replace(/_/g, ' ')}** — post after ${p.publish_after || 'now'}`);
    lines.push('');
  }

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

  return lines.join('\n');
}

function buildStructuredTodos(plan, kvDrafts) {
  const todos = [];
  const postMap = {};
  const push = (t, name) => { todos.push(t); if (name) (postMap[name] = postMap[name] || []).push(t.id); };

  for (const post of (plan.posts || [])) {
    if (post.blocker && post.status !== 'approved') {
      push({ id: `blocker-${post.name}`, type: 'blocker', title: post.blocker, postName: post.name,
        postLabel: post.name.replace(/_/g, ' '), priority: 'high', emoji: '⚠️' }, post.name);
    }
  }
  for (const post of (plan.posts || [])) {
    const kvm = kvDrafts[post.name];
    const status = kvm?.status || post.status;
    if (status === 'pending_review' || status === 'pending') {
      push({ id: `review-${post.name}`, type: 'review', title: `Review: ${post.name.replace(/_/g, ' ')} [${post.type}]`,
        postName: post.name, postLabel: post.name.replace(/_/g, ' '), priority: 'high', emoji: '🔍' }, post.name);
    }
  }
  for (const [name, meta] of Object.entries(kvDrafts)) {
    if (meta?.status === 'needs_revision' && meta?.comments?.length) {
      push({ id: `regen-${name}`, type: 'regen', title: `Regenerate: ${name.replace(/_/g, ' ')}`,
        postName: name, postLabel: name.replace(/_/g, ' '), commandHint: `node regen.js ${name}`,
        priority: 'high', emoji: '💬' }, name);
    }
  }
  for (const task of (plan.info_needed?.filter(i => i.from === 'Jany') || [])) {
    push({ id: `jany-${String(task.for).replace(/\s+/g, '-')}`, type: 'jany-input', title: task.what, for: task.for, priority: 'medium', emoji: '📋' });
  }
  const readyNames = (plan.posts || []).filter(p => {
    const kvm = kvDrafts[p.name];
    return (kvm?.status === 'approved' || p.status === 'approved') && !p.blocker;
  }).map(p => p.name);
  if (readyNames.length) {
    push({ id: 'ready-to-post', type: 'ready', title: `Ready to post: ${readyNames.length} draft${readyNames.length > 1 ? 's' : ''} approved`,
      postNames: readyNames, priority: 'medium', emoji: '🚀' });
  }
  return { todos, postMap };
}

function buildEmail(plan, kvDrafts, { isReminder = false } = {}) {
  const reviewPosts = (plan.posts || []).filter(p => {
    const kvm = kvDrafts[p.name];
    return (kvm?.status === 'pending_review' || kvm?.status === 'pending' || p.status === 'pending_review') && !kvm?.status?.includes('approved');
  });
  const readyPosts = (plan.posts || []).filter(p => {
    const kvm = kvDrafts[p.name];
    return kvm?.status === 'approved' && !p.blocker;
  });
  const needsInfo = plan.info_needed || [];
  const upcoming = (plan.upcoming_camps || []).filter(c => !c._note && new Date(c.date) >= new Date());
  const blockers = (plan.posts || []).filter(p => p.blocker && p.status !== 'approved');

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

// Normalize KV set members (may be plain strings or JSON-encoded arrays)
function normalizeName(n) {
  if (Array.isArray(n)) return n[0];
  if (typeof n === 'string') {
    try { const p = JSON.parse(n); if (Array.isArray(p)) return p[0]; } catch {}
  }
  return n;
}

export default async function handler(req, res) {
  // Auth — Vercel Cron sends `Authorization: Bearer <CRON_SECRET>`
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.authorization || '';
  const keyParam = req.query?.key;
  if (secret && auth !== `Bearer ${secret}` && keyParam !== secret) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    // 1. Process comment-driven regenerations first, so the email reflects fresh content.
    //    Never let a regen failure block the email — it's best-effort.
    let regen = null;
    try {
      regen = await runRegen({ limit: 6 });
    } catch (e) {
      regen = { ran: false, error: e.message };
    }

    // Auto-build recaps for any camp folders marked READY (best-effort).
    let recaps = null;
    try {
      const camps = await findReadyCamps();
      recaps = [];
      for (const c of camps) {
        try { recaps.push({ camp: c, ...(await buildRecap(c)) }); }
        catch (e) { recaps.push({ camp: c, error: e.message }); }
      }
    } catch (e) {
      recaps = { error: e.message };
    }

    const rawNames = await kv.smembers('drafts:list');
    const names = (rawNames || []).map(normalizeName).filter(Boolean);

    const kvDrafts = {};
    for (const name of names) {
      const d = await kv.get(`draft:${name}`);
      const obj = typeof d === 'string' ? JSON.parse(d) : d;
      if (obj) kvDrafts[name] = obj._meta || {};
    }

    let plan = await kv.get('content-plan');
    if (typeof plan === 'string') plan = JSON.parse(plan);
    if (!plan) {
      plan = {
        upcoming_camps: [], highlights: [], info_needed: [],
        posts: Object.keys(kvDrafts).map(n => ({ name: n, type: 'unknown', status: kvDrafts[n]?.status || 'pending' })),
      };
    }

    const todo = buildTodo(plan, kvDrafts);
    const { todos, postMap } = buildStructuredTodos(plan, kvDrafts);

    await kv.set('todo:latest', JSON.stringify({ content: todo, generated_at: new Date().toISOString() }));
    await kv.set('todos:structured', JSON.stringify({ todos, postMap, generated_at: new Date().toISOString() }));

    const hour = new Date().getUTCHours();
    const isMorning = hour < 12;
    const allPending = Object.values(kvDrafts).filter(m => m?.status === 'pending' || m?.status === 'pending_review');
    const isReminder = allPending.length > 3;

    const html = buildEmail(plan, kvDrafts, { isReminder });
    const prefix = isMorning ? '🏔' : '🔄';
    const timeLabel = isMorning ? 'Morning brief' : 'Afternoon update';
    const subject = isReminder
      ? `⏰ [Rockbusters] Reminder: ${allPending.length} drafts waiting`
      : `${prefix} [Rockbusters] ${timeLabel} · ${todayStr()}`;

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: process.env.GMAIL_FROM, pass: process.env.GMAIL_APP_PASSWORD },
    });
    const info = await transporter.sendMail({
      from: `Rockbusters Content Agent <${process.env.GMAIL_FROM}>`,
      to: [ANNA_EMAIL, JANY_EMAIL].join(', '),
      subject,
      html,
    });

    return res.status(200).json({
      ok: true,
      mode: isMorning ? 'morning' : 'afternoon',
      drafts: names.length,
      pending: allPending.length,
      regen,
      recaps,
      accepted: info.accepted,
      rejected: info.rejected,
      messageId: info.messageId,
    });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
}
