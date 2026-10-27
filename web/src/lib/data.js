// Cached loaders for the data the tool pages share. Hypixel's resource and
// bazaar endpoints need no key and allow browser requests, so they are read
// directly; item names and the auction snapshot come from the site's own
// data files (or the local server's /api/data in development).
import { STATIC_MODE } from './api.js';

const HYPIXEL = 'https://api.hypixel.net/v2';
export const dataUrl = (name) => (STATIC_MODE ? `${import.meta.env.BASE_URL}data/${name}` : `/api/data/${name}`);

const cache = new Map();

/** Run `load` once per `ttl` ms and share the promise between callers. */
function cached(key, ttl, load) {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < ttl) return hit.promise;
  const promise = load().catch((err) => {
    cache.delete(key);
    throw err;
  });
  cache.set(key, { at: Date.now(), promise });
  return promise;
}

async function getJson(url, label) {
  let res;
  try {
    res = await fetch(url);
  } catch {
    throw new Error(`Could not reach ${label}.`);
  }
  if (!res.ok) throw new Error(`${label} returned HTTP ${res.status}.`);
  return res.json();
}

export const loadItems = () =>
  cached('items', Infinity, async () => new Map((await getJson(dataUrl('items.json'), 'the item list')).map((i) => [i.id, i])));

export const loadAuctions = () => cached('auctions', 5 * 60_000, () => getJson(dataUrl('prices.json'), 'the auction snapshot'));

/** The cheapest BIN auctions of each accessory, from the last scan. */
export const loadListings = () => cached('listings', 5 * 60_000, () => getJson(dataUrl('listings.json'), 'the auction listings'));

export const loadBazaar = () => cached('bazaar', 60_000, () => getJson(`${HYPIXEL}/skyblock/bazaar`, 'the Hypixel bazaar'));

export const loadElection = () => cached('election', 5 * 60_000, () => getJson(`${HYPIXEL}/resources/skyblock/election`, 'the Hypixel election'));

export const loadCollections = () =>
  cached('collections', Infinity, () => getJson(`${HYPIXEL}/resources/skyblock/collections`, 'the Hypixel collections list'));

/** Forget cached copies so the next load fetches fresh data. */
export function invalidate(key) {
  cache.delete(key);
}
