// Collects the skull textures of every pet and attribute shard from the
// NotEnoughUpdates repo. FurfSky Reborn retextures pets by skull texture, so
// this is how the icon code finds a pet's texture in a loaded pack. The
// pet skins are also what lib/heads3d.js draws the 3D pet heads from.
// Pets and shards change rarely, so the result is committed; rerun this after
// a SkyBlock update adds new ones.
// Usage: node scripts/build-heads.mjs   (writes web/public/heads.json)
import { writeFileSync } from 'node:fs';
import { skullHash } from '../shared/prices.js';

const NEU = 'https://raw.githubusercontent.com/NotEnoughUpdates/NotEnoughUpdates-REPO/master';

async function getJson(url) {
  const res = await fetch(url);
  return res.ok ? res.json() : null;
}

async function headOf(internalName, test) {
  const item = await getJson(`${NEU}/items/${encodeURIComponent(internalName)}.json`);
  if (test && !test(item)) return null;
  const value = /Value:\\?"([A-Za-z0-9+/=]+)\\?"/.exec(item?.nbttag ?? '')?.[1];
  return skullHash(value);
}

async function pool(tasks, size = 8) {
  const out = [];
  let next = 0;
  await Promise.all(
    Array.from({ length: size }, async () => {
      while (next < tasks.length) {
        const i = next++;
        out[i] = await tasks[i]();
      }
    }),
  );
  return out;
}

const [pets, petnums, shards] = await Promise.all([
  getJson(`${NEU}/constants/pets.json`),
  getJson(`${NEU}/constants/petnums.json`),
  getJson(`${NEU}/constants/attribute_shards.json`),
]);

// Every item file in the repo, to catch what the constants files miss.
const tree = await getJson('https://api.github.com/repos/NotEnoughUpdates/NotEnoughUpdates-REPO/git/trees/master?recursive=1');
const itemNames = (tree?.tree ?? []).map((t) => /^items\/(.+)\.json$/.exec(t.path)?.[1]).filter(Boolean);

// Try the legendary version first, then any other rarity that exists.
// pets.json lags behind new pets (Hedgehog, the wisps...); petnums.json has
// more, and any other "NAME;4" item named "[Lvl ...]" is a pet too (Eagle).
const known = new Set([...Object.keys(pets?.pet_types ?? {}), ...Object.keys(petnums ?? {})]);
const isPet = (item) => /\[Lvl/.test(item?.displayname ?? '');
const candidates = [...new Set(itemNames.map((n) => /^([A-Z0-9_]+);4$/.exec(n)?.[1]))].filter((t) => t && !known.has(t) && !t.startsWith('ATTRIBUTE_SHARD'));
const extraPets = await pool(candidates.map((type) => async () => ((await headOf(`${type};4`, isPet)) ? type : null)));
const petTypes = [...known, ...extraPets.filter(Boolean)];
const petHeads = await pool(
  petTypes.map((type) => async () => {
    for (const tier of [4, 5, 3, 2, 1, 0]) {
      const hash = await headOf(`${type};${tier}`);
      if (hash) return [type, hash];
    }
    return null;
  }),
);

const shardList = shards?.attributes ?? [];
// A few shards are not heads in game but plain items (Obsidian Defender is
// obsidian); for those keep the Minecraft item they show as.
const shardModels = {};
const shardHeads = await pool(
  shardList.map((s) => async () => {
    const hash = await headOf(s.internalName);
    if (hash) return [s.bazaarName, hash];
    const item = await getJson(`${NEU}/items/${encodeURIComponent(s.internalName)}.json`);
    const model = /ItemModel:"minecraft:([a-z0-9_]+)"/.exec(item?.nbttag ?? '')?.[1];
    if (model) shardModels[s.bazaarName] = model;
    return null;
  }),
);

// Head items Hypixel's item list leaves out, such as the essences.
const itemHeads = await pool(
  itemNames
    .filter((n) => /^ESSENCE_[A-Z]+$/.test(n))
    .map((id) => async () => {
      const hash = await headOf(id);
      return hash ? [id, hash] : null;
    }),
);

const out = {
  pets: Object.fromEntries(petHeads.filter(Boolean)),
  shards: Object.fromEntries(shardHeads.filter(Boolean)),
  items: Object.fromEntries(itemHeads.filter(Boolean)),
  models: shardModels,
};
writeFileSync(new URL('../web/public/heads.json', import.meta.url), JSON.stringify(out));
console.log(`heads.json: ${Object.keys(out.pets).length}/${petTypes.length} pets, ${Object.keys(out.shards).length}/${shardList.length} shards, ${Object.keys(out.items).length} other heads, ${Object.keys(out.models).length} shards drawn as items`);
