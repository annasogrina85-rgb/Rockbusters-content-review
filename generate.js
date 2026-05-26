#!/usr/bin/env node
/**
 * Rockbusters Design Generator
 * Usage:
 *   node generate.js posts/mind_technique_recap.json
 *   node generate.js posts/highlight_camps.json
 *   node generate.js --all   (renders everything in posts/)
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const { execSync, spawnSync } = require('child_process');

const RCLONE = path.join(process.env.HOME, 'bin', 'rclone');
const DRIVE_REMOTE = 'rockbusters_drive'; // rclone remote name
// Base path inside Google Drive — adjust if folder was renamed
const DRIVE_BASE = 'Rockbusters Marketing/02_Events/2026/2026-05-02_Rodellar_Mind_Technique_Klemen_Jany/04_Edited_Content';

// Drive subfolder mapping by post type
const DRIVE_FOLDER_MAP = {
  carousel: 'Carousel_Mind_Technique_Recap',
  quote_card: 'Quote_Cards',
  highlight_cover: 'Highlight_Covers',
  story: 'Stories',
  story_sequence: 'Stories',
};

const TEMPLATES_DIR = path.join(__dirname, 'templates');
const OUTPUT_DIR = path.join(__dirname, 'output');
const POSTS_DIR = path.join(__dirname, 'posts');

// ─── Template rendering ──────────────────────────────────────────────────────

function renderTemplate(templateName, data) {
  const templatePath = path.join(TEMPLATES_DIR, `${templateName}.html`);
  let html = fs.readFileSync(templatePath, 'utf8');

  // Replace {{key}} placeholders
  for (const [key, value] of Object.entries(data)) {
    if (typeof value === 'string') {
      html = html.replaceAll(`{{${key}}}`, value);
    }
  }

  // Handle {{#key}}...{{/key}} conditional blocks
  html = html.replace(/\{\{#(\w+)\}\}([\s\S]*?)\{\{\/\1\}\}/g, (_, key, inner) => {
    return data[key] ? inner.replace(`{{${key}}}`, data[key]) : '';
  });

  // Replace any unreplaced {{placeholders}} with empty string
  html = html.replace(/\{\{[^}]+\}\}/g, '');

  return html;
}

// ─── Photo path resolver ─────────────────────────────────────────────────────

function resolvePhotoPath(photoRef) {
  if (!photoRef) return '';

  // Already an absolute path
  if (path.isAbsolute(photoRef) && fs.existsSync(photoRef)) {
    return `file://${photoRef}`;
  }

  // Relative to design-system folder
  const local = path.join(__dirname, photoRef);
  if (fs.existsSync(local)) return `file://${local}`;

  // Relative to a photos/ subfolder
  const photos = path.join(__dirname, 'photos', photoRef);
  if (fs.existsSync(photos)) return `file://${photos}`;

  // HTTP/HTTPS URL — pass through
  if (photoRef.startsWith('http')) return photoRef;

  // Fallback: dark gradient placeholder
  console.warn(`  ⚠ Photo not found: ${photoRef} — using placeholder`);
  return '';
}

// ─── Slide content builders ──────────────────────────────────────────────────

function buildCarouselContent(slide) {
  if (slide.type === 'cover') {
    return `
      <div class="content">
        ${slide.eyebrow ? `<div class="cover-eyebrow">${slide.eyebrow}</div>` : ''}
        <div class="cover-headline">${slide.headline}</div>
        ${slide.subline ? `<div class="cover-subline">${slide.subline}</div>` : ''}
      </div>`;
  }
  return `
    <div class="content">
      ${slide.label ? `<span class="slide-number">${slide.label}</span>` : ''}
      ${slide.headline ? `<div class="divider"></div><div class="headline">${slide.headline}</div>` : '<div class="divider"></div>'}
      <div class="body-text">${slide.body.replace(/\n/g, '<br>')}</div>
    </div>`;
}

function buildStoryContent(frame) {
  return `
    <div class="content">
      ${frame.eyebrow ? `<div class="eyebrow">${frame.eyebrow}</div>` : ''}
      ${frame.headline ? `<div class="headline">${frame.headline}</div>` : ''}
      ${frame.body ? `<div class="body-text">${frame.body.replace(/\n/g, '<br>')}</div>` : ''}
      ${frame.cta ? `<div class="cta">${frame.cta}</div>` : ''}
    </div>`;
}

// ─── Renderers ───────────────────────────────────────────────────────────────

async function renderSlide(page, html, outputPath, width, height) {
  // Write to a temp file so Playwright loads it as file:// — this allows local images to load
  const tmpFile = outputPath.replace(/\.jpg$/, '_tmp.html');
  fs.writeFileSync(tmpFile, html);
  await page.setViewportSize({ width, height });
  await page.goto(`file://${tmpFile}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(300);
  await page.screenshot({ path: outputPath, type: 'jpeg', quality: 95 });
  fs.unlinkSync(tmpFile);
  console.log(`  ✓ ${path.basename(outputPath)}`);
}

async function generatePost(postConfig, browser) {
  const { type, name, slides, frames, photo, data } = postConfig;
  const outDir = path.join(OUTPUT_DIR, name);
  fs.mkdirSync(outDir, { recursive: true });

  const page = await browser.newPage();

  try {
    if (type === 'carousel') {
      const total = slides.length;
      for (let i = 0; i < slides.length; i++) {
        const slide = slides[i];
        const photoPath = resolvePhotoPath(slide.photo || photo);
        const isFirst = i === 0;
        const html = renderTemplate('carousel_slide', {
          slide_class: isFirst ? 'slide-cover' : '',
          photo_path: photoPath,
          slide_num: String(i + 1),
          total_slides: String(total),
          content_block: buildCarouselContent(slide),
          ...data,
        });
        await renderSlide(page, html, path.join(outDir, `slide_${String(i+1).padStart(2,'0')}.jpg`), 1080, 1350);
      }
    }

    else if (type === 'quote_card') {
      const photoPath = resolvePhotoPath(photo);
      const html = renderTemplate('quote_card', {
        photo_path: photoPath,
        quote_text: postConfig.quote,
        attribution: postConfig.attribution,
        context: postConfig.context || '',
        ...data,
      });
      await renderSlide(page, html, path.join(outDir, 'quote_card.jpg'), 1080, 1080);
    }

    else if (type === 'highlight_cover') {
      const photoPath = resolvePhotoPath(photo);
      const html = renderTemplate('highlight_cover', {
        photo_path: photoPath,
        title: postConfig.title,
        subtitle: postConfig.subtitle || '',
        ...data,
      });
      await renderSlide(page, html, path.join(outDir, 'highlight_cover.jpg'), 1080, 1920);
    }

    else if (type === 'story' || type === 'story_sequence') {
      const storyFrames = frames || [postConfig];
      for (let i = 0; i < storyFrames.length; i++) {
        const frame = storyFrames[i];
        const photoPath = resolvePhotoPath(frame.photo || photo);
        const html = renderTemplate('story_frame', {
          body_class: frame.centred ? 'centred' : '',
          photo_path: photoPath,
          content_block: buildStoryContent(frame),
          ...data,
        });
        await renderSlide(page, html, path.join(outDir, `frame_${String(i+1).padStart(2,'0')}.jpg`), 1080, 1920);
      }
    }

    if (postConfig.caption) {
      const captionPath = path.join(outDir, 'caption.txt');
      fs.writeFileSync(captionPath, postConfig.caption.trim());
      console.log(`  ✓ caption.txt`);
    }

  } finally {
    await page.close();
  }
}

// ─── Drive upload ─────────────────────────────────────────────────────────────

function rcloneAvailable() {
  return fs.existsSync(RCLONE);
}

function driveConfigured() {
  if (!rcloneAvailable()) return false;
  const result = spawnSync(RCLONE, ['listremotes'], { encoding: 'utf8' });
  return result.stdout && result.stdout.includes(DRIVE_REMOTE + ':');
}

function uploadToDrive(postName, postType) {
  if (!driveConfigured()) {
    console.log(`  ⚠ Drive not configured — skipping upload (run: ~/bin/rclone config)`);
    return;
  }
  const localDir = path.join(OUTPUT_DIR, postName);
  const subFolder = DRIVE_FOLDER_MAP[postType] || 'Other';
  const driveTarget = `${DRIVE_REMOTE}:${DRIVE_BASE}/${subFolder}`;
  console.log(`  ☁ Uploading to Drive: ${subFolder}/`);
  const result = spawnSync(RCLONE, ['copy', localDir, driveTarget, '--progress'], {
    encoding: 'utf8',
    stdio: 'pipe',
  });
  if (result.status === 0) {
    console.log(`  ✓ Uploaded to Drive`);
  } else {
    console.error(`  ✗ Upload failed: ${result.stderr}`);
  }
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);
  if (!args.length) {
    console.log('Usage: node generate.js <post-config.json> [<post-config2.json> ...]');
    console.log('       node generate.js --all');
    console.log('       node generate.js --all --no-upload   (skip Drive upload)');
    process.exit(1);
  }

  const noUpload = args.includes('--no-upload');
  const cleanArgs = args.filter(a => a !== '--no-upload');

  let configs = [];
  if (cleanArgs[0] === '--all') {
    const files = fs.readdirSync(POSTS_DIR).filter(f => f.endsWith('.json'));
    configs = files.map(f => path.join(POSTS_DIR, f));
  } else {
    configs = cleanArgs.map(a => path.isAbsolute(a) ? a : path.join(POSTS_DIR, a.replace('posts/', '')));
  }

  console.log(`\n🎨 Rockbusters Design Generator`);
  console.log(`   Rendering ${configs.length} post(s)...\n`);

  const browser = await chromium.launch();

  for (const configPath of configs) {
    if (!fs.existsSync(configPath)) {
      console.error(`✗ Config not found: ${configPath}`);
      continue;
    }
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    console.log(`→ ${config.name} (${config.type})`);
    await generatePost(config, browser);
    if (!noUpload) uploadToDrive(config.name, config.type);
  }

  await browser.close();
  console.log(`\n✅ Done. Images saved to: ${OUTPUT_DIR}/\n`);
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
