// Builds foraging.json for the foraging helper from the NEU data repository:
//   items     every item with Foraging Fortune or Sweep in its stats, by type
//             (AXE, HELMET, ... NECKLACE), from its lore
//   shards    the attribute shards whose effect is about foraging, with that effect
//   reforges  reforges (and their stones) that add Foraging Fortune or Sweep
//   pets      pets with Foraging Fortune or Sweep stats, at level 1 and 100
// The repository is downloaded once per commit and cached in .cache/.
// Usage: node scripts/build-foraging.mjs [output dir]   (default: .cache)
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { strFromU8, unzipSync } from 'fflate';

const out = process.argv[2] ?? '.cache';
const CACHE = new URL('../.cache/', import.meta.url);
const REPO = 'NotEnoughUpdates/NotEnoughUpdates-REPO';
const UA = { 'User-Agent': 'skyblock-upgrade-advisor' };

async function fetchOk(url) {
  const res = await fetch(url, { headers: UA });
  if (!res.ok) throw new Error(`${url} returned HTTP ${res.status}`);
  return res;
}

mkdirSync(CACHE, { recursive: true });
const sha = (await (await fetchOk(`https://api.github.com/repos/${REPO}/commits/master`)).json()).sha;
const zipFile = new URL(`neu-${sha.slice(0, 12)}.zip`, CACHE);
if (!existsSync(zipFile)) {
  console.log(`foraging: downloading the NEU repository (${sha.slice(0, 8)})`);
  writeFileSync(zipFile, Buffer.from(await (await fetchOk(`https://codeload.github.com/${REPO}/zip/${sha}`)).arrayBuffer()));
}
const files = unzipSync(new Uint8Array(readFileSync(zipFile)), {
  filter: (f) => /\/items\/[^/]+\.json$/.test(f.name) || /\/constants\/(reforgestones|reforges|petnums|attribute_shards)\.json$/.test(f.name),
});
const json = (name) => {
  const key = Object.keys(files).find((k) => k.endsWith(name));
  return key ? JSON.parse(strFromU8(files[key])) : {};
};

const strip = (s) => String(s).replace(/§./g, '');
const statOf = (lore, label) => {
  const re = new RegExp(`^${label}: \\+([\\d,.]+)`);
  for (const l of lore) {
    const m = re.exec(strip(l).trim());
    if (m) return Number(m[1].replace(/,/g, ''));
  }
  return 0;
};
const RARITIES = ['COMMON', 'UNCOMMON', 'RARE', 'EPIC', 'LEGENDARY', 'MYTHIC', 'DIVINE', 'SPECIAL', 'VERY SPECIAL'];
/** "§6§lLEGENDARY AXE" -> { tier: 'LEGENDARY', type: 'AXE' } */
function rarityLine(lore) {
  for (let i = lore.length - 1; i >= 0; i--) {
    const line = strip(lore[i]).trim().replace(/^[a-z]\s+|\s+[a-z]$/g, '');
    const tier = RARITIES.find((r) => line.startsWith(r));
    if (tier) return { tier: tier.replace(' ', '_'), type: line.slice(tier.length).trim() || null };
  }
  return { tier: null, type: null };
}

// ------------------------------------------------------------------ items and shards

const items = [];
const shardLore = new Map(); // ATTRIBUTE_SHARD_X;1 -> lore
for (const [path, data] of Object.entries(files)) {
  if (!path.includes('/items/')) continue;
  let item;
  try {
    item = JSON.parse(strFromU8(data));
  } catch {
    continue;
  }
  const lore = Array.isArray(item.lore) ? item.lore : [];
  if (item.internalname?.startsWith('ATTRIBUTE_SHARD_')) shardLore.set(item.internalname, lore);
  const fortune = statOf(lore, 'Foraging Fortune');
  const sweep = statOf(lore, 'Sweep');
  if (!fortune && !sweep) continue;
  const { tier, type } = rarityLine(lore);
  // Recipes for sale in a shop or menu items aren't gear.
  if (!type || /;/.test(item.internalname)) continue;
  items.push({ id: item.internalname, name: strip(item.displayname ?? item.internalname).trim(), tier, type, fortune, sweep });
}
items.sort((a, b) => a.type.localeCompare(b.type) || b.fortune + b.sweep - (a.fortune + a.sweep));

const FORAGING = /forag|sweep|\blogs?\b|\btrees?\b|\baxe\b|galatea|timber|fig |mangrove|helix/i;
const shards = [];
for (const s of Object.values(json('attribute_shards.json').attributes ?? {})) {
  const lore = shardLore.get(s.internalName) ?? [];
  // The shard's own effect: the lines after its name, up to the first blank line.
  const text = lore.map(strip).join(' ');
  if (!FORAGING.test(`${s.abilityName} ${text}`)) continue;
  shards.push({
    id: s.bazaarName,
    name: s.displayName,
    ability: s.abilityName,
    rarity: s.rarity,
    code: s.shardId,
    alignment: s.alignment,
    family: s.family ?? [],
    lore,
  });
}

// ------------------------------------------------------------------ reforges and pets

const reforges = [];
const statsOf = (byRarity) =>
  Object.fromEntries(
    Object.entries(byRarity ?? {}).map(([r, st]) => [r, { fortune: st.foraging_fortune ?? 0, sweep: st.sweep ?? 0 }]).filter(([, v]) => v.fortune || v.sweep),
  );
for (const [stone, r] of Object.entries(json('reforgestones.json'))) {
  const stats = statsOf(r.reforgeStats);
  const ids = typeof r.itemTypes === 'object' ? r.itemTypes.internalName ?? [] : null;
  if (Object.keys(stats).length) reforges.push({ name: r.reforgeName, modifier: r.reforgeName.toLowerCase(), stone, types: ids ? null : r.itemTypes, ids, stats });
}
for (const r of Object.values(json('reforges.json'))) {
  const stats = statsOf(r.reforgeStats);
  if (Object.keys(stats).length) reforges.push({ name: r.reforgeName, modifier: r.nbtModifier ?? r.reforgeName.toLowerCase(), stone: null, types: r.itemTypes, ids: null, stats });
}

const pets = [];
for (const [type, tiers] of Object.entries(json('petnums.json'))) {
  for (const [tier, nums] of Object.entries(tiers)) {
    const at = (lvl) => ({ fortune: nums[lvl]?.statNums?.FORAGING_FORTUNE ?? 0, sweep: nums[lvl]?.statNums?.SWEEP ?? 0 });
    const lo = at('1');
    const hi = at('100');
    if (lo.fortune || lo.sweep || hi.fortune || hi.sweep) pets.push({ type, tier, lo, hi });
  }
}

mkdirSync(out, { recursive: true });
// Shards needed for each attribute level, by rarity.
const levelling = json('attribute_shards.json').attribute_levelling ?? {};
const data = { built: Date.now(), source: sha, items, shards, levelling, reforges, pets };
writeFileSync(join(out, 'foraging.json'), JSON.stringify(data));
console.log(`foraging.json: ${items.length} items, ${shards.length} shards, ${reforges.length} reforges, ${pets.length} pet tiers`);
