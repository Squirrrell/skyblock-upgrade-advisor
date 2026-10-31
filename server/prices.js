// Live prices for the Node server: bazaar instant-buy prices plus lowest BIN
// from a full auction house scan, refreshed in the background. Each scan
// also adds to a 3-day lowest BIN history (kept in .cache/), whose typical
// value is what networth counts items at.
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { averageLowest, createPriceBook, lastSeen, reforgeStones, scanAuctionHouse, slimItems, updateHistory } from '../shared/prices.js';
import { getAuctionPage, getBazaar, getItemsResource } from './hypixel.js';
import { getAttributeConstants, getReforgeStones } from './repo.js';

const HISTORY_FILE = new URL('../.cache/price-history.json', import.meta.url);
let history = null;
let average = {};

async function loadHistory() {
  if (history) return history;
  try {
    history = JSON.parse(await readFile(HISTORY_FILE, 'utf8'));
  } catch {
    history = { times: [], prices: {} };
  }
  average = averageLowest(history);
  return history;
}

async function recordHistory(lowest) {
  history = updateHistory(await loadHistory(), lowest);
  average = averageLowest(history);
  try {
    await mkdir(new URL('.', HISTORY_FILE), { recursive: true });
    await writeFile(HISTORY_FILE, JSON.stringify(history));
  } catch (err) {
    console.warn(`[prices] could not save the price history: ${err.message}`);
  }
}

const AUCTION_REFRESH_MS = 10 * 60_000;

let auctionSnapshot = { lowest: {}, listings: {}, updatedAt: 0, pages: 0 };
let auctionScan = null;

/** Kick off (or reuse) an auction scan. Resolves once a snapshot exists. */
export function refreshAuctions() {
  if (!auctionScan) {
    // Accessories keep their cheapest listings too, for the accessory popup.
    auctionScan = loadItems()
      .catch(() => new Map())
      .then((items) => scanAuctionHouse(getAuctionPage, { listFor: (id) => items.get(id)?.category === 'ACCESSORY' }))
      .then((snap) => {
        auctionSnapshot = snap;
        recordHistory(snap.lowest).catch(() => {});
        return snap;
      })
      .catch((err) => {
        console.warn(`[prices] auction scan failed: ${err.message}`);
        return auctionSnapshot;
      })
      .finally(() => {
        auctionScan = null;
      });
  }
  return auctionScan;
}

export function startAuctionPolling() {
  refreshAuctions();
  setInterval(refreshAuctions, AUCTION_REFRESH_MS).unref();
}

/** Wait for the first auction scan, but never longer than `timeoutMs`. */
async function auctionsReady(timeoutMs = 20_000) {
  if (auctionSnapshot.updatedAt) return auctionSnapshot;
  const scan = refreshAuctions();
  await Promise.race([scan, new Promise((r) => setTimeout(r, timeoutMs))]);
  return auctionSnapshot;
}

let itemIndex = null;
async function loadItems() {
  if (itemIndex) return itemIndex;
  try {
    const items = await getItemsResource();
    itemIndex = new Map(items.map((item) => [item.id, item]));
  } catch {
    // Retry on the next request instead of caching an empty index forever.
    return new Map();
  }
  return itemIndex;
}

export async function getPriceBook() {
  const [bazaar, auctions, items, stones] = await Promise.all([
    getBazaar().catch(() => null),
    auctionsReady(),
    loadItems(),
    getReforgeStones(),
    loadHistory(),
  ]);
  return createPriceBook({
    bazaarProducts: bazaar?.products,
    lowest: auctions.lowest,
    average,
    last: lastSeen(history, auctions.lowest),
    reforges: reforgeStones(stones),
    items,
    meta: {
      bazaarUpdatedAt: bazaar?.lastUpdated ?? null,
      auctionsUpdatedAt: auctions.updatedAt || null,
      auctionPages: auctions.pages,
    },
  });
}

/** The same files the static build publishes under data/, for the tools pages. */
export async function getDataFile(name) {
  if (name === 'prices.json') {
    const snap = await auctionsReady();
    await loadHistory();
    return { updatedAt: snap.updatedAt, pages: snap.pages, lowest: snap.lowest, average, last: lastSeen(history, snap.lowest) };
  }
  if (name === 'listings.json') {
    const snap = await auctionsReady();
    return { updatedAt: snap.updatedAt, listings: snap.listings ?? {} };
  }
  if (name === 'items.json') return slimItems([...(await loadItems()).values()]);
  // The item icons map SHARD_ ids to attribute shard textures with this list.
  if (name === 'attribute_shards.json') return getAttributeConstants();
  if (name === 'reforges.json') return reforgeStones(await getReforgeStones());
  if (name === 'price-history.json') return loadHistory();
  // Built by scripts/build-foraging.mjs (npm run foraging-data).
  if (name === 'foraging.json') {
    try {
      return JSON.parse(await readFile(new URL('../.cache/foraging.json', import.meta.url), 'utf8'));
    } catch {
      return null;
    }
  }
  return null;
}

export async function getItemList() {
  return [...(await loadItems()).values()];
}
