// Writes the data files the static (GitHub Pages) build loads:
//   prices.json            lowest BIN per item from a full auction house scan,
//                          and its typical value over the last 3 days
//   price-history.json     the lowest BIN samples that average comes from; each
//                          build reads the previous one back from the live site
//                          (PAGES_URL) and adds this scan to it
//   reforges.json          reforge name -> reforge stone, for valuing items
//   listings.json          the cheapest BIN auctions of each accessory, for its popup
//   items.json             item names and Peridot slots from the Hypixel items resource
//   pets.json, attribute_shards.json   NotEnoughUpdates constants
//   accessories.json       every accessory and its upgrade line, for the missing-accessory list
// Usage: node scripts/build-data.mjs <output dir>
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { buildAccessoryIndex } from '../shared/accessories.js';
import { averageLowest, reforgeStones, scanAuctionHouse, slimItems, updateHistory } from '../shared/prices.js';

const out = process.argv[2] ?? 'dist/data';
const NEU = 'https://raw.githubusercontent.com/NotEnoughUpdates/NotEnoughUpdates-REPO/master/constants';

async function getJson(url) {
  const res = await fetch(url, { headers: { 'User-Agent': 'skyblock-upgrade-advisor' } });
  if (!res.ok) throw new Error(`${url} returned HTTP ${res.status}`);
  return res.json();
}

const started = Date.now();
const itemsRes = await getJson('https://api.hypixel.net/v2/resources/skyblock/items');
const accessoryIds = new Set((itemsRes.items ?? []).filter((i) => i.category === 'ACCESSORY').map((i) => i.id));
const PAGES_URL = process.env.PAGES_URL?.replace(/\/$/, '');
const [scan, pets, attributes, misc, stones, previous] = await Promise.all([
  // Accessories keep their cheapest listings too, for the accessory popup.
  scanAuctionHouse((page) => getJson(`https://api.hypixel.net/v2/skyblock/auctions?page=${page}`), { listFor: (id) => accessoryIds.has(id) }),
  getJson(`${NEU}/pets.json`),
  getJson(`${NEU}/attribute_shards.json`),
  getJson(`${NEU}/misc.json`).catch(() => ({})),
  getJson(`${NEU}/reforgestones.json`).catch(() => ({})),
  // The history published by the last deploy; starts over if there is none.
  PAGES_URL ? getJson(`${PAGES_URL}/data/price-history.json`).catch(() => null) : null,
]);

// Rounded prices keep the file small; nobody needs fractions of a coin.
const lowest = Object.fromEntries(Object.entries(scan.lowest).map(([k, v]) => [k, Math.round(v)]));
const history = updateHistory(previous, lowest, scan.updatedAt);
const average = averageLowest(history);

await mkdir(out, { recursive: true });
const files = {
  'prices.json': { updatedAt: scan.updatedAt, pages: scan.pages, lowest, average },
  'price-history.json': history,
  'reforges.json': reforgeStones(stones),
  'listings.json': { updatedAt: scan.updatedAt, listings: scan.listings },
  'items.json': slimItems(itemsRes.items ?? []),
  // Only the fields the analyzers read.
  'pets.json': { pet_rarity_offset: pets.pet_rarity_offset, pet_levels: pets.pet_levels, custom_pet_leveling: pets.custom_pet_leveling },
  'attribute_shards.json': attributes,
  'accessories.json': buildAccessoryIndex(itemsRes.items ?? [], misc),
};
for (const [name, data] of Object.entries(files)) {
  const text = JSON.stringify(data);
  await writeFile(join(out, name), text);
  console.log(`${name.padEnd(24)} ${(text.length / 1024).toFixed(0)} KB`);
}
console.log(`Price history: ${history.times.length} samples${previous ? '' : ' (no previous history found, started over)'}, ${Object.keys(average).length} items averaged`);
console.log(`Scanned ${scan.pages} auction pages, ${Object.keys(lowest).length} priced items, in ${((Date.now() - started) / 1000).toFixed(1)}s`);
