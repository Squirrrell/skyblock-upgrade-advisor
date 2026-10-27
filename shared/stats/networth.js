// Rough networth: what the profile's items, pets, sacks and essence would
// sell for right now, plus coins. Item value is the base item price plus
// the upgrades that are easy to price (recombobulator, potato books,
// gemstones, pet items). Enchantments, reforges and stars are not added, so
// heavily upgraded gear is undervalued.

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

export function itemValue(item, book) {
  if (item.id === 'PET' && item.petInfo) {
    return petValue({ type: item.petInfo.type, tier: item.petInfo.tier, heldItem: item.petInfo.heldItem }, book, null);
  }
  const unit = book.value(item.id) ?? 0;
  let extras = 0;
  if (item.recombobulated) extras += book.value('RECOMBOBULATOR_3000') ?? 0;
  const potato = item.hotPotato ?? 0;
  if (potato > 0) {
    extras += Math.min(10, potato) * (book.value('HOT_POTATO_BOOK') ?? 0);
    if (potato > 10) extras += (potato - 10) * (book.value('FUMING_POTATO_BOOK') ?? 0);
  }
  for (const id of gemIds(item.extra)) extras += book.value(id) ?? 0;
  if (!unit && !extras) return 0;
  return unit * (item.count || 1) + extras;
}

export function petValue(pet, book, levelInfo) {
  const key = `PET_${pet.type}_${pet.tier}`;
  const atMax = levelInfo && levelInfo.level != null && levelInfo.level >= levelInfo.maxLevel;
  // The plain key holds the cheapest listing at any level, so it is the
  // fair price for a pet that is not maxed yet.
  const base = book.value(key, { exact: !atMax }) ?? 0;
  const held = pet.heldItem ? book.value(pet.heldItem) ?? 0 : 0;
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

export function computeNetworth({ items, pets, member, profile, book }) {
  const categories = {};
  const add = (cat, v) => {
    if (v > 0) categories[cat] = (categories[cat] ?? 0) + v;
  };
  const top = [];

  // Loadouts repeat the armor you are wearing, so count each item uuid once.
  const seen = new Set();
  for (const item of items) {
    if (item.uuid) {
      if (seen.has(item.uuid)) continue;
      seen.add(item.uuid);
    }
    const v = itemValue(item, book);
    if (!v) continue;
    add(LOCATION_GROUP[item.location] ?? 'Other', v);
    top.push({ name: item.name, id: item.id, rarity: item.rarity, value: v, location: item.location, count: item.count });
  }

  for (const pet of pets) {
    const v = petValue(pet, book, pet);
    add('Pets', v);
    if (v) top.push({ name: `${pet.name} (Lvl ${pet.level ?? '?'})`, id: `PET_${pet.type}_${pet.tier}`, rarity: pet.tier, value: v, location: 'Pets', count: 1 });
  }

  for (const [id, count] of Object.entries(member.inventory?.sacks_counts ?? {})) {
    if (count > 0) add('Sacks', (book.value(id) ?? 0) * count);
  }
  // Hunting shards in the Hunting Box, at bazaar instant-sell.
  for (const shard of member.shards?.owned ?? []) {
    if (shard?.type && shard.amount_owned > 0) add('Shards', (book.value(`SHARD_${shard.type}`) ?? 0) * shard.amount_owned);
  }
  for (const [type, data] of Object.entries(member.currencies?.essence ?? {})) {
    add('Essence', (book.value(`ESSENCE_${type}`) ?? 0) * (data?.current ?? 0));
  }

  const purse = member.currencies?.coin_purse ?? 0;
  const bank = profile.banking?.balance ?? 0;
  const personalBank = member.profile?.bank_account ?? 0;
  const itemsTotal = Object.values(categories).reduce((a, b) => a + b, 0);

  return {
    total: Math.round(itemsTotal + purse + bank + personalBank),
    items: Math.round(itemsTotal),
    purse,
    bank,
    personalBank,
    categories: Object.entries(categories)
      .map(([name, value]) => ({ name, value: Math.round(value) }))
      .sort((a, b) => b.value - a.value),
    top: top.sort((a, b) => b.value - a.value).slice(0, 15),
    inventoryOff: !member.inventory,
  };
}
