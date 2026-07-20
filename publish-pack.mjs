#!/usr/bin/env node
/**
 * publish-pack.mjs — deliver publish-ready packs to Google Drive.
 *
 * For every APPROVED post in the plan's posting_schedule, copies its branded
 * images (draft.rendered — rendered from the design-system templates) plus a
 * caption.txt into:
 *   Drive: Rockbusters Marketing/06_Ready_To_Post/Scheduled/<date> <post name>/
 *
 * Metricool's Starter plan includes Google Drive integration, so posts are
 * composed there by picking media straight from Drive — no downloading.
 *
 * Usage: node publish-pack.mjs
 * (Render branded images first with the render step if `rendered` is empty.)
 */
import * as dotenv from 'dotenv'; dotenv.config({ override: true });
import fs from 'fs'; import { execFileSync } from 'child_process';

const KV = process.env.KV_REST_API_URL, KT = process.env.KV_REST_API_TOKEN;
const DRIVE = 'rockbusters_drive:Rockbusters Marketing/06_Ready_To_Post/Scheduled';
const kvGet = async k => { let v=(await (await fetch(`${KV}/get/${encodeURIComponent(k)}`,{headers:{Authorization:`Bearer ${KT}`}})).json()).result; while(typeof v==='string'){try{v=JSON.parse(v)}catch{break}} return v; };

const plan = await kvGet('content-plan');
const sched = (plan.posting_schedule||[]).filter(i => i.name && i.name !== 'highlights_setup');
const tmp = '/tmp/_packs'; fs.rmSync(tmp,{recursive:true,force:true}); fs.mkdirSync(tmp,{recursive:true});

for (const item of sched) {
  const d = await kvGet(`draft:${item.name}`);
  if (!d || d._meta?.status !== 'approved') { console.log(`skip ${item.name} (${d?._meta?.status||'missing'})`); continue; }
  if (!Array.isArray(d.rendered) || !d.rendered.length) { console.log(`skip ${item.name} (no branded renders)`); continue; }

  const folder = `${item.date} ${item.name.replace(/_/g,' ')}`;
  const local = `${tmp}/${folder}`; fs.mkdirSync(local,{recursive:true});
  for (const [i,url] of d.rendered.entries()) {
    fs.writeFileSync(`${local}/${String(i+1).padStart(2,'0')}.jpg`, Buffer.from(await (await fetch(url)).arrayBuffer()));
  }
  const isStory = Array.isArray(d.frames) && d.frames.length;
  fs.writeFileSync(`${local}/caption.txt`,
`POST: ${item.name}
DATE: ${item.date} · 10:00 (Europe/Madrid)
FORMAT: ${isStory ? `Instagram STORY — ${d.rendered.length} frames, publish in order` : (d.rendered.length>1 ? `Instagram CAROUSEL — ${d.rendered.length} slides, in order` : 'Instagram single post')}
${item.note ? `NOTE: ${item.note}\n` : ''}
--- CAPTION (copy below this line) ---
${d.caption || ''}
`);
  execFileSync('rclone', ['copy', local, `${DRIVE}/${folder}`], { stdio:'pipe' });
  console.log(`✓ ${folder} — ${d.rendered.length} img + caption`);
}
console.log('\nPacks are in Drive → 06_Ready_To_Post/Scheduled/');
