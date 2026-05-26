#!/usr/bin/env node
/**
 * regen.js — Regenerate drafts that have revision comments
 *
 * Workflow:
 *   1. Reads all drafts with status=needs_revision from KV (or local drafts/)
 *   2. Finds the matching job in content-manager.js JOBS array
 *   3. Injects revision comments into the job brief as hard constraints
 *   4. Regenerates the draft via content-manager.js
 *   5. Pushes the new version via push-drafts.js
 *
 * Usage:
 *   node regen.js                    — regenerate all needs_revision drafts
 *   node regen.js anna_story_post    — regenerate one specific draft by name
 *   node regen.js --dry-run          — list what would be regenerated, don't run
 */

require('dotenv').config({ override: true });
const fs = require('fs');
const path = require('path');
const { execSync, spawnSync } = require('child_process');

const BASE_DIR = __dirname;
const DRAFTS_DIR = path.join(BASE_DIR, 'drafts');

// ─── KV helpers (same as push-drafts.js) ──────────────────────────────────────

const kvUrl   = () => process.env.KV_REST_API_URL;
const kvToken = () => process.env.KV_REST_API_TOKEN;

async function kvGet(key) {
  const res = await fetch(`${kvUrl()}/get/${encodeURIComponent(key)}`, {
    headers: { Authorization: `Bearer ${kvToken()}` }
  });
  const json = await res.json();
  if (!json.result) return null;
  return typeof json.result === 'string' ? JSON.parse(json.result) : json.result;
}

async function kvSmembers(key) {
  const res = await fetch(`${kvUrl()}/smembers/${encodeURIComponent(key)}`, {
    headers: { Authorization: `Bearer ${kvToken()}` }
  });
  const json = await res.json();
  return json.result || [];
}

// ─── Load JOBS from content-manager ───────────────────────────────────────────

function loadJobs() {
  // We eval the JOBS array from content-manager.js by requiring it
  // content-manager.js doesn't export anything, so we extract JOBS via regex
  const src = fs.readFileSync(path.join(BASE_DIR, 'content-manager.js'), 'utf8');
  // Find the JOBS = [...] block — use a robust extraction
  const match = src.match(/const JOBS\s*=\s*(\[[\s\S]*?\n\])/);
  if (!match) {
    console.error('Could not extract JOBS from content-manager.js');
    return [];
  }
  try {
    return eval(match[1]); // safe — it's our own file
  } catch (e) {
    console.error('Could not parse JOBS:', e.message);
    return [];
  }
}

// ─── Get needs_revision drafts ─────────────────────────────────────────────────

async function getNeedsRevisionDrafts(specificName) {
  const results = [];

  if (specificName) {
    // Single draft from KV
    const draft = await kvGet(`draft:${specificName}`);
    if (!draft) {
      // Fall back to local file
      const localPath = path.join(DRAFTS_DIR, `${specificName}.json`);
      if (fs.existsSync(localPath)) {
        const d = JSON.parse(fs.readFileSync(localPath, 'utf8'));
        results.push(d);
      } else {
        console.error(`Draft "${specificName}" not found in KV or local drafts/`);
      }
    } else {
      results.push(draft);
    }
    return results;
  }

  // All needs_revision drafts from KV
  let names = await kvSmembers('drafts:list');
  // Normalize names (handle legacy ["name"] format)
  names = names.map(n => {
    if (Array.isArray(n)) return n[0];
    if (typeof n === 'string') {
      try {
        const p = JSON.parse(n);
        if (Array.isArray(p)) return p[0];
      } catch {}
    }
    return n;
  }).filter(Boolean);

  for (const name of names) {
    const draft = await kvGet(`draft:${name}`);
    if (!draft) continue;
    if (draft._meta?.status === 'needs_revision') {
      results.push(draft);
    }
  }

  // Also check local drafts/ folder
  if (fs.existsSync(DRAFTS_DIR)) {
    const localFiles = fs.readdirSync(DRAFTS_DIR).filter(f => f.endsWith('.json'));
    for (const file of localFiles) {
      const name = file.replace('.json', '');
      if (results.find(d => d.name === name)) continue; // already got from KV
      try {
        const d = JSON.parse(fs.readFileSync(path.join(DRAFTS_DIR, file), 'utf8'));
        if (d._meta?.status === 'needs_revision') results.push(d);
      } catch {}
    }
  }

  return results;
}

// ─── Build revision brief ─────────────────────────────────────────────────────

function buildRevisionBrief(job, existingDraft) {
  const comments = existingDraft._meta?.comments || [];

  // Filter out the auto-generated warning comments (start with ⚠️ or similar system notes)
  const humanComments = comments.filter(c =>
    !c.text.startsWith('⚠️') && !c.text.startsWith('Note:') && !c.text.startsWith('TODO:')
  );

  if (!humanComments.length) return job.brief; // no revision comments — use original brief

  const revisionNote = `

## REVISION INSTRUCTIONS (must follow exactly)

This is a revised version — v${(existingDraft._meta?.version || 1) + 1}.
The previous version was rejected. Here is the feedback:

${humanComments.map((c, i) => `${i + 1}. "${c.text}" (${new Date(c.at).toLocaleDateString()})`).join('\n')}

You MUST address every point above. Do not repeat the previous version.
If photos are mentioned as wrong, pick completely different ones.
If text is mentioned as wrong, write completely from scratch.`;

  return job.brief + revisionNote;
}

// ─── Run one regeneration ─────────────────────────────────────────────────────

function regenerate(jobName, revisedBrief) {
  console.log(`\n  📝 Writing revised brief to temp file...`);

  // Write a temp override file that content-manager.js can read
  const overrideFile = path.join(BASE_DIR, '.regen_override.json');
  fs.writeFileSync(overrideFile, JSON.stringify({
    name: jobName,
    brief_suffix: revisedBrief
  }));

  console.log(`  🏔️  Running content-manager.js --job ${jobName}...`);
  const result = spawnSync('node', [
    path.join(BASE_DIR, 'content-manager.js'),
    '--job', jobName,
    '--regen'  // signals content-manager to read .regen_override.json
  ], {
    stdio: 'inherit',
    cwd: BASE_DIR,
    env: { ...process.env }
  });

  // Clean up
  if (fs.existsSync(overrideFile)) fs.unlinkSync(overrideFile);

  if (result.status !== 0) {
    throw new Error(`content-manager.js exited with code ${result.status}`);
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const specificName = args.find(a => !a.startsWith('--'));

  if (!kvUrl() || !kvToken()) {
    console.error('\n❌ Missing KV credentials. Check your .env file.\n');
    process.exit(1);
  }

  console.log('\n🔄  Rockbusters Regen — revision processor');
  if (dryRun) console.log('   (DRY RUN — nothing will be regenerated)\n');

  const drafts = await getNeedsRevisionDrafts(specificName);

  if (!drafts.length) {
    console.log('\n  ✅ No drafts need revision right now.\n');
    return;
  }

  const jobs = loadJobs();
  console.log(`\n  Found ${drafts.length} draft(s) to regenerate:\n`);

  const toRegen = [];
  for (const draft of drafts) {
    const name = draft.name;
    const comments = (draft._meta?.comments || [])
      .filter(c => !c.text.startsWith('⚠️'))
      .map(c => `  • "${c.text}"`)
      .join('\n');

    const job = jobs.find(j => j.name === name);
    if (!job) {
      console.log(`  ⚠️  ${name} — no matching job in content-manager.js (skipping)`);
      console.log(`      Add a job named "${name}" to content-manager.js first.\n`);
      continue;
    }

    console.log(`  📋 ${name}  (v${draft._meta?.version || 1} → v${(draft._meta?.version || 1) + 1})`);
    if (comments) {
      console.log(`     Revision feedback:`);
      console.log(comments);
    } else {
      console.log(`     (no human comments — will regenerate fresh with original brief)`);
    }
    console.log('');
    toRegen.push({ draft, job });
  }

  if (!toRegen.length) {
    console.log('\n  Nothing to regenerate.\n');
    return;
  }

  if (dryRun) {
    console.log('\n  (dry run — stopping here)\n');
    return;
  }

  // Confirm unless specificName was passed (single draft = intentional)
  if (!specificName && toRegen.length > 1) {
    console.log(`  About to regenerate ${toRegen.length} drafts. Press Ctrl+C to cancel, Enter to continue...`);
    await new Promise(r => {
      process.stdin.once('data', r);
      process.stdin.resume();
    });
    process.stdin.pause();
  }

  const results = [];
  for (const { draft, job } of toRegen) {
    console.log(`\n${'─'.repeat(52)}`);
    console.log(`  🎯 Regenerating: ${job.name}`);
    console.log(`${'─'.repeat(52)}`);
    try {
      const revisedBrief = buildRevisionBrief(job, draft);
      regenerate(job.name, revisedBrief);
      results.push({ name: job.name, status: 'ok' });
    } catch (err) {
      console.error(`\n  ❌ Failed: ${err.message}`);
      results.push({ name: job.name, status: 'error', error: err.message });
    }
  }

  const ok = results.filter(r => r.status === 'ok').length;
  console.log(`\n${'─'.repeat(52)}`);
  console.log(`  ✅ ${ok}/${results.length} drafts regenerated`);

  if (ok > 0) {
    console.log(`\n  Pushing updated drafts to Vercel...`);
    const push = spawnSync('node', [path.join(BASE_DIR, 'push-drafts.js')], {
      stdio: 'inherit',
      cwd: BASE_DIR,
      env: { ...process.env }
    });
    if (push.status === 0) {
      console.log(`\n  🚀 Done! Open the review app to see the updated drafts.\n`);
    } else {
      console.log(`\n  ⚠️  Push step failed — run node push-drafts.js manually.\n`);
    }
  }
  console.log(`${'─'.repeat(52)}\n`);
}

main().catch(err => {
  console.error('\n❌ Unexpected error:', err.message);
  process.exit(1);
});
