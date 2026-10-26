// Missing accessories, SkyCrypt style: every accessory in the game you do
// not own, collapsed so only the next step of each upgrade line shows, priced
// and ranked by coins per magical power.

export const MAGICAL_POWER = { COMMON: 3, UNCOMMON: 5, RARE: 8, EPIC: 12, LEGENDARY: 16, MYTHIC: 22, DIVINE: 22, SPECIAL: 3, VERY_SPECIAL: 5 };

/**
 * Small index shipped with the site. `items` is the Hypixel items resource,
 * `misc` is NEU constants/misc.json (talisman_upgrades, ignored_talisman).
 */
export function buildAccessoryIndex(items, misc = {}) {
  const ignored = new Set(misc.ignored_talisman ?? []);
  const list = items
    .filter((i) => i.category === 'ACCESSORY' && i.origin !== 'RIFT' && !ignored.has(i.id))
    .map((i) => ({ id: i.id, name: i.name, tier: i.tier ?? 'COMMON' }));
  const known = new Set(list.map((a) => a.id));
  const upgrades = {};
  for (const [id, better] of Object.entries(misc.talisman_upgrades ?? {})) {
    if (known.has(id)) upgrades[id] = better.filter((b) => known.has(b));
  }
  return { list, upgrades };
}

export function missingAccessories(ownedItems, index, book) {
  if (!index?.list?.length) return null;
  const owned = new Map();
  for (const item of ownedItems) {
    const prev = owned.get(item.id);
    if (!prev || (MAGICAL_POWER[item.rarity] ?? 0) > (MAGICAL_POWER[prev] ?? 0)) owned.set(item.id, item.rarity);
  }
  const lower = {};
  for (const [id, better] of Object.entries(index.upgrades)) for (const b of better) (lower[b] ??= []).push(id);

  const rows = [];
  for (const acc of index.list) {
    if (owned.has(acc.id)) continue;
    if ((index.upgrades[acc.id] ?? []).some((b) => owned.has(b))) continue;
    const from = (lower[acc.id] ?? [])
      .filter((b) => owned.has(b))
      .sort((a, b) => (MAGICAL_POWER[owned.get(b)] ?? 0) - (MAGICAL_POWER[owned.get(a)] ?? 0))[0];
    // Without the previous tier, only the bottom of the line is worth showing.
    if (!from && lower[acc.id]?.length) continue;
    // For an upgrade, skip it when an in-between tier is still missing.
    if (from && (index.upgrades[from] ?? []).some((b) => b !== acc.id && !owned.has(b) && (index.upgrades[b] ?? []).includes(acc.id))) continue;

    const mp = (MAGICAL_POWER[acc.tier] ?? 0) - (from ? MAGICAL_POWER[owned.get(from)] ?? 0 : 0);
    const p = book.price(acc.id);
    rows.push({
      id: acc.id,
      name: acc.name,
      tier: acc.tier,
      upgradeFrom: from ? index.list.find((a) => a.id === from)?.name ?? from : null,
      mp,
      price: p?.unit ?? null,
      source: p?.source ?? null,
      perMp: p?.unit && mp > 0 ? p.unit / mp : null,
    });
  }
  rows.sort((a, b) => (a.perMp ?? Infinity) - (b.perMp ?? Infinity) || a.name.localeCompare(b.name));
  return {
    rows,
    total: rows.length,
    totalMp: rows.reduce((n, r) => n + Math.max(0, r.mp), 0),
    totalCost: Math.round(rows.reduce((n, r) => n + (r.price ?? 0), 0)),
  };
}
