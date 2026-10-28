// Builds the report in the browser for the static (GitHub Pages) build.
// Keyed Hypixel calls and Mojang lookups go through the Cloudflare Worker in
// VITE_PROXY_URL; bazaar prices come straight from Hypixel; the auction
// snapshot, item index and NEU constants are JSON files published with the site.
import { createPriceBook } from '../../../shared/prices.js';
import { buildReport, pickProfile } from '../../../shared/report.js';
import { ReportError } from './api.js';

const PROXY = import.meta.env.VITE_PROXY_URL?.replace(/\/$/, '');
const DATA = `${import.meta.env.BASE_URL}data`;

async function getJson(url, { signal, label }) {
  let res;
  try {
    res = await fetch(url, { signal });
  } catch (err) {
    if (err.name === 'AbortError') throw err;
    throw new ReportError(`Could not reach ${label}.`, { code: 'OFFLINE' });
  }
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new ReportError(body.error ?? `${label} failed (${res.status})`, { status: res.status, code: body.code });
  return body;
}

// Static files and the bazaar are shared by every lookup in this tab.
let staticData = null;
function loadStatic(signal) {
  staticData ??= Promise.all(
    ['prices', 'items', 'pets', 'attribute_shards', 'accessories', 'reforges'].map((name) =>
      getJson(`${DATA}/${name}.json`, { signal, label: 'the price snapshot' }).catch((err) => {
        // Older deploys lack these two; the rest of the report still works.
        if ((name === 'accessories' || name === 'reforges') && err.name !== 'AbortError') return null;
        throw err;
      }),
    ),
  ).catch((err) => {
    staticData = null;
    throw err;
  });
  return staticData;
}

let bazaar = { at: 0, promise: null };
function loadBazaar(signal) {
  if (!bazaar.promise || Date.now() - bazaar.at > 60_000) {
    bazaar = {
      at: Date.now(),
      promise: getJson('https://api.hypixel.net/v2/skyblock/bazaar', { signal, label: 'the Hypixel bazaar' }).catch(() => null),
    };
  }
  return bazaar.promise;
}

export async function fetchStaticReport(name, wantedProfile, { signal } = {}) {
  if (!PROXY) throw new ReportError('This build has no proxy URL set.', { code: 'NO_API_KEY' });
  const pending = Promise.all([loadStatic(signal), loadBazaar(signal)]);

  const player = await getJson(`${PROXY}/player/${encodeURIComponent(name)}`, { signal, label: 'the lookup proxy' });
  const { profiles } = await getJson(`${PROXY}/profiles/${player.uuid}`, { signal, label: 'the lookup proxy' });
  if (!profiles?.length) throw new ReportError(`${player.name} has never played SkyBlock.`, { code: 'NO_PROFILES' });

  const profile = pickProfile(profiles, wantedProfile);
  const [gardenRes, [[prices, items, pets, attributes, accessories, reforges], bz]] = await Promise.all([
    getJson(`${PROXY}/garden/${profile.profile_id}`, { signal, label: 'the lookup proxy' }).catch((err) => {
      if (err.name === 'AbortError') throw err;
      return null;
    }),
    pending,
  ]);

  const book = createPriceBook({
    bazaarProducts: bz?.products,
    lowest: prices.lowest,
    average: prices.average,
    reforges: reforges ?? {},
    items: new Map(items.map((i) => [i.id, i])),
    meta: { bazaarUpdatedAt: bz?.lastUpdated ?? null, auctionsUpdatedAt: prices.updatedAt, auctionPages: prices.pages },
  });

  try {
    return buildReport({ player, profiles, profile, garden: gardenRes?.garden ?? null, book, petConstants: pets, attrConstants: attributes, accessoryIndex: accessories });
  } catch (err) {
    throw new ReportError(err.message, { status: err.status, code: err.code });
  }
}
