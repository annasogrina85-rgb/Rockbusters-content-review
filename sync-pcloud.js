#!/usr/bin/env node
/**
 * Sync Jany's pCloud photo library (WEB folders only) into photos/jany/
 *
 * Usage:
 *   node sync-pcloud.js          — sync everything
 *   node sync-pcloud.js --list   — list available photos without downloading
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

const PCLOUD_CODE = 'kZe3ow7ZRNou6K5SCb4vpyjthO1rmkl4WL2X';
const PHOTOS_DIR = path.join(__dirname, 'photos', 'jany');

// ─── Helpers ─────────────────────────────────────────────────────────────────

function get(url) {
  return new Promise((resolve, reject) => {
    https.get(url, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(new Error(`JSON parse failed: ${data.slice(0, 200)}`)); }
      });
    }).on('error', reject);
  });
}

function download(url, destPath) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(destPath);
    https.get(url, res => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        file.close();
        fs.unlinkSync(destPath);
        return download(res.headers.location, destPath).then(resolve).catch(reject);
      }
      res.pipe(file);
      file.on('finish', () => file.close(resolve));
    }).on('error', err => {
      fs.unlinkSync(destPath);
      reject(err);
    });
  });
}

function slugify(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
}

// ─── pCloud API ───────────────────────────────────────────────────────────────

async function getDownloadUrl(fileId) {
  const data = await get(
    `https://api.pcloud.com/getpublinkdownload?code=${PCLOUD_CODE}&fileid=${fileId}`
  );
  if (data.result !== 0) throw new Error(`pCloud error ${data.result}`);
  return `https://${data.hosts[0]}${data.path}`;
}

// Walk the folder tree from the API response, collecting WEB folder files
function collectWebFiles(contents, folderPath = '') {
  const files = [];
  if (!contents) return files;

  for (const item of contents) {
    if (item.isfolder) {
      const isWeb = item.name === 'WEB';
      const childPath = isWeb ? folderPath : path.join(folderPath, slugify(item.name));
      files.push(...collectWebFiles(item.contents, isWeb ? folderPath : childPath));
    } else if (folderPath !== '') {
      // Only collect files that are inside a WEB folder (folderPath was set by parent WEB)
      files.push({ fileId: String(item.fileid), name: item.name, folder: folderPath });
    }
  }
  return files;
}

// Same walk but collects WEB-folder files correctly
function walkForWeb(node, insideWeb, folderLabel) {
  const results = [];
  if (!node) return results;

  const items = Array.isArray(node) ? node : (node.contents || []);
  for (const item of items) {
    if (item.isfolder) {
      const nowWeb = item.name === 'WEB';
      const label = nowWeb ? folderLabel : slugify(item.name);
      results.push(...walkForWeb(item.contents || [], nowWeb, label));
    } else if (insideWeb) {
      results.push({ fileId: String(item.fileid), name: item.name, folder: folderLabel });
    }
  }
  return results;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const listOnly = process.argv.includes('--list');
  const onlyIdx = process.argv.indexOf('--only');
  const onlyFolder = onlyIdx !== -1 ? process.argv[onlyIdx + 1] : null;

  console.log('\n📷  Jany pCloud Sync');
  console.log(`    Fetching folder index...\n`);

  const data = await get(
    `https://api.pcloud.com/showpublink?code=${PCLOUD_CODE}`
  );

  if (data.result !== 0) {
    console.error(`pCloud API error: ${data.result}`);
    process.exit(1);
  }

  const root = data.metadata;
  const files = walkForWeb(root.contents || [], false, slugify(root.name));

  const filtered = onlyFolder
    ? files.filter(f => f.folder === onlyFolder)
    : files;

  if (!filtered.length) {
    console.log(onlyFolder ? `No files found in folder: ${onlyFolder}` : 'No files found in WEB folders.');
    return;
  }

  console.log(`Found ${filtered.length} web-optimised photos${onlyFolder ? ` in ${onlyFolder}` : ''}:\n`);
  const byFolder = {};
  for (const f of filtered) {
    (byFolder[f.folder] = byFolder[f.folder] || []).push(f);
  }
  for (const [folder, items] of Object.entries(byFolder)) {
    console.log(`  📁 ${folder}/ (${items.length} photos)`);
    for (const f of items) console.log(`     ${f.name}`);
  }

  if (listOnly) {
    console.log('\nRun without --list to download.\n');
    return;
  }

  console.log('\nDownloading...\n');
  let downloaded = 0;
  let skipped = 0;

  for (const f of filtered) {
    const dir = path.join(PHOTOS_DIR, f.folder);
    fs.mkdirSync(dir, { recursive: true });

    const dest = path.join(dir, f.name);
    if (fs.existsSync(dest)) {
      skipped++;
      continue;
    }

    try {
      const url = await getDownloadUrl(f.fileId);
      await download(url, dest);
      console.log(`  ✓ ${f.folder}/${f.name}`);
      downloaded++;
    } catch (err) {
      console.error(`  ✗ ${f.name}: ${err.message}`);
    }
  }

  console.log(`\n✅ Done. ${downloaded} downloaded, ${skipped} already present.`);
  console.log(`   Photos saved to: photos/jany/\n`);
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
