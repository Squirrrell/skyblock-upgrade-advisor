// Live prices: bazaar instant-buy prices plus lowest BIN from a full scan of
// the auction house. Both come from the public Hypixel API (no key needed).
import { getAuctionPage, getBazaar, getItemsResource } from './hypixel.js';
import { decodeNbtBase64 } from './lib/nbt.js';

const AUCTION_REFRESH_MS = 10 * 60_000;
const PAGE_CONCURRENCY = 6;

let auctionSnapshot = { lowest: new Map(), updatedAt: 0, pages: 0 };
let auctionScan = null;

function auctionKey(extra) {
  const id = extra?.id;
  if (!id) return null;
  if (id === 'PET' && extra.petInfo) {
    try {
      const info = JSON.parse(extra.petInfo);
      return `PET_${info.type}_${info.tier}`;
    } catch {
      return null;
    }
  }
  return id;
}

function recordLowest(map, key, price, extra = {}) {
  const prev = map.get(key);
  if (!prev || price < prev.price) map.set(key, { price, ...extra });
}

async function scanAuctionHouse() {
  const lowest = new Map();
  const first = await getAuctionPage(0);
  if (!first?.success) throw new Error('auction page 0 failed');
  const totalPages = first.totalPages ?? 1;

  const handlePage = (page) => {
    for (const auction of page?.auctions ?? []) {
      if (!auction.bin || auction.claimed) continue;
      let item;
      try {
        item = decodeNbtBase64(auction.item_bytes)?.i?.[0];
      } catch {
        continue;
      }
      const key = auctionKey(item?.tag?.ExtraAttributes);
      if (!key) continue;
      const unit = auction.starting_bid / (item.Count || 1);
      recordLowest(lowest, key, unit);
      // Pets are priced very differently at level 100, so track that separately.
      if (key.startsWith('PET_') && /^\[Lvl (100|200)\]/.test(auction.item_name)) {
        recordLowest(lowest, `${key}@MAX`, unit);
      }
    }
  };

  handlePage(first);
  let next = 1;
  const workers = Array.from({ length: PAGE_CONCURRENCY }, async () => {
    while (next < totalPages) {
      const page = next++;
      try {
        handlePage(await getAuctionPage(page));
      } catch {
        // A missing page only means a few items lack a price this cycle.
      }
    }
  });
  await Promise.all(workers);

  auctionSnapshot = { lowest, updatedAt: Date.now(), pages: totalPages };
  return auctionSnapshot;
}

/** Kick off (or reuse) an auction scan. Resolves once a snapshot exists. */
export function refreshAuctions() {
  if (!auctionScan) {
    auctionScan = scanAuctionHouse()
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

/**
 * Build a price book for one analysis run. `price(id)` returns
 * { unit, source } or null. Bazaar wins over auctions when an item is on both.
 */
export async function getPriceBook() {
  const [bazaar, auctions, items] = await Promise.all([
    getBazaar().catch(() => null),
    auctionsReady(),
    loadItems(),
  ]);
  const products = bazaar?.products ?? {};

  function price(id) {
    if (!id) return null;
    const product = products[id];
    if (product) {
      const unit = product.quick_status?.buyPrice || product.buy_summary?.[0]?.pricePerUnit;
      if (unit) return { unit, source: 'bazaar' };
    }
    const maxPet = auctions.lowest.get(`${id}@MAX`);
    if (maxPet) return { unit: maxPet.price, source: 'auction', note: 'level 100' };
    const lowest = auctions.lowest.get(id);
    if (lowest) return { unit: lowest.price, source: 'auction' };
    return null;
  }

  return {
    price,
    name: (id) => items.get(id)?.name ?? null,
    item: (id) => items.get(id) ?? null,
    meta: {
      bazaarUpdatedAt: bazaar?.lastUpdated ?? null,
      auctionsUpdatedAt: auctions.updatedAt || null,
      auctionPages: auctions.pages,
    },
  };
}
