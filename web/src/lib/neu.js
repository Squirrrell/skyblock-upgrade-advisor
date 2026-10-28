// Item data (lore, recipes) from the NotEnoughUpdates data repository. The
// 1.8.9 mod is discontinued, but this repository is still kept up to date
// with each SkyBlock patch and is what current 1.21 mods (Firmament) read.
// Hypixel's own API has no lore or recipes. Loaded per item, on demand.
import { isPetType } from './icons.js';

const BASE = 'https://raw.githubusercontent.com/NotEnoughUpdates/NotEnoughUpdates-REPO/master/items/';
const items = new Map(); // id -> Promise<object | null>
const ready = new Map(); // id -> object | null, once loaded

/** The repository's JSON for an item, or null if it has none. Cached. */
export function loadNeuItem(id) {
  if (!items.has(id)) {
    items.set(
      id,
      fetch(`${BASE}${encodeURIComponent(id)}.json`)
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null)
        .then((item) => {
          ready.set(id, item);
          return item;
        }),
    );
  }
  return items.get(id);
}

/** The item if it has already loaded, undefined if not (yet). */
export const neuItemNow = (id) => (ready.has(id) ? ready.get(id) : undefined);

const RARITY_INDEX = ['COMMON', 'UNCOMMON', 'RARE', 'EPIC', 'LEGENDARY', 'MYTHIC'];

/** Repository ids to this site's: SQUID;4 -> PET_SQUID_LEGENDARY, ULTIMATE_WISE;1 -> ENCHANTMENT_ULTIMATE_WISE_1. */
export function siteId(neuId) {
  const m = /^(.+);(\d+)$/.exec(neuId);
  if (!m) return neuId;
  const [, base, n] = m;
  if (/^ATTRIBUTE_SHARD_/.test(base)) return neuId;
  if (isPetType(base) && RARITY_INDEX[n]) return `PET_${base}_${RARITY_INDEX[n]}`;
  return `ENCHANTMENT_${base}_${n}`;
}

/** "ENCHANTED_EMERALD:4" -> { id, count }. */
function ingredient(s) {
  if (!s) return null;
  const i = s.lastIndexOf(':');
  const id = i > 0 ? s.slice(0, i) : s;
  const count = i > 0 ? Number(s.slice(i + 1)) || 1 : 1;
  return { id: siteId(id), count };
}

/**
 * What crafting an item costs from its first crafting recipe, pricing each
 * ingredient with `price(id)` ({ unit } | null) or, when it has none, its own
 * crafting cost, a few levels deep. Resolves to a number, or null when some
 * ingredient can't be priced either way.
 */
export async function craftCost(id, price, depth = 3, seen = new Set()) {
  if (depth <= 0 || seen.has(id)) return null;
  const recipe = recipesOf(await loadNeuItem(id)).find((r) => r.type === 'crafting');
  if (!recipe) return null;
  const inner = new Set(seen).add(id);
  let total = 0;
  for (const c of recipe.grid) {
    if (!c) continue;
    const unit = price(c.id)?.unit ?? (await craftCost(c.id, price, depth - 1, inner));
    if (unit == null) return null;
    total += unit * c.count;
  }
  return total / recipe.count;
}

/**
 * The item's recipes in one shape: { type: 'crafting', grid: [9 x {id,count}|null], count }
 * or { type: 'forge' | 'npc_shop' | other, inputs: [{id,count}], duration? }.
 */
export function recipesOf(item) {
  if (!item) return [];
  const all = [...(item.recipe ? [{ type: 'crafting', ...item.recipe }] : []), ...(item.recipes ?? [])];
  return all.map((r) => {
    const type = r.type ?? 'crafting';
    if (type === 'crafting') {
      const grid = ['A1', 'A2', 'A3', 'B1', 'B2', 'B3', 'C1', 'C2', 'C3'].map((k) => ingredient(r[k]));
      return { type, grid, count: Number(r.count) || 1 };
    }
    return { type, inputs: (r.inputs ?? r.cost ?? []).map(ingredient).filter(Boolean), duration: r.duration ?? null };
  });
}
