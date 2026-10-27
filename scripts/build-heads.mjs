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

async function headOf(internalName) {
  const item = await getJson(`${NEU}/items/${encodeURIComponent(internalName)}.json`);
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

// Try the legendary version first, then any other rarity that exists.
// pets.json lags behind new pets (Hedgehog, the wisps...); petnums.json has them.
const petTypes = [...new Set([...Object.keys(pets?.pet_types ?? {}), ...Object.keys(petnums ?? {})])];
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
const shardHeads = await pool(
  shardList.map((s) => async () => {
    const hash = await headOf(s.internalName);
    return hash ? [s.bazaarName, hash] : null;
  }),
);

const out = {
  pets: Object.fromEntries(petHeads.filter(Boolean)),
  shards: Object.fromEntries(shardHeads.filter(Boolean)),
};
writeFileSync(new URL('../web/public/heads.json', import.meta.url), JSON.stringify(out));
console.log(`heads.json: ${Object.keys(out.pets).length}/${petTypes.length} pets, ${Object.keys(out.shards).length}/${shardList.length} shards`);
