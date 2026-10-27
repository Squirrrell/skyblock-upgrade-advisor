// Price lookups shared by the Node server and the static (GitHub Pages) build.
import { decodeNbtBase64 } from './nbt.js';

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

function recordLowest(out, key, price) {
  if (out[key] === undefined || price < out[key]) out[key] = price;
}

/** Keep the `max` cheapest BIN listings of an item, cheapest first. */
function recordListing(out, key, listing, max) {
  const list = (out[key] ??= []);
  if (list.length >= max && listing.price >= list[list.length - 1].price) return;
  list.push(listing);
  list.sort((a, b) => a.price - b.price);
  if (list.length > max) list.pop();
}

/**
 * Scan every auction page and keep the lowest BIN per item id. Pets are keyed
 * PET_<TYPE>_<TIER>, with level 100/200 listings also stored under "...@MAX".
 * `fetchPage(n)` returns the parsed JSON for one page. For ids where
 * `listFor(id)` is true, the cheapest `listings` BIN auctions are kept too.
 */
export async function scanAuctionHouse(fetchPage, { concurrency = 6, listFor = null, listings: maxListings = 5 } = {}) {
  const lowest = {};
  const listings = {};
  const first = await fetchPage(0);
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
      if (listFor?.(key)) {
        recordListing(
          listings,
          key,
          { uuid: auction.uuid, price: auction.starting_bid, count: item.Count || 1, name: auction.item_name, tier: auction.tier, end: auction.end },
          maxListings,
        );
      }
      // Pets are priced very differently at max level, so track that separately.
      if (key.startsWith('PET_') && /^\[Lvl (100|200)\]/.test(auction.item_name)) {
        recordLowest(lowest, `${key}@MAX`, unit);
      }
    }
  };

  handlePage(first);
  let next = 1;
  const workers = Array.from({ length: concurrency }, async () => {
    while (next < totalPages) {
      const page = next++;
      try {
        handlePage(await fetchPage(page));
      } catch {
        // A missing page only means a few items lack a price this cycle.
      }
    }
  });
  await Promise.all(workers);
  return { lowest, listings, pages: totalPages, updatedAt: Date.now() };
}

/**
 * Build the price book the analyzers use. `price(id)` returns
 * { unit, source, note? } or null; bazaar wins over auctions.
 *
 * - bazaarProducts: `products` from /v2/skyblock/bazaar
 * - lowest: { [auctionKey]: price } from scanAuctionHouse
 * - items: Map of item id -> Hypixel item resource entry
 */
export function createPriceBook({ bazaarProducts = {}, lowest = {}, items = new Map(), meta = {} }) {
  function price(id) {
    if (!id) return null;
    const product = bazaarProducts[id];
    if (product) {
      const unit = product.quick_status?.buyPrice || product.buy_summary?.[0]?.pricePerUnit;
      if (unit) return { unit, source: 'bazaar' };
    }
    if (lowest[`${id}@MAX`] !== undefined) return { unit: lowest[`${id}@MAX`], source: 'auction', note: 'level 100' };
    if (lowest[id] !== undefined) return { unit: lowest[id], source: 'auction' };
    return null;
  }

  /**
   * What an item is worth if sold now: bazaar instant-sell, else lowest BIN.
   * `exact` skips the level 100 pet listing, for pets below max level.
   */
  function value(id, { exact = false } = {}) {
    if (!id) return null;
    const product = bazaarProducts[id];
    if (product) {
      const unit = product.quick_status?.sellPrice || product.sell_summary?.[0]?.pricePerUnit;
      if (unit) return unit;
    }
    if (!exact && lowest[`${id}@MAX`] !== undefined) return lowest[`${id}@MAX`];
    return lowest[id] ?? null;
  }

  return {
    price,
    value,
    name: (id) => items.get(id)?.name ?? null,
    item: (id) => items.get(id) ?? null,
    meta,
  };
}

/**
 * Keep only the item fields the analyzers read, so the static build ships a
 * small item index instead of the 5 MB resource file.
 */
export function slimItems(items) {
  return items.map((item) => {
    const out = { id: item.id, name: item.name };
    const slots = item.gemstone_slots?.filter((s) => s.slot_type === 'PERIDOT');
    if (slots?.length) out.gemstone_slots = slots;
    // Used by the item icons: rarity colour, enchant glint, player-head texture.
    if (item.tier) out.tier = item.tier;
    if (item.glowing) out.glowing = true;
    const skull = skullHash(item.skin?.value);
    if (skull) out.skull = skull;
    // Minecraft material and data value ("INK_SACK:3") and dye colour ("R,G,B").
    if (item.material) out.mat = `${item.material}:${item.durability ?? 0}`;
    if (item.color) out.color = item.color;
    // The model Hypixel's SkyBlock resource pack draws it with.
    if (item.item_model) out.model = item.item_model;
    return out;
  });
}

/** The textures.minecraft.net hash inside a base64 skin property, or null. */
export function skullHash(value) {
  if (!value) return null;
  try {
    // Read the URL rather than parsing: some skins (in NEU's data) are written
    // with unquoted keys, {textures:{SKIN:{url:"..."}}}, which isn't JSON.
    return /textures\.minecraft\.net\/texture\/([0-9a-f]+)/i.exec(atob(value))?.[1] ?? null;
  } catch {
    return null;
  }
}
