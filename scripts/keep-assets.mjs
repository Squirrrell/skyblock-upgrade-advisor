// Copies the live site's current scripts, styles and fonts into the new build,
// so pages loaded before a deploy keep working after it. Each deploy replaces
// the whole site, and its file names change with their content: a browser
// holding the old index.html (GitHub Pages caches it for 10 minutes) or an
// open tab that later loads a lazy chunk would otherwise ask for files that
// are gone, and show a blank page. Files are found by following the old
// index.html and the references inside each old file.
// Usage: PAGES_URL=https://user.github.io/repo node scripts/keep-assets.mjs <dist dir>
import { existsSync } from 'node:fs';
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const dist = process.argv[2] ?? 'dist';
const site = process.env.PAGES_URL?.replace(/\/$/, '');
if (!site) {
  console.log('keep-assets: no PAGES_URL, skipped');
  process.exit(0);
}

// Vite output names: "Accessories-D0KNmPiz.js", "geist-latin-wght-normal-BgDaEnEv.woff2".
const ASSET = /[A-Za-z0-9_-]+-[A-Za-z0-9_-]{8}\.(?:js|css|woff2)/g;
const MAX_FILES = 200;

async function get(path) {
  const res = await fetch(`${site}/${path}`, { headers: { 'User-Agent': 'skyblock-upgrade-advisor' } });
  if (!res.ok) throw new Error(`${path}: HTTP ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

let index;
try {
  index = (await get('index.html')).toString('utf8');
} catch (err) {
  console.log(`keep-assets: live site unavailable (${err.message}), skipped`);
  process.exit(0);
}

const queue = [...new Set(index.match(ASSET) ?? [])];
const seen = new Set(queue);
let kept = 0;
let failed = 0;
while (queue.length && seen.size <= MAX_FILES) {
  const name = queue.shift();
  const out = join(dist, 'assets', name);
  let body;
  try {
    body = await get(`assets/${name}`);
  } catch {
    failed++;
    continue;
  }
  // A file the new build also has (same content, same name) stays as built.
  if (!existsSync(out)) {
    await writeFile(out, body);
    kept++;
  }
  if (name.endsWith('.woff2')) continue;
  for (const ref of body.toString('utf8').match(ASSET) ?? []) {
    if (!seen.has(ref)) {
      seen.add(ref);
      queue.push(ref);
    }
  }
}
console.log(`keep-assets: kept ${kept} files from the previous deploy (${seen.size} referenced, ${failed} not found)`);
