// Writes the data files the static (GitHub Pages) build loads:
//   prices.json            lowest BIN per item from a full auction house scan
//   items.json             item names and Peridot slots from the Hypixel items resource
//   pets.json, attribute_shards.json   NotEnoughUpdates constants
// Usage: node scripts/build-data.mjs <output dir>
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { scanAuctionHouse, slimItems } from '../shared/prices.js';

const out = process.argv[2] ?? 'dist/data';
const NEU = 'https://raw.githubusercontent.com/NotEnoughUpdates/NotEnoughUpdates-REPO/master/constants';

async function getJson(url) {
  const res = await fetch(url, { headers: { 'User-Agent': 'skyblock-upgrade-advisor' } });
  if (!res.ok) throw new Error(`${url} returned HTTP ${res.status}`);
  return res.json();
}

const started = Date.now();
const [scan, itemsRes, pets, attributes] = await Promise.all([
  scanAuctionHouse((page) => getJson(`https://api.hypixel.net/v2/skyblock/auctions?page=${page}`)),
  getJson('https://api.hypixel.net/v2/resources/skyblock/items'),
  getJson(`${NEU}/pets.json`),
  getJson(`${NEU}/attribute_shards.json`),
]);

// Rounded prices keep the file small; nobody needs fractions of a coin.
const lowest = Object.fromEntries(Object.entries(scan.lowest).map(([k, v]) => [k, Math.round(v)]));

await mkdir(out, { recursive: true });
const files = {
  'prices.json': { updatedAt: scan.updatedAt, pages: scan.pages, lowest },
  'items.json': slimItems(itemsRes.items ?? []),
  // Only the fields the analyzers read.
  'pets.json': { pet_rarity_offset: pets.pet_rarity_offset, pet_levels: pets.pet_levels, custom_pet_leveling: pets.custom_pet_leveling },
  'attribute_shards.json': attributes,
};
for (const [name, data] of Object.entries(files)) {
  const text = JSON.stringify(data);
  await writeFile(join(out, name), text);
  console.log(`${name.padEnd(24)} ${(text.length / 1024).toFixed(0)} KB`);
}
console.log(`Scanned ${scan.pages} auction pages, ${Object.keys(lowest).length} priced items, in ${((Date.now() - started) / 1000).toFixed(1)}s`);
