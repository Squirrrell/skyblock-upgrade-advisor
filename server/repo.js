// Community game constants from the NotEnoughUpdates repo: pet leveling curves
// and the attribute shard list. Fetched at runtime so they stay current with
// game patches, and cached for half a day.
import { createCache } from './lib/cache.js';

const BASE = 'https://raw.githubusercontent.com/NotEnoughUpdates/NotEnoughUpdates-REPO/master/constants';
const cache = createCache();

async function fetchConstant(name) {
  return cache.get(name, 12 * 60 * 60_000, async () => {
    const res = await fetch(`${BASE}/${name}.json`);
    if (!res.ok) throw new Error(`NEU ${name} HTTP ${res.status}`);
    return res.json();
  });
}

export async function getPetConstants() {
  try {
    return await fetchConstant('pets');
  } catch (err) {
    console.warn(`[repo] pets.json unavailable: ${err.message}`);
    return null;
  }
}

export async function getAttributeConstants() {
  try {
    return await fetchConstant('attribute_shards');
  } catch (err) {
    console.warn(`[repo] attribute_shards.json unavailable: ${err.message}`);
    return null;
  }
}

export async function getReforgeStones() {
  try {
    return await fetchConstant('reforgestones');
  } catch (err) {
    console.warn(`[repo] reforgestones.json unavailable: ${err.message}`);
    return null;
  }
}

export async function getMiscConstants() {
  try {
    return await fetchConstant('misc');
  } catch (err) {
    console.warn(`[repo] misc.json unavailable: ${err.message}`);
    return null;
  }
}
