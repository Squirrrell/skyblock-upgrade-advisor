// Foraging Fortune and Sweep upgrades for one player, ranked by what each
// point costs: better gear for each slot, better reforges on the gear they
// wear, a better foraging pet, and Heart of the Forest perks (paid in
// whispers, not coins). Gear stats come from foraging.json (the NEU item data,
// scripts/build-foraging.mjs); what the player has comes from their own lore.

export const SLOTS = ['HELMET', 'CHESTPLATE', 'LEGGINGS', 'BOOTS', 'AXE', 'NECKLACE', 'CLOAK', 'BELT', 'GLOVES', 'BRACELET'];
const ARMOR = new Set(['HELMET', 'CHESTPLATE', 'LEGGINGS', 'BOOTS']);
const EQUIPMENT = new Set(['NECKLACE', 'CLOAK', 'BELT', 'GLOVES', 'BRACELET']);
// Gloves and bracelets share the equipment slot.
const SLOT_OF = { BRACELET: 'GLOVES' };
const slotOf = (type) => SLOT_OF[type] ?? type;

const statOf = (x, metric) => (metric === 'sweep' ? x.sweep : x.fortune) ?? 0;

/** A pet's Fortune and Sweep at `level`, between its level 1 and 100 stats. */
export function petStats(p, level) {
  const t = Math.max(0, Math.min(1, ((level ?? 100) - 1) / 99));
  return { fortune: p.lo.fortune + (p.hi.fortune - p.lo.fortune) * t, sweep: p.lo.sweep + (p.hi.sweep - p.lo.sweep) * t };
}

/** What each slot holds now: the worn piece (or best axe), with its base stats from the item data. */
export function currentSlots(gear, db) {
  const byId = new Map(db.items.map((i) => [i.id, i]));
  const out = {};
  for (const p of [...gear.armor, ...gear.equipment, ...(gear.axe ? [gear.axe] : [])]) {
    const base = byId.get(p.id);
    const type = base?.type ?? p.type;
    if (!type) continue;
    const slot = slotOf(type);
    // The lore total includes reforge, gems and enchantments; the base is the item itself.
    out[slot] = { ...p, type, base: base ? { fortune: base.fortune, sweep: base.sweep } : { fortune: p.fortune, sweep: p.sweep } };
  }
  return out;
}

const reforgeFits = (r, piece) => (r.ids ? r.ids.includes(piece.id) : r.types === piece.type || (r.types === 'ARMOR' && ARMOR.has(piece.type)) || (r.types === 'EQUIPMENT' && EQUIPMENT.has(piece.type)));

/**
 * Every upgrade with its gain in `metric` ('fortune' or 'sweep') and coin
 * cost (null when nothing is for sale), best value first.
 * `price(id)` -> { unit } | null.
 */
export function upgrades({ gear, perks, disabled, pets, db, price, metric, hotf }) {
  const list = [];
  const slots = currentSlots(gear, db);

  // Gear: for each slot, every item that beats the current one.
  for (const slot of SLOTS) {
    if (slot === 'BRACELET') continue;
    const now = slots[slot];
    const have = now ? statOf(now.base, metric) : 0;
    const options = db.items.filter((i) => slotOf(i.type) === slot && statOf(i, metric) > have);
    for (const o of options) {
      const cost = price(o.id)?.unit ?? null;
      list.push({ kind: 'gear', key: `gear-${o.id}`, slot, id: o.id, name: o.name, tier: o.tier, from: now?.name ?? null, gain: statOf(o, metric) - have, cost });
    }
  }

  // Reforges: the best reforge for each worn piece, at the piece's rarity.
  for (const piece of Object.values(slots)) {
    const rarity = piece.rarity;
    const current = db.reforges.find((r) => r.modifier === String(piece.reforge ?? '').toLowerCase());
    const have = current?.stats?.[rarity] ? statOf(current.stats[rarity], metric) : 0;
    const best = db.reforges
      .filter((r) => reforgeFits(r, piece) && r.stats[rarity])
      .map((r) => ({ r, gain: statOf(r.stats[rarity], metric) - have }))
      .filter((x) => x.gain > 0)
      .sort((a, b) => b.gain - a.gain)[0];
    if (!best) continue;
    // Blacksmith reforges are a random roll, so they have no fixed price.
    const cost = best.r.stone ? price(best.r.stone)?.unit ?? null : null;
    list.push({
      kind: 'reforge',
      key: `reforge-${piece.id}`,
      slot: piece.type,
      id: best.r.stone ?? piece.id,
      name: `${best.r.name} on ${piece.name.replace(/^\S+\s/, '')}`,
      from: current?.name ?? (piece.reforge ? piece.reforge : 'no reforge'),
      gain: best.gain,
      cost,
      note: best.r.stone ? 'Reforge stone, plus the blacksmith fee' : 'Blacksmith reforge (random roll)',
    });
  }

  // Pets: the best foraging pet owned, and any better one at level 100.
  const ownedBest = Math.max(
    0,
    ...pets.map((p) => {
      const def = db.pets.find((d) => d.type === p.type && d.tier === p.tier);
      return def ? statOf(petStats(def, p.level), metric) : 0;
    }),
  );
  for (const def of db.pets) {
    const gain = statOf(def.hi, metric) - ownedBest;
    if (gain <= 0) continue;
    const id = `PET_${def.type}_${def.tier}`;
    // Only a level 100 listing prices it fairly; a low-level one is far cheaper.
    const cost = price(`${id}@MAX`)?.unit ?? null;
    const words = (s) => s.toLowerCase().replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
    list.push({
      kind: 'pet',
      key: `pet-${id}`,
      slot: 'PET',
      id,
      name: `${words(def.tier)} ${words(def.type)}, level 100`,
      tier: def.tier,
      gain,
      cost,
      note: cost == null ? 'No level 100 listing right now' : null,
    });
  }

  // Heart of the Forest: paid in whispers, so listed apart from the coin upgrades.
  const perkGain = { foraging_fortune: { fortune: 3, sweep: 0 }, sweep: { fortune: 0, sweep: 1 } };
  for (const [id, per] of Object.entries(perkGain)) {
    const perk = hotf?.perks?.[id];
    if (!perk) continue;
    const left = perk.maxLevel - (perks[id] ?? 0);
    const gain = left * statOf(per, metric);
    if (gain > 0) list.push({ kind: 'perk', key: `perk-${id}`, slot: 'HOTF', id, name: `${perk.name} to ${perk.maxLevel}`, gain, cost: null, note: 'Paid in whispers' });
  }
  if (!(perks.foraging_madness > 0) || disabled.includes('foraging_madness')) {
    const gain = metric === 'sweep' ? 10 : 50;
    list.push({ kind: 'perk', key: 'perk-foraging_madness', slot: 'HOTF', id: 'foraging_madness', name: 'Foraging Madness', gain, cost: null, note: 'Paid in whispers' });
  }

  for (const u of list) u.perPoint = u.cost != null && u.gain > 0 ? u.cost / u.gain : null;
  // Priced upgrades by coins per point, then free ones, then unpriced.
  const rank = (u) => (u.perPoint != null ? 0 : u.kind === 'perk' ? 1 : 2);
  return list.sort((a, b) => rank(a) - rank(b) || (a.perPoint ?? 0) - (b.perPoint ?? 0) || b.gain - a.gain);
}
