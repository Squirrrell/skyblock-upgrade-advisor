// Bundles FurfSky Reborn item textures into web/public/furfsky/, used as the
// site's default icons with the FurfSky team's permission.
//
//   node scripts/build-furfsky.mjs
//
// Reads the packs from your Minecraft resourcepacks folder (or FURFSKY_PACKS,
// paths separated by ;). The newer .cats release goes first so it wins over
// the older FULL zip. Each texture is written once, named by its content hash,
// and index.json maps item ids, skull hashes and id patterns to those names.
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import { findPacks } from '../server/packs.js';
import { readPackRules } from '../web/src/lib/furfsky.js';

const out = join(import.meta.dirname, '..', 'web', 'public', 'furfsky');

const packs = findPacks().sort((a, b) => /\.cats/i.test(b) - /\.cats/i.test(a));
if (!packs.length) {
  console.error('No FurfSky pack found. Put it in .minecraft/resourcepacks or set FURFSKY_PACKS.');
  process.exit(1);
}

const index = { packs: [], items: {}, skulls: {}, patterns: [] };
const pngs = new Map(); // name -> bytes

function store(bytes) {
  const name = createHash('sha1').update(bytes).digest('hex').slice(0, 12);
  if (!pngs.has(name)) pngs.set(name, bytes);
  return name;
}

for (const path of packs) {
  const { rules, read } = await readPackRules(new Uint8Array(readFileSync(path)));
  index.packs.push(basename(path).replace(/§./g, '').replace(/Â/g, ''));
  for (const r of rules) {
    if (r.skull ? index.skulls[r.skull] : r.exact && index.items[r.exact]) continue;
    let bytes;
    try {
      bytes = read(r.texture);
    } catch {
      continue;
    }
    if (!bytes?.length) continue;
    const name = store(bytes);
    if (r.skull) index.skulls[r.skull] = name;
    else if (r.exact) index.items[r.exact] = name;
    else index.patterns.push([r.re.source, r.re.flags, name]);
  }
}

mkdirSync(out, { recursive: true });
for (const f of readdirSync(out)) if (f.endsWith('.png')) rmSync(join(out, f));
let total = 0;
for (const [name, bytes] of pngs) {
  writeFileSync(join(out, `${name}.png`), bytes);
  total += bytes.length;
}
writeFileSync(join(out, 'index.json'), JSON.stringify(index));

console.log(
  `${Object.keys(index.items).length} items, ${Object.keys(index.skulls).length} skulls, ${index.patterns.length} patterns; ` +
    `${pngs.size} textures, ${(total / 1024).toFixed(0)} KiB`,
);
