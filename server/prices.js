// Live prices for the Node server: bazaar instant-buy prices plus lowest BIN
// from a full auction house scan, refreshed in the background.
import { createPriceBook, scanAuctionHouse } from '../shared/prices.js';
import { getAuctionPage, getBazaar, getItemsResource } from './hypixel.js';

const AUCTION_REFRESH_MS = 10 * 60_000;

let auctionSnapshot = { lowest: {}, updatedAt: 0, pages: 0 };
let auctionScan = null;

/** Kick off (or reuse) an auction scan. Resolves once a snapshot exists. */
export function refreshAuctions() {
  if (!auctionScan) {
    auctionScan = scanAuctionHouse(getAuctionPage)
      .then((snap) => {
        auctionSnapshot = snap;
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
  const [bazaar, auctions, items] = await Promise.all([getBazaar().catch(() => null), auctionsReady(), loadItems()]);
  return createPriceBook({
    bazaarProducts: bazaar?.products,
    lowest: auctions.lowest,
    items,
    meta: {
      bazaarUpdatedAt: bazaar?.lastUpdated ?? null,
      auctionsUpdatedAt: auctions.updatedAt || null,
      auctionPages: auctions.pages,
    },
  });
}
