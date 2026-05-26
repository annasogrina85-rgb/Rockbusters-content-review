#!/usr/bin/env node
/**
 * Rockbusters Content Manager
 * Autonomous content generation with visual + text sub-agents
 *
 * Usage:
 *   node content-manager.js                         — generate all pending drafts
 *   node content-manager.js --job a_muerte_camp     — generate one specific job
 *   node content-manager.js --type carousel         — generate all carousel jobs
 *   node content-manager.js --list                  — list available jobs without generating
 */

require('dotenv').config({ override: true });
const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');
const Anthropic = require('@anthropic-ai/sdk');

const apiKey = process.env.ANTHROPIC_API_KEY;
if (!apiKey || apiKey === 'your_api_key_here') {
  console.error('\n❌ No API key found.\n   Add your key to .env:\n   ANTHROPIC_API_KEY=sk-ant-...\n   Get one at: https://console.anthropic.com/settings/keys\n');
  process.exit(1);
}
const client = new Anthropic({ apiKey });

const BASE_DIR = __dirname;
const DRAFTS_DIR = path.join(BASE_DIR, 'drafts');
const FEEDBACK_FILE = path.join(BASE_DIR, 'feedback.json');

// ─── Tone of Voice System Prompt (prompt-cached) ─────────────────────────────

const TONE_SYSTEM_PROMPT = `You are the content writer for Rockbusters Climbing — a climbing camp company run by Jany (Jan Novotny), based in Rodellar, Spain. Coaches include Klemen Becan, Petra Pivonkova, Laszlo Juhasz, and Arturo Aparicio.

## Brand voice

Write like a real climber, not a marketing team. The rules:

- Short sentences. Fragments are fine.
- Specific over generic — name the route, the grade, the moment, the person
- Honest about fear and failure before the breakthrough
- No manufactured inspiration
- Real emotions, understated
- Use "we" not "our community" or "our clients"

## What NOT to write

Never use: "embark on a journey", "transform", "incredible", "amazing", "are you ready", exclamation marks (unless quoting someone), emojis, more than 12 hashtags, corporate phrases.

## Structural pattern for captions

1. Sharp scene-setter — drop the reader in
2. Specific detail (route name, grade, the exact moment)
3. The doubt or the struggle
4. The turn
5. The simple truth
6. One-line CTA (next camp, link in bio) — only if relevant
7. Hashtags

## Caption examples (reference these for voice, rhythm, length)

EXAMPLE 1 — quote_card (participant story):
"I was the weakest climber in the group.

Everyone was climbing 7s. I was working on 6c.

When I arrived in Rodellar, I walked up to the crag and looked at the routes — all overhangs, all power, nothing like what I usually climb. I always avoided these kinds of routes; I thought I was too weak for them and never tried them.

I was terrified. Day one, I nearly cried on a 6c+ because of the tricky, mental bolting at the top. It was also a roof, and I couldn't make myself climb it.

Jany made me take a few falls, and I felt much more confident afterward.

By the end of the week, I was projecting a 7a \"Billy a rapido\". A long, powerful overhang with big moves. Four attempts. I was one move away from sending it.

I didn't send it, but I was so happy I couldn't stop smiling.

You never know your limits till you try.

@rockbusters | Rodellar — Mind & Technique camp, May 2026"

EXAMPLE 2 — quote_card (coaching moment):
"She was on the wall. Two bolts from her high point. Pumped, scared, ready to come down.

He said it once.

She climbed two more quickdraws.

That's coaching. That's Rodellar.

Link in bio for next camp dates.

#rodellar #rockbusters #climbingcamp #sportclimbing #coaching #mindset #climbinglife #pushinglimits"

EXAMPLE 3 — carousel caption:
"Two weeks. Two coaches. One mountain village in the middle of Aragón.

The Mind & Technique camp in Rodellar isn't designed to be comfortable. It's designed to show you what you're actually capable of.

Klemen Becan on movement and technique. Jany on the mental side — the part where you want to go down, and he says: \"If you can talk, you can climb.\"

One participant came in climbing 6c. Left one move away from her first 7a.

On powerful, overhanging routes she'd never tried before. In a style she thought wasn't hers.

That's Rodellar. That's what happens when you stop managing your limits and start testing them.

Next Rodellar camp: A MUERTE with Patxi Usobiaga, May 25.
Link in bio.

#rodellar #rockbusters #climbingcamp #sportclimbing #klemen #mindandtechnique #sendit #climbinglife #rockclimbing #pushinglimits"

## Post type schemas

carousel — 5 slides: cover + 4 content slides
  cover: eyebrow (location/date), headline (punchy, 2-4 words), subline (coaches/subtitle)
  content slides: label (the theme), headline (optional), body (2-4 lines)
  Last slide is often a quote from a coach or participant

quote_card — one powerful quote (max 2 lines), attribution, short context line

highlight_cover — title (1 word or 2), subtitle (one sharp line)

story_frame — first-person, 200-350 words, specific, personal`;

// ─── Feedback ─────────────────────────────────────────────────────────────────

function loadFeedback() {
  if (!fs.existsSync(FEEDBACK_FILE)) return { approved: [], rejected: [], comments: [] };
  try { return JSON.parse(fs.readFileSync(FEEDBACK_FILE, 'utf8')); }
  catch { return { approved: [], rejected: [], comments: [] }; }
}

function buildFeedbackContext(feedback) {
  if (!feedback.comments || !feedback.comments.length) return '';
  const recent = feedback.comments.slice(-8);
  return `\n\n## Anna's feedback on recent drafts (learn from this)\n\n` +
    recent.map(f => `- Post "${f.post}": "${f.comment}"`).join('\n');
}

// ─── Image resizing ───────────────────────────────────────────────────────────

const MAX_BYTES = 1.5 * 1024 * 1024; // 1.5MB — resize aggressively to keep multi-image requests under 20MB

function loadImageForVision(filePath) {
  const data = fs.readFileSync(filePath);
  if (data.length <= MAX_BYTES) return data;

  // Too large — resize to max 900px wide/tall using macOS sips (no extra deps)
  const tmp = path.join(os.tmpdir(), `rb_${Date.now()}_${path.basename(filePath)}`);
  try {
    execSync(`sips -Z 900 "${filePath}" --out "${tmp}" 2>/dev/null`);
    const resized = fs.readFileSync(tmp);
    return resized;
  } finally {
    if (fs.existsSync(tmp)) fs.unlinkSync(tmp);
  }
}

// ─── Visual Sub-Agent ─────────────────────────────────────────────────────────

async function analyzePhotos(folder, brief, maxSample = 20) {
  console.log(`\n  📸 Visual agent analyzing ${folder}...`);

  const folderPath = path.join(BASE_DIR, folder);
  if (!fs.existsSync(folderPath)) throw new Error(`Folder not found: ${folder}`);

  const allFiles = fs.readdirSync(folderPath)
    .filter(f => /\.(jpe?g|png)$/i.test(f))
    .sort();

  if (!allFiles.length) throw new Error(`No photos in ${folder}`);

  // Sort by file size desc → top 40% (sharpest/most detailed) → random sample N
  const withSize = allFiles.map(f => ({
    f,
    size: fs.statSync(path.join(folderPath, f)).size
  }));
  const top40 = withSize
    .sort((a, b) => b.size - a.size)
    .slice(0, Math.ceil(withSize.length * 0.4))
    .map(x => x.f);
  const sampled = top40
    .map(f => ({ f, r: Math.random() }))
    .sort((a, b) => a.r - b.r)
    .slice(0, maxSample)
    .map(x => x.f);

  console.log(`     ${allFiles.length} photos → top 40% by size (${top40.length}) → sampling ${sampled.length}`);

  // Build the vision message: alternating filename text + image
  const contentBlocks = [];

  for (const filename of sampled) {
    const filePath = path.join(folderPath, filename);
    const data = loadImageForVision(filePath);
    const base64 = data.toString('base64');
    const mediaType = filename.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg';

    contentBlocks.push({ type: 'text', text: `[${folder}/${filename}]` });
    contentBlocks.push({
      type: 'image',
      source: { type: 'base64', media_type: mediaType, data: base64 }
    });
  }

  contentBlocks.push({
    type: 'text',
    text: `Brief for these photos:\n${brief}\n\nScore each photo 1–10 across:
- visual_quality: sharpness, exposure, framing
- instagram_impact: would stop someone mid-scroll
- subject_clarity: clear subject, not cluttered
- emotion: energy, story, feeling

Return a JSON array of the TOP 5 photos sorted by overall score descending.
Each entry:
{
  "path": "folder/filename.jpg",
  "overall": 8.5,
  "visual_quality": 9,
  "instagram_impact": 8,
  "subject_clarity": 8,
  "emotion": 9,
  "description": "One sentence on what makes this work",
  "best_for": "which slide/use this fits"
}

Return only valid JSON — no preamble, no explanation.`
  });

  const response = await client.messages.create({
    model: 'claude-opus-4-7',
    max_tokens: 2000,
    messages: [{ role: 'user', content: contentBlocks }]
  });

  const raw = response.content.find(b => b.type === 'text')?.text?.trim() || '';
  const match = raw.match(/\[[\s\S]*\]/);
  if (!match) throw new Error(`Visual agent returned non-JSON:\n${raw.slice(0, 300)}`);

  const results = JSON.parse(match[0]);
  console.log(`     → Top picks: ${results.map(r => path.basename(r.path)).join(', ')}`);
  return results;
}

// ─── Text Sub-Agent ───────────────────────────────────────────────────────────

async function generatePostContent(job, topPhotos, feedback) {
  console.log(`\n  ✍️  Text agent writing ${job.type}...`);

  const feedbackNote = buildFeedbackContext(feedback);

  const prompt = `Write a ${job.type} Instagram post for Rockbusters.

## Brief
${job.brief}

## Photos selected by visual agent
${topPhotos.map((p, i) => `${i + 1}. ${p.path}\n   ${p.description} (score: ${p.overall}, best for: ${p.best_for})`).join('\n')}
${feedbackNote}

Use these photos for the post. Assign each photo to the slot that makes most sense given the description and score.

Return the complete post as JSON. Schema for ${job.type}:

${SCHEMAS[job.type]}

Return only valid JSON — no preamble, no explanation.`;

  const response = await client.messages.create({
    model: 'claude-opus-4-7',
    max_tokens: 4000,
    thinking: { type: 'adaptive' },
    system: [
      {
        type: 'text',
        text: TONE_SYSTEM_PROMPT,
        cache_control: { type: 'ephemeral' }
      }
    ],
    messages: [{ role: 'user', content: prompt }]
  });

  const textBlock = response.content.find(b => b.type === 'text');
  if (!textBlock) throw new Error('Text agent returned no text block');

  const raw = textBlock.text.trim();
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) throw new Error(`Text agent returned non-JSON:\n${raw.slice(0, 300)}`);

  const result = JSON.parse(match[0]);
  result.name = job.name; // ensure name matches job
  console.log(`     → Done`);
  return result;
}

// ─── Post schemas ─────────────────────────────────────────────────────────────

const SCHEMAS = {
  carousel: `{
  "type": "carousel",
  "name": "string — use the job name",
  "caption": "full Instagram caption with hashtags",
  "slides": [
    { "type": "cover", "photo": "photos/...", "eyebrow": "Location · Month Year", "headline": "2–4 punchy words", "subline": "Coach names or subtitle" },
    { "photo": "photos/...", "label": "The theme", "headline": "Optional headline", "body": "2–4 lines" },
    { "photo": "photos/...", "label": "The theme", "headline": "Optional", "body": "2–4 lines" },
    { "photo": "photos/...", "label": "The theme", "headline": "Optional", "body": "2–4 lines" },
    { "photo": "photos/...", "label": "The theme", "body": "\"A quote from someone\"" }
  ]
}`,
  quote_card: `{
  "type": "quote_card",
  "name": "string — use the job name",
  "photo": "photos/...",
  "quote": "The quote — max 2 lines",
  "attribution": "First name",
  "context": "Location, Year",
  "caption": "full Instagram caption with hashtags"
}`,
  highlight_cover: `{
  "type": "highlight_cover",
  "name": "string — use the job name",
  "photo": "photos/...",
  "title": "1–2 words",
  "subtitle": "One sharp line",
  "caption": "short Instagram caption with hashtags"
}`,
  story_frame: `{
  "type": "story_frame",
  "name": "string — use the job name",
  "photo": "photos/...",
  "eyebrow": "location · date",
  "headline": "2–5 words",
  "caption": "first-person story, 200–350 words, with hashtags"
}`
};

// ─── Jobs ─────────────────────────────────────────────────────────────────────
// Add new content ideas here. The agents handle the rest.

const JOBS = [
  {
    name: 'participant_breakthrough',
    type: 'quote_card',
    folder: 'photos/jany/2026_may_klemen',
    brief: `A quote card about a participant breakthrough at the May 2026 Mind & Technique camp.
The quote should feel real and earned — about crossing a mental or physical barrier.
Could be a quote from Jany (coach) to a struggling climber, or a participant's own reflection.
Photo: we want someone on the wall — focused, in the middle of a hard move, or just sent something difficult. Real moment, not posed.`,
  },
  {
    name: 'anna_story_post',
    type: 'quote_card',
    folder: 'photos/jany/2026_may_klemen',
    brief: `A personal story post about Anna's experience at the Rockbusters Mind & Technique camp, Rodellar, May 2026.

USE ANNA'S EXACT WORDS from the tone guide example (the Billy a Rapido story). This is her real story — don't add fabricated details or change the narrative. Keep it exactly as she wrote it.

Photo: Pick a woman climbing on powerful, overhanging rock. Someone in the middle of a hard move — focused, not posing. Not a staged shot.

Attribution: Anna
Context: Mind & Technique camp · Rodellar, May 2026

Note: This post requires Anna's consent before publishing.`,
  },
  {
    name: 'highlight_coaches',
    type: 'highlight_cover',
    folder: 'photos/jany/2026_may_klemen',
    brief: `Instagram Highlight cover for "Coaches". This will be pinned on the Rockbusters profile.
Need a strong, clean photo — ideally a coach (Jany or Klemen) coaching, watching a climber, or belaying.
Title: "Coaches"
Subtitle: one sharp line about what they bring — expertise, honesty, experience.
Not "meet the team" energy — more like: this person will show you something you didn't know about yourself.`,
  },
  {
    name: 'highlight_destinations',
    type: 'highlight_cover',
    folder: 'photos/jany/sella_2024_fall',
    brief: `Instagram Highlight cover for "Destinations" — showcasing the climbing areas Rockbusters runs camps at.
Sella, Rodellar, Siurana, Margalef, Frankenjura, Ceuse — Europe's best limestone.
Need a dramatic, beautiful photo: big wall, dramatic light, climber small against the rock to show scale.
Title: "Destinations"
Subtitle: one line about the range of places — not a list, a feeling.`,
  },
  {
    name: 'highlight_upcoming',
    type: 'highlight_cover',
    folder: 'photos/jany/2026_may_klemen',
    brief: `Instagram Highlight cover for "Upcoming" — showing what's coming next.
Rockbusters has camps running through the summer and into fall — Rodellar, Mallorca, Dolomites, Germany, and more.
Photo: something with energy, action, forward momentum — a climber going up, committing to a move.
Title: "Upcoming"
Subtitle: "Rodellar · Mallorca · Dolomites · more"`,
  },
  {
    name: 'highlight_community',
    type: 'highlight_cover',
    folder: 'photos/jany/2026_may_klemen',
    brief: `Instagram Highlight cover for "People" — the community of climbers who come to Rockbusters camps.
Look for a group shot, or multiple people at the crag, or someone celebrating a send with others around.
The feeling is: real people, real friendships, real shared experience.
Title: "People"
Subtitle: "climbers from all over"`,
  },
  {
    name: 'highlight_rodellar',
    type: 'highlight_cover',
    folder: 'photos/jany/rodellar_2025',
    maxPhotos: 10,
    brief: `Instagram Highlight cover for "Rodellar" — the place itself.
Rodellar is a tiny village in Aragón, Spain — dramatic canyon, world-class overhanging limestone, bird song.
Need a landscape or crag shot that captures the scale and beauty of the place.
Title: "Rodellar"
Subtitle: "the best rock in Spain"`,
  },

  // ── New June 2026 camps ───────────────────────────────────────────────────

  {
    name: 'highlight_story',
    type: 'highlight_cover',
    folder: 'photos/jany/rodellar_2025',
    maxPhotos: 10,
    brief: `Instagram Highlight cover for "Story" — the founding story of Rockbusters.

THE REAL STORY (use this):
Jan "Jany" Novotny founded Rockbusters because he was unhappy with how climbing instruction worked — rigid, joyless, detached from the actual culture of climbing. He wanted something different: professional coaching combined with the real outdoor lifestyle — community, laughter, authentic experience.

The company motto says it all: "Climb. Hard. Eat. Sleep. Climb."

Jany's coaching is hands-on and sometimes tough love — stripping away ego and complicated beta to focus on movement and mental discipline. What started as exploratory holiday tours through Europe's best rock has grown into an international coaching brand. He regularly collaborates with elite climbers (Patxi Usobiaga, Klemen Becan) to help everyday climbers push beyond what they think is possible.

Rodellar was and remains the home base — overhanging limestone in a gorge, a tiny village, nowhere to hide from the climbing.

Need a photo that captures that founding spirit: raw limestone, a climber committed to a hard move, or the gorge at golden hour.
Title: "Story"
Subtitle: one line — poetic, true, not marketing. Something about why this place and this project exist.`,
  },

  {
    name: 'petra_intro',
    type: 'carousel',
    folder: 'photos/jany/rodellar_2025',
    maxPhotos: 12,
    brief: `Introduction carousel for Petra Pivonkova joining as coach, and announcement that A MUERTE returns in October with Petra & Jany.

Context: the May A MUERTE camp with Patxi was cancelled due to low numbers. A MUERTE is back in October (24-31) with Petra Pivonkova and Jany as coaches. Rodellar limestone, same intensity, new coaching duo.

Slides needed:
1. Cover: bold, simple — "MEET PETRA" or "A MUERTE · OCTOBER" or both
2. Who Petra is — coach, climber, what she brings
3. What A MUERTE means — the camp philosophy, the limestone, the commitment
4. Rodellar in October — autumn light, world-class rock, perfect conditions
5. Call to action — "October 24–31. Rodellar. Limited spots."

Pick photos that feel powerful and committed — steep routes, dynamic moves, climbers who look like they mean it. Real moments, not posed.
Caption: 200-300 words. Real voice. No hype. Tell the story of why October at Rodellar with Petra is worth it.`,
  },

  {
    name: 'sport_basics_announcement',
    type: 'carousel',
    folder: 'photos/jany/selection',
    maxPhotos: 15,
    brief: `Camp announcement for Sport Climbing Basics in Frankenjura, Germany, June 6-13 2026.
Coaches: Laszlo & Petra. Level: complete beginners to first outdoor experience.

This camp is for people who have been climbing indoors and want to try real rock for the first time, or who want to build proper technique from scratch. Frankenjura is perfect — compact, beautiful sandstone, approachable grades, great for learning.

Slides needed:
1. Cover: "YOUR FIRST OUTDOOR LEAD" or similar — make beginners feel seen, not intimidated
2. What you'll actually do — specific: lead climbing, route reading, belaying outdoors
3. The place — Frankenjura, why it's perfect for beginners
4. The coaches — Laszlo & Petra (use coach photos if available, otherwise a coaching moment)
5. Practical info + CTA — dates (Jun 6-13), link to book

Pick photos that show real people climbing — not just experts. Someone figuring out a move, a coach explaining something, a group having fun. Frankenjura photos preferred.
Caption: 200-250 words. Speak directly to someone who is scared of making the leap to outdoor climbing.`,
  },

  {
    name: 'youth_camp_announcement',
    type: 'carousel',
    folder: 'photos/jany/2026_may_klemen',
    maxPhotos: 10,
    brief: `Camp announcement for Summer Youth Rock Lab — 2 sessions: Jul 4-18 and Jul 18-Aug 1, location: Cavallers, Spain.
This is a youth climbing camp for kids and teenagers who love climbing and want a proper outdoor experience.

Slides needed:
1. Cover: "SUMMER YOUTH ROCK LAB" — energetic, fun, summer vibes
2. What the camp offers — skill development, outdoor rock, real coaching
3. The place — Cavallers, Spain — mountain setting, beautiful crag
4. Community — climbing with other young climbers, making friends
5. Dates + CTA — Session 1: Jul 4-18 / Session 2: Jul 18-Aug 1

Pick photos that show energy, youth, fun — climbing with joy, not with grimaced effort. Look for group moments, smiling climbers, people figuring things out together.
Caption: 200 words, speak to both parents AND the kids themselves. Two audiences.`,
  },

  {
    name: 'deep_blue_announcement',
    type: 'carousel',
    folder: 'photos/jany/mallorca',
    maxPhotos: 15,
    brief: `Camp announcement for DEEP BLUE — psicobloc (deep water soloing) camp in Mallorca, June 6–13, 2026. Coach: Arturo Aparicio. Level: 6a+ and above. Small group.

Psicobloc means climbing above the sea with no rope. You fall into the water. You swim back to the boat. You get back on. No gear, no protection — just movement and commitment. The fear is real. That's the point.

Mallorca's sea cliffs rise straight from turquoise Mediterranean water. Routes from 6a to 8b. June sun. This is what climbing was invented for.

Arturo Aparicio knows every line, every jump, every landing. He will push you exactly as far as you want to go — and maybe a little further.

Slides needed:
1. Cover: "DEEP BLUE" — bold, dramatic. Subline: No rope. Just sea.
2. What psicobloc is — the specific experience: height above water, the commitment, the fall, swimming back
3. The place — Mallorca sea cliffs, turquoise water, routes rising from the sea
4. The coach — Arturo, who he is, why he knows these cliffs
5. Dates + CTA: June 6–13, 2026. 6a+ and above. Small group. rockbusters.net

Look for photos that show climbers HIGH above the water — exposure, sea below, rock face. The more dramatic the height above blue water, the better. Action shots of falling or jumping into the sea also excellent. Avoid anything that looks like regular sport climbing.

Caption: 200-280 words. Make the reader feel the height. Specific, visceral, real.`,
  },

  // ── Story posts ───────────────────────────────────────────────────────────

  {
    name: 'jany_founding_story',
    type: 'story_frame',
    folder: 'photos/jany/rodellar_2025',
    maxPhotos: 10,
    brief: `A story post about how Rockbusters started — told in Jany's voice, first-person.

THE REAL STORY:
Jan "Jany" Novotny founded Rockbusters because he was unhappy with how climbing instruction worked — rigid, joyless, detached from the actual culture of climbing. He wanted something different: professional coaching combined with the real outdoor lifestyle — community, laughter, authentic experience. Not clients. Climbers.

The company motto says it all: "Climb. Hard. Eat. Sleep. Climb."

Jany's coaching is hands-on and sometimes tough love — stripping away ego and complicated beta to focus on movement and mental discipline. What started as exploratory holiday tours through Europe's best rock has grown into an international coaching brand. He collaborates with elite climbers (Patxi Usobiaga, Klemen Becan, Petra Pivonkova) to help everyday climbers push beyond what they think is possible.

Rodellar was and remains the home base — overhanging limestone in a gorge, a tiny village, nowhere to hide from the climbing.

Write this as a first-person story in Jany's voice. Specific, honest, no marketing language. 200-350 words.
The reader should understand WHY this exists — not what it is.
Photo: something that captures the gorge, the commitment, the raw place where it all started.`,
  },

  {
    name: 'rodellar_story',
    type: 'carousel',
    folder: 'photos/jany/rodellar_2025',
    maxPhotos: 12,
    brief: `A story carousel about Rodellar — not a camp announcement, just a portrait of the place.

Rodellar is a tiny village in the Vero gorge in Aragón, Spain. Population: almost nobody. The gorge is dramatic — limestone walls rising hundreds of metres from the canyon floor, a river at the bottom, swifts nesting in the overhangs.

The climbing is world-class: powerful, overhanging routes on featured limestone. Mostly 7s and 8s but enough for strong 6c climbers too. The village has one bar. The approach to most sectors is a 10-minute walk.

What makes it special isn't the grade — it's the feeling. You're in a gorge that has nothing to do with the modern world. The rock demands commitment. There's no gym version of Rodellar.

Slides:
1. Cover — just "RODELLAR" with a single sharp line. The photo should speak.
2. The gorge — describe the physical place: the limestone, the canyon, the scale
3. The climbing — what kinds of routes, what style, what the rock asks of you
4. The life there — the village, the simplicity, what the days actually look like
5. Why it matters — what people leave with. Not a CTA — a truth.

Pick the most dramatic, atmospheric photos — canyon walls, overhangs, climbers small against the rock, early morning or golden hour light. This post should make someone want to go even if they've never heard of it.
Caption: 180-250 words. Make someone feel the gorge.`,
  },

  {
    name: 'camp_week_story',
    type: 'carousel',
    folder: 'photos/jany/2026_may_klemen',
    maxPhotos: 18,
    brief: `A story carousel about what a week at a Rockbusters camp actually feels like — from the inside.

This is not an announcement. It's a window into the experience. Based on the Mind & Technique camp in Rodellar, May 2026, with Klemen Becan and Jany.

What a week looks like:
- Morning: early at the crag before it gets hot. Route reading, warming up on easier routes.
- Coaching: Klemen watching movement, Jany dealing with the mental side. "If you can talk, you can climb."
- Midday: rest, shade, food, talk about the morning's climbs
- Afternoon: back on the wall. Projects. Falls. The moves you couldn't do in the morning.
- Evening: back in the village. Tired in the good way.

By the end of the week: you've done moves you didn't think were yours. You've taken falls you were afraid of. Something has shifted.

Slides:
1. Cover — "ONE WEEK" or just the feeling of it. Should feel like a memory.
2. Morning at the crag — the start of the day, route reading, warming up
3. On the wall — the specific work: a hard move, a coaching moment, commitment
4. The rest — the simplicity of the non-climbing hours
5. The end of the week — what changes. Not dramatic. Just real.

Pick photos that feel like real moments: people focused, not posing. Coaching conversations, someone working a move, a belay stance, a rest in the shade.
Caption: 220-280 words. First-person or third-person — whichever feels more honest.`,
  },

  {
    name: 'psicobloc_story',
    type: 'story_frame',
    folder: 'photos/jany/mallorca',
    maxPhotos: 12,
    brief: `A story post about what psicobloc (deep water soloing) actually feels like — from the inside.

This is not a camp announcement. It's a first-person account of the experience.

What DWS feels like:
- You're on a boat, looking at a sea cliff. The route starts just above the waterline.
- You climb, and the water gets further away. At 5 metres it's fine. At 10 metres your hands start noticing.
- At 15 metres, something changes. The wall, the water below, the decision — everything contracts to one thing: keep moving or stop.
- There's no rope to catch you. No bolt. Just the rock, your hands, and the Mediterranean.
- You fall. The fall takes longer than you expected. The sea hits you.
- You swim back to the boat. You shake out your arms. You look up at the route.
- You get back on.

That's the whole thing. That's why people do it.

Write this as first-person, present tense, visceral. The reader should feel the exposure, the decision, the water below.
200-350 words.

Photo: the most dramatic shot of a climber high above blue water — maximum exposure, the sea clearly visible below.`,
  },

  {
    name: 'dolomites_story',
    type: 'carousel',
    folder: 'photos/jany/dolomity',
    maxPhotos: 12,
    brief: `A story carousel about what it's like to climb the Dolomites — not a camp announcement, a portrait of the place and the experience.

The Dolomites are unlike anywhere else in climbing. Pink limestone towers. UNESCO World Heritage. Villages with espresso at the base of 3000m walls. Via ferratas, sport routes, multi-pitches — all in the same area.

But what makes it different isn't the grades. It's the scale. You clip a bolt and the whole range opens up behind you. The rock turns from grey to gold to pink as the sun moves. You walk to the crag past cows and church bells.

There's a specific feeling to climbing here: the place is so overwhelming that the climbing almost becomes secondary. Almost.

Slides:
1. Cover — "THE DOLOMITES" or just an image that doesn't need words. Use the most dramatic photo available.
2. The scale — what the place looks like: towers, walls, light. Make the reader feel small in a good way.
3. The climbing — sport routes and multi-pitch on pink limestone. What the rock is like. What climbing here asks of you.
4. The life below — the villages, the rifugios, the espresso, the pasta. The Italian life happening at the base of something enormous.
5. What you leave with — not a marketing line. Something true about what this place does to how you think about climbing.

Pick the most dramatic, beautiful photos — pink rock towers at altitude, climbers small against huge walls, Italian alpine light.
Caption: 200-260 words. Make someone add this to their bucket list without asking them to.`,
  },

  {
    name: 'dolce_vita_announcement',
    type: 'carousel',
    folder: 'photos/jany/dolomity',
    maxPhotos: 12,
    brief: `Camp announcement for Dolomite Dolce Vita — climbing camp in the Italian Dolomites with Klemen Becan, June 27 – July 11, 2026. Choose 1 week (Jun 27–Jul 4) or 2 weeks (Jun 27–Jul 11). All levels welcome (5a and above).

The Dolomites are UNESCO World Heritage rock. Pink limestone towers at sunset. Mountain huts with espresso and pasta at the base of 3000m walls. Via ferratas and sport routes. Nowhere else like it.

Klemen Becan is an IFMGA mountain guide with World Cup podiums and two decades on rock. He has been climbing the Dolomites for years — knows the best sectors, the light, the routes.

You come to climb. You leave with something harder to explain.

Slides needed:
1. Cover: "DOLCE VITA" — the headline should feel Italian and inevitable. Subline: limestone, alpine air, Italian life.
2. What psicobloc is the experience: climbing the Dolomites — the specific feeling of being on pink limestone with the Alps around you
3. The place: what makes the Dolomites different — scale, beauty, the villages below the walls
4. The coach: Klemen — who he is, why he's the right person for these mountains
5. Dates + CTA: June 27 – July 11. 1 week or 2. rockbusters.net

Pick the most dramatic, beautiful Dolomites photos — pink rock towers, climbers small against huge walls, alpine light. These photos are from a real Rockbusters Dolomites trip (Dolomiti family climbing holidays folder). Choose images that show both the scale of the landscape and the joy of climbing there.

Caption: 200-280 words. Make someone want to book immediately. Specific, beautiful, real.`,
  },
];

// ─── Draft save / load ─────────────────────────────────────────────────────────

function saveDraft(postConfig) {
  if (!fs.existsSync(DRAFTS_DIR)) fs.mkdirSync(DRAFTS_DIR, { recursive: true });
  const draftPath = path.join(DRAFTS_DIR, `${postConfig.name}.json`);

  // Bump version if draft already exists
  let version = 1;
  if (fs.existsSync(draftPath)) {
    try {
      const existing = JSON.parse(fs.readFileSync(draftPath, 'utf8'));
      version = (existing._meta?.version || 1) + 1;
    } catch {}
  }

  const draft = {
    ...postConfig,
    _meta: {
      generated_at: new Date().toISOString(),
      status: 'pending', // pending | approved | rejected
      version,
      comments: []
    }
  };

  fs.writeFileSync(draftPath, JSON.stringify(draft, null, 2));
  console.log(`\n  💾 Draft saved → drafts/${postConfig.name}.json`);
  return draftPath;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function runJob(job, options = {}) {
  const feedback = loadFeedback();

  // Allow regen.js to inject a revised brief via .regen_override.json
  let effectiveBrief = job.brief;
  const overrideFile = path.join(BASE_DIR, '.regen_override.json');
  if (options.regen && fs.existsSync(overrideFile)) {
    try {
      const override = JSON.parse(fs.readFileSync(overrideFile, 'utf8'));
      if (override.name === job.name && override.brief_suffix) {
        effectiveBrief = override.brief_suffix; // regen.js already prepended original brief
        console.log(`     ↩️  Using revised brief (regen mode)`);
      }
    } catch {}
  }

  const effectiveJob = { ...job, brief: effectiveBrief };

  // 1. Visual agent
  const topPhotos = await analyzePhotos(effectiveJob.folder, effectiveJob.brief, effectiveJob.maxPhotos || 20);

  // 2. Text agent
  const postConfig = await generatePostContent(effectiveJob, topPhotos, feedback);

  // 3. Save draft
  saveDraft(postConfig);

  return postConfig;
}

async function main() {
  const args = process.argv.slice(2);

  if (args.includes('--list')) {
    console.log('\n📋 Available jobs:\n');
    JOBS.forEach(j => console.log(`  ${j.name.padEnd(30)} [${j.type}]  ${j.folder}`));
    console.log('');
    return;
  }

  const jobIdx = args.indexOf('--job');
  const typeIdx = args.indexOf('--type');
  const jobFilter = jobIdx !== -1 ? args[jobIdx + 1] : null;
  const typeFilter = typeIdx !== -1 ? args[typeIdx + 1] : null;
  const isRegen = args.includes('--regen');

  let jobs = JOBS;
  if (jobFilter) jobs = JOBS.filter(j => j.name === jobFilter);
  if (typeFilter) jobs = JOBS.filter(j => j.type === typeFilter);

  if (!jobs.length) {
    console.error('No matching jobs found. Run with --list to see available jobs.');
    process.exit(1);
  }

  console.log('\n🏔️  Rockbusters Content Manager');
  if (isRegen) console.log('   (regen mode — applying revision brief)');
  console.log(`   Running ${jobs.length} job(s)...\n`);

  const results = [];
  for (const job of jobs) {
    console.log(`\n${'─'.repeat(52)}`);
    console.log(`  🎯 ${job.name}  (${job.type})`);
    console.log(`${'─'.repeat(52)}`);
    try {
      const result = await runJob(job, { regen: isRegen });
      results.push({ name: job.name, status: 'ok' });
    } catch (err) {
      console.error(`\n  ❌ Failed: ${err.message}`);
      results.push({ name: job.name, status: 'error', error: err.message });
    }
  }

  const ok = results.filter(r => r.status === 'ok').length;
  console.log(`\n${'─'.repeat(52)}`);
  console.log(`  ✅ ${ok}/${results.length} drafts generated`);
  console.log(`  📬 Open the review UI to approve:`);
  console.log(`     node review-server.js  →  http://localhost:4201`);
  console.log(`${'─'.repeat(52)}\n`);
}

main().catch(err => {
  console.error('\nFatal error:', err.message);
  process.exit(1);
});
