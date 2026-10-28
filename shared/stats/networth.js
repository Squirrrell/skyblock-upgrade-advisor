// Networth estimate: what the profile's items, pets, sacks, essence and
// shards are worth, plus coins. An item is its base price (the typical lowest
// BIN of the last few days, see prices.js) plus what has been applied to it:
// enchantments, recombobulator, potato books, stars, reforge stone, gems and
// the other upgrades below. Applied upgrades count at a share of their price,
// since they rarely sell back for full value. The shares and the enchantment
// rules follow SkyHelper Networth (github.com/Altpapier/SkyHelper-Networth,
// MIT), the library SkyCrypt uses, so the two estimates line up.

const GEM_TIERS = ['ROUGH', 'FLAWED', 'FINE', 'FLAWLESS', 'PERFECT'];

function gemIds(extra) {
  const gems = extra?.gems;
  if (!gems || typeof gems !== 'object') return [];
  const out = [];
  for (const [slot, value] of Object.entries(gems)) {
    if (slot === 'unlocked_slots' || slot.endsWith('_gem')) continue;
    const quality = typeof value === 'string' ? value : value?.quality;
    if (!GEM_TIERS.includes(quality)) continue;
    // Universal and stat slots (COMBAT_0) store the gem type in "<slot>_gem".
    const type = gems[`${slot}_gem`] ?? slot.split('_')[0];
    out.push(`${quality}_${type}_GEM`);
  }
  return out;
}

/** Share of an applied upgrade's price that counts toward the item. */
export const APPLIED_WORTH = {
  enchantment: 0.85,
  recombobulator: 0.8,
  hotPotato: 1,
  fumingPotato: 0.6,
  stars: 0.75,
  masterStar: 1,
  reforge: 1,
  gemstone: 1,
  artOfWar: 0.6,
  artOfPeace: 0.8,
  woodSingularity: 0.5,
  farmingForDummies: 0.5,
  transmissionTuner: 0.7,
  manaDisintegrator: 0.8,
  polarvoid: 1,
  jalapeno: 0.8,
  enrichment: 0.5,
  enchantmentUpgrade: 0.8,
  silex: 0.75,
  gemstoneSlot: 0.6,
  gemstoneChamber: 0.9,
  dye: 0.9,
  other: 1,
};

// Enchantments that sell for far more than they add to an item.
const ENCHANT_WORTH = { COUNTER_STRIKE: 0.2, BIG_BRAIN: 0.35, ULTIMATE_INFERNO: 0.35, OVERLOAD: 0.35, ULTIMATE_SOUL_EATER: 0.35, ULTIMATE_FATAL_TEMPO: 0.65 };

// Enchantments past their book level take an item: Smite VII a Severed Hand,
// Ender Slayer VII an Endstone Idol and so on. [item, from level, once per item].
const TURBO = [['TURBO_GOURD', 6, true], ['ENCHANTED_TURBO_GOURD', 7, true]];
const ENCHANT_UPGRADES = {
  SCAVENGER: [['GOLDEN_BOUNTY', 6]],
  PESTERMINATOR: [['PESTHUNTING_GUIDE', 6]],
  LUCK_OF_THE_SEA: [['GOLD_BOTTLE_CAP', 7]],
  PISCARY: [['TROUBLED_BUBBLE', 7]],
  FRAIL: [['SEVERED_PINCER', 7]],
  SPIKED_HOOK: [['OCTOPUS_TENDRIL', 7]],
  CHARM: [['CHAIN_END_TIMES', 6]],
  SMITE: [['SEVERED_HAND', 7]],
  ENDER_SLAYER: [['ENDSTONE_IDOL', 7]],
  BANE_OF_ARTHROPODS: [['ENSNARED_SNAIL', 7]],
  VENOMOUS: [['FATEFUL_STINGER', 7]],
  THORNS: [['PRICKLY_CREEPER', 4]],
  SCUBA: [['VIBRANT_CORAL', 6]],
  FOREST_PLEDGE: [['WATER_HYACINTH', 6]],
  KARMA: [['FORESTS_FAVOR', 6]],
  STEALTH: [['DISTANT_ECHO', 6]],
  ...Object.fromEntries(['WHEAT', 'CARROT', 'POTATO', 'PUMPKIN', 'MELON', 'MUSHROOMS', 'COCOA', 'CACTI', 'CANE', 'WARTS', 'SUNFLOWER', 'MOONFLOWER', 'ROSE'].map((c) => [`TURBO_${c}`, TURBO])),
};
// Enchantments whose level grows with use; only level 1 is ever sold.
const STACKING = new Set(['EXPERTISE', 'COMPACT', 'ABSORB', 'CULTIVATING', 'CHAMPION', 'HECATOMB', 'TOXOPHILITE']);
// Comes on the item for free (dungeon drops roll Scavenger V).
const IGNORED_ENCHANTS = { SCAVENGER: 5 };
const BLOCKED_ENCHANTS = {
  BONE_BOOMERANG: ['OVERLOAD', 'POWER', 'ULTIMATE_SOUL_EATER'],
  DEATH_BOW: ['OVERLOAD', 'POWER', 'ULTIMATE_SOUL_EATER'],
  GARDENING_AXE: ['REPLENISH'],
  GARDENING_HOE: ['REPLENISH'],
  ADVANCED_GARDENING_AXE: ['REPLENISH'],
  ADVANCED_GARDENING_HOE: ['REPLENISH'],
};

const MASTER_STARS = ['FIRST', 'SECOND', 'THIRD', 'FOURTH', 'FIFTH'];
const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];
const words = (id) => String(id).toLowerCase().replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

// Enchantments the game renamed but still stores under the old key.
const ENCHANT_NAMES = { DRAGON_HUNTER: 'Gravity', MAGMARIZER: 'Pyroclasm', BANE_OF_ARTHROPODS: 'Bane of Arthropods' };
/** An enchantment's in-game name: "ultimate_wise" -> "Ultimate Wise", "dragon_hunter" -> "Gravity". */
export const enchantName = (key) => ENCHANT_NAMES[String(key).toUpperCase()] ?? words(key);

// Upgrades stored as a count on the item: [ExtraAttributes key, item id, label, share].
const COUNTED = [
  ['art_of_war_count', 'THE_ART_OF_WAR', 'The Art of War', 'artOfWar'],
  ['wood_singularity_count', 'WOOD_SINGULARITY', 'Wood Singularity', 'woodSingularity'],
  ['farming_for_dummies_count', 'FARMING_FOR_DUMMIES', 'Farming for Dummies', 'farmingForDummies'],
  ['tuned_transmission', 'TRANSMISSION_TUNER', 'Transmission Tuner', 'transmissionTuner'],
  ['mana_disintegrator_count', 'MANA_DISINTEGRATOR', 'Mana Disintegrator', 'manaDisintegrator'],
  ['polarvoid', 'POLARVOID_BOOK', 'Polarvoid Book', 'polarvoid'],
  ['polarvoid_count', 'POLARVOID_BOOK', 'Polarvoid Book', 'polarvoid'],
  ['jalapeno_count', 'JALAPENO_BOOK', 'Jalapeno Book', 'jalapeno'],
];
// Upgrades stored as the applied item's id: [ExtraAttributes key, label].
const APPLIED_ITEMS = [
  ['drill_part_upgrade_module', 'Drill module'],
  ['drill_part_fuel_tank', 'Drill fuel tank'],
  ['drill_part_engine', 'Drill engine'],
  ['power_ability_scroll', 'Ability scroll'],
];

/**
 * An item's stars, by kind: { essence, master, kind, costs }. Dungeon items
 * take 5 essence stars, then up to 5 master stars (the red ➊-➎). Kuudra armor
 * (crimson essence) and a few other items take 10 essence stars instead,
 * the last five shown in pink. `kind` is 'dungeon', 'kuudra' or 'essence'.
 */
export function itemStars(item, book) {
  const extra = item.extra ?? {};
  const level = Number(extra.upgrade_level ?? extra.dungeon_item_level) || 0;
  const def = book.item?.(item.id);
  const costs = def?.upgrade_costs ?? [];
  if (!level) return { essence: 0, master: 0, kind: null, costs };
  const crimson = costs.some((tier) => tier.some((c) => c.essence_type === 'CRIMSON'));
  const kind = crimson ? 'kuudra' : costs.length > 5 ? 'essence' : 'dungeon';
  // Without the item list, a dungeon item past 5 is the only way to have more.
  const cap = costs.length || 5;
  const essence = Math.min(level, cap);
  const master = kind === 'dungeon' ? Math.max(0, Math.min(level, 10) - 5) : 0;
  return { essence, master, kind, costs };
}

/** "5 dungeon stars", "8 Kuudra stars" */
export function starLabel({ essence, kind }) {
  const what = { dungeon: 'dungeon star', kuudra: 'Kuudra star', essence: 'star' }[kind] ?? 'star';
  return `${essence} ${what}${essence === 1 ? '' : 's'}`;
}

/**
 * An item's value, itemised: { total, base, parts: [{ label, value }] }.
 * `base` is the item itself (times its stack size); each part is something
 * applied to it, at its APPLIED_WORTH share, largest first.
 */
export function itemValueParts(item, book) {
  if (item.id === 'PET' && item.petInfo) {
    const total = petValue({ type: item.petInfo.type, tier: item.petInfo.tier, heldItem: item.petInfo.heldItem }, book, null);
    return { total, base: total, parts: [] };
  }
  const extra = item.extra ?? {};
  // Networth worth: bazaar midpoint (see prices.js worth), else average lowest BIN.
  const v = (id) => (id ? (book.worth ?? book.value)(id) ?? 0 : 0);
  const parts = [];
  const add = (label, value) => {
    if (value > 0) parts.push({ label, value: Math.round(value) });
  };

  // A book is worth its enchantments in full; on gear they count at a share,
  // plus any item that took the enchantment past its book level.
  const book_ = item.id === 'ENCHANTED_BOOK';
  const once = new Set();
  for (const [key, lvl] of Object.entries(item.enchantments ?? extra.enchantments ?? {})) {
    const name = key.toUpperCase();
    if (BLOCKED_ENCHANTS[item.id]?.includes(name) || IGNORED_ENCHANTS[name] === lvl) continue;
    const level = STACKING.has(name) ? 1 : lvl;
    const label = `${enchantName(name)} ${ROMAN[lvl] ?? lvl}`;
    if (!book_) {
      if (name === 'EFFICIENCY' && lvl > 5) add(`Sil'ex x${lvl - 5}`, (lvl - 5) * v('SIL_EX') * APPLIED_WORTH.silex);
      for (const [upgrade, from, oncePerItem] of ENCHANT_UPGRADES[name] ?? []) {
        if (lvl < from || (oncePerItem && once.has(upgrade))) continue;
        once.add(upgrade);
        add(`${book.name?.(upgrade) ?? words(upgrade)} (${label})`, v(upgrade) * APPLIED_WORTH.enchantmentUpgrade);
      }
    }
    add(label, v(`ENCHANTMENT_${name}_${level}`) * (book_ ? 1 : ENCHANT_WORTH[name] ?? APPLIED_WORTH.enchantment));
  }
  if (item.recombobulated ?? extra.rarity_upgrades) add('Recombobulator 3000', v('RECOMBOBULATOR_3000') * APPLIED_WORTH.recombobulator);
  const potato = item.hotPotato ?? extra.hot_potato_count ?? 0;
  if (potato > 0) {
    const hot = Math.min(10, potato);
    add(`Hot Potato Book x${hot}`, hot * v('HOT_POTATO_BOOK') * APPLIED_WORTH.hotPotato);
    if (potato > 10) add(`Fuming Potato Book x${potato - 10}`, (potato - 10) * v('FUMING_POTATO_BOOK') * APPLIED_WORTH.fumingPotato);
  }

  // Stars: the essence (and items) each one cost, then master stars.
  const stars = itemStars(item, book);
  if (stars.essence) {
    let cost = 0;
    for (const tier of stars.costs.slice(0, stars.essence)) {
      for (const c of tier) {
        if (c.type === 'ESSENCE') cost += c.amount * v(`ESSENCE_${c.essence_type}`);
        else if (c.type === 'ITEM') cost += c.amount * v(c.item_id);
      }
    }
    add(starLabel(stars), cost * APPLIED_WORTH.stars);
  }
  for (let i = 0; i < stars.master; i++) add(`${words(MASTER_STARS[i])} Master Star`, v(`${MASTER_STARS[i]}_MASTER_STAR`) * APPLIED_WORTH.masterStar);

  const stone = book.reforgeStone?.(item.reforge ?? extra.modifier);
  if (stone) add(`${book.name?.(stone) ?? words(stone)} (reforge)`, v(stone) * APPLIED_WORTH.reforge);

  // Unlocked gem slots count only where they cost a lot: Divan's and Kuudra armor.
  const divan = /^DIVAN_(HELMET|CHESTPLATE|LEGGINGS|BOOTS|PENDANT)$/.test(item.id);
  const kuudra = /^((HOT|FIERY|BURNING|INFERNAL)_)?(AURORA|CRIMSON|TERROR|HOLLOW|FERVOR)_(HELMET|CHESTPLATE|LEGGINGS|BOOTS)$/.test(item.id);
  if ((divan || kuudra) && Array.isArray(extra.gems?.unlocked_slots)) {
    const slots = [...(book.item?.(item.id)?.gemstone_slots ?? [])];
    let cost = 0;
    for (const unlocked of extra.gems.unlocked_slots) {
      const i = slots.findIndex((sl) => String(unlocked).startsWith(sl.slot_type) && sl.costs);
      if (i < 0) continue;
      for (const c of slots[i].costs) cost += c.type === 'COINS' ? c.coins : c.type === 'ITEM' ? c.amount * v(c.item_id) : 0;
      slots.splice(i, 1);
    }
    add('Gemstone slots', cost * (divan ? APPLIED_WORTH.gemstoneChamber : APPLIED_WORTH.gemstoneSlot));
  }

  const gems = gemIds(extra);
  if (gems.length) add(`${gems.length} gemstone${gems.length === 1 ? '' : 's'}`, gems.reduce((n, id) => n + v(id), 0) * APPLIED_WORTH.gemstone);

  for (const [key, id, label, share] of COUNTED) {
    const n = Number(extra[key]) || 0;
    if (n > 0) add(n > 1 ? `${label} x${n}` : label, n * v(id) * APPLIED_WORTH[share]);
  }
  if (extra.artOfPeaceApplied) add('The Art of Peace', v('THE_ART_OF_PEACE') * APPLIED_WORTH.artOfPeace);
  if (extra.ethermerge) add('Etherwarp Conduit', v('ETHERWARP_CONDUIT') * APPLIED_WORTH.other);
  if (extra.talisman_enrichment) {
    const kind = String(extra.talisman_enrichment).toUpperCase();
    add(`${words(kind)} Enrichment`, v(`TALISMAN_ENRICHMENT_${kind}`) * APPLIED_WORTH.enrichment);
  }
  if (extra.dye_item) add(book.name?.(String(extra.dye_item).toUpperCase()) ?? 'Dye', v(String(extra.dye_item).toUpperCase()) * APPLIED_WORTH.dye);
  for (const [key, label] of APPLIED_ITEMS) {
    if (extra[key]) add(book.name?.(String(extra[key]).toUpperCase()) ?? label, v(String(extra[key]).toUpperCase()) * APPLIED_WORTH.other);
  }

  const base = Math.round(v(item.id) * (item.count || 1));
  parts.sort((a, b) => b.value - a.value);
  return { total: base + parts.reduce((n, p) => n + p.value, 0), base, parts };
}

export function itemValue(item, book) {
  return itemValueParts(item, book).total;
}

export function petValue(pet, book, levelInfo) {
  const key = `PET_${pet.type}_${pet.tier}`;
  const atMax = levelInfo && levelInfo.level != null && levelInfo.level >= levelInfo.maxLevel;
  // The plain key holds the cheapest listing at any level, so it is the
  // fair price for a pet that is not maxed yet.
  const base = book.value(key, { exact: !atMax }) ?? 0;
  const held = pet.heldItem ? (book.worth ?? book.value)(pet.heldItem) ?? 0 : 0;
  return base + held;
}

const LOCATION_GROUP = {
  Armor: 'Armor & equipment',
  Equipment: 'Armor & equipment',
  Loadout: 'Wardrobe & loadouts',
  Wardrobe: 'Wardrobe & loadouts',
  Inventory: 'Inventory',
  'Ender chest': 'Storage',
  Backpack: 'Storage',
  'Personal vault': 'Storage',
  'Accessory bag': 'Accessories',
  'Fishing bag': 'Bags',
  Quiver: 'Bags',
  'Potion bag': 'Bags',
  'Farming toolkit': 'Toolkits',
  'Hunting toolkit': 'Toolkits',
};

/**
 * Whether an item is soulbound: it can't be traded, so it can't be sold. The
 * lore says "* Soulbound *" or "* Co-op Soulbound *"; items given back from
 * the museum carry donated_museum.
 */
export function isSoulbound(item) {
  if (item.extra?.donated_museum) return true;
  return (item.lore ?? []).some((l) => /\* (Co-op )?Soulbound \*/.test(String(l).replace(/§./g, '')));
}

export function computeNetworth({ items, pets, member, profile, book }) {
  const categories = {};
  // The soulbound part of each category: counted in networth, but unsellable.
  const bound = {};
  const add = (cat, v, soulbound = false) => {
    if (!(v > 0)) return;
    categories[cat] = (categories[cat] ?? 0) + v;
    if (soulbound) bound[cat] = (bound[cat] ?? 0) + v;
  };
  const top = [];

  // Loadouts repeat the armor you are wearing, so count each item uuid once.
  const seen = new Set();
  for (const item of items) {
    if (item.uuid) {
      if (seen.has(item.uuid)) continue;
      seen.add(item.uuid);
    }
    const { total: v, base, parts } = itemValueParts(item, book);
    if (!v) continue;
    const soulbound = isSoulbound(item);
    add(LOCATION_GROUP[item.location] ?? 'Other', v, soulbound);
    top.push({ name: item.name, rawName: item.rawName, id: item.id, rarity: item.rarity, value: v, base, parts, soulbound, lore: item.lore, obtained: item.obtained, location: item.location, count: item.count });
  }

  for (const pet of pets) {
    const v = petValue(pet, book, pet);
    add('Pets', v);
    if (v) {
      // For the pet's card: what its lore at its level is built from.
      const card = { type: pet.type, tier: pet.tier, level: pet.level, heldItem: pet.heldItem, skin: pet.skin, candyUsed: pet.candyUsed, exp: pet.exp, xpCurrent: pet.xpCurrent, xpForNext: pet.xpForNext, xpMax: pet.xpMax };
      top.push({ name: `${pet.name} (Lvl ${pet.level ?? '?'})`, id: `PET_${pet.type}_${pet.tier}`, rarity: pet.tier, value: v, location: 'Pets', count: 1, pet: card });
    }
  }

  for (const [id, count] of Object.entries(member.inventory?.sacks_counts ?? {})) {
    if (count > 0) add('Sacks', ((book.worth ?? book.value)(id) ?? 0) * count);
  }
  // Hunting shards in the Hunting Box, at bazaar instant-sell.
  for (const shard of member.shards?.owned ?? []) {
    if (shard?.type && shard.amount_owned > 0) add('Shards', (book.value(`SHARD_${shard.type}`) ?? 0) * shard.amount_owned);
  }
  for (const [type, data] of Object.entries(member.currencies?.essence ?? {})) {
    add('Essence', ((book.worth ?? book.value)(`ESSENCE_${type}`) ?? 0) * (data?.current ?? 0));
  }

  const purse = member.currencies?.coin_purse ?? 0;
  const bank = profile.banking?.balance ?? 0;
  const personalBank = member.profile?.bank_account ?? 0;
  const itemsTotal = Object.values(categories).reduce((a, b) => a + b, 0);
  const soulbound = Object.values(bound).reduce((a, b) => a + b, 0);
  const total = Math.round(itemsTotal + purse + bank + personalBank);

  return {
    total,
    // What could actually be sold: everything but soulbound items.
    unsoulbound: Math.round(total - soulbound),
    soulbound: Math.round(soulbound),
    items: Math.round(itemsTotal),
    purse,
    bank,
    personalBank,
    categories: Object.entries(categories)
      .map(([name, value]) => ({ name, value: Math.round(value), soulbound: Math.round(bound[name] ?? 0) }))
      .sort((a, b) => b.value - a.value),
    top: top.sort((a, b) => b.value - a.value).slice(0, 15),
    inventoryOff: !member.inventory,
  };
}
