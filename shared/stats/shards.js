// Hunting shards: every shard type the player holds (Hypixel's Hunting Box,
// member.shards.owned) or has syphoned into an attribute
// (member.attributes.stacks), named and priced from the bazaar. The account's
// shard value counts both: held shards could be sold, syphoned ones are what
// the attribute levels cost.
import { attributeLevel } from '../analyze/attributes.js';
import { prettyId } from '../analyze/helpers.js';

const RARITY_ORDER = ['COMMON', 'UNCOMMON', 'RARE', 'EPIC', 'LEGENDARY'];

/**
 * The attributes.stacks key: NEU's internal name without the prefix
 * (ATTRIBUTE_SHARD_VISITOR_BAIT;1 -> visitor_bait), or failing that the
 * ability name in snake case ("Pest Fortune" -> pest_fortune).
 */
const internalKey = (def) => /^ATTRIBUTE_SHARD_(.+?)(;\d+)?$/.exec(def.internalName ?? '')?.[1]?.toLowerCase();
const abilityKey = (name) =>
  String(name ?? '')
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');

export function shardStats(member, book, constants) {
  const defs = constants?.attributes ?? [];
  const byType = new Map(defs.map((d) => [d.bazaarName.replace(/^SHARD_/, ''), d]));
  const byAbility = new Map(defs.map((d) => [abilityKey(d.abilityName), d]));
  for (const d of defs) if (internalKey(d)) byAbility.set(internalKey(d), d);
  const stacks = member.attributes?.stacks ?? {};
  const rows = new Map(); // SHARD_X -> row

  const rowFor = (def, type) => {
    const id = def?.bazaarName ?? `SHARD_${type}`;
    if (!rows.has(id)) {
      const rarity = def?.rarity ?? null;
      rows.set(id, {
        id,
        name: `${def?.displayName ?? prettyId(type)} Shard`,
        code: def?.shardId ?? null,
        rarity,
        rarityIndex: RARITY_ORDER.indexOf(rarity),
        attribute: def?.abilityName ?? null,
        family: def?.family ?? [],
        alignment: def?.alignment ?? null,
        owned: 0,
        captured: null,
        syphoned: 0,
        level: 0,
        maxLevel: 0,
        // Bazaar instant-sell (what you would get now) and instant-buy.
        sell: book?.value?.(id) ?? null,
        buy: book?.price?.(id)?.unit ?? null,
        heldValue: 0,
        syphonedValue: 0,
        value: 0,
      });
    }
    return rows.get(id);
  };

  for (const s of member.shards?.owned ?? []) {
    if (!s?.type) continue;
    const row = rowFor(byType.get(s.type), s.type);
    row.owned += s.amount_owned ?? 0;
    if (s.captured) row.captured = Math.max(row.captured ?? 0, s.captured);
  }
  for (const [key, count] of Object.entries(stacks)) {
    const def = byAbility.get(key);
    if (!def || !count) continue;
    rowFor(def, def.bazaarName.replace(/^SHARD_/, '')).syphoned = count;
  }

  const list = [...rows.values()];
  for (const row of list) {
    if (row.rarity) {
      const lvl = attributeLevel(row.syphoned, row.rarity, constants);
      row.level = lvl.level;
      row.maxLevel = lvl.maxLevel;
    }
    row.heldValue = (row.sell ?? 0) * row.owned;
    row.syphonedValue = (row.sell ?? 0) * row.syphoned;
    row.value = row.heldValue + row.syphonedValue;
  }
  list.sort((a, b) => b.value - a.value || b.owned - a.owned || a.name.localeCompare(b.name));

  const owned = list.filter((r) => r.owned > 0);
  const total = (f) => list.reduce((n, r) => n + f(r), 0);
  return {
    list,
    typesOwned: owned.length,
    typesTotal: defs.length,
    owned: owned.reduce((n, r) => n + r.owned, 0),
    // Everything the account has in shards, held and syphoned, at instant-sell.
    value: total((r) => r.value),
    heldValue: total((r) => r.heldValue),
    syphonedValue: total((r) => r.syphonedValue),
    // The same shards at instant-buy: what collecting them again would cost.
    buyValue: total((r) => (r.buy ?? r.sell ?? 0) * (r.owned + r.syphoned)),
    unpriced: list.filter((r) => r.sell == null).length,
    syphoned: list.reduce((n, r) => n + r.syphoned, 0),
    attributes: list.filter((r) => r.syphoned > 0).length,
    maxedAttributes: list.filter((r) => r.maxLevel && r.level >= r.maxLevel).length,
    fused: member.shards?.fused ?? 0,
  };
}
