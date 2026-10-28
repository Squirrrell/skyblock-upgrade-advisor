// Turns a raw Hypixel profile member into something the analyzers can query:
// a flat list of every item the player owns, their pets with levels, and
// skill levels.
import { decodeInventory, decodeNbtBase64 } from './nbt.js';
import { skullHash } from './prices.js';

export const RARITIES = ['COMMON', 'UNCOMMON', 'RARE', 'EPIC', 'LEGENDARY', 'MYTHIC', 'DIVINE', 'SPECIAL', 'VERY_SPECIAL'];

// Standard SkyBlock skill XP needed for each level, levels 1 through 60.
const SKILL_XP = [
  50, 125, 200, 300, 500, 750, 1000, 1500, 2000, 3500, 5000, 7500, 10000, 15000, 20000, 30000, 50000, 75000,
  100000, 200000, 300000, 400000, 500000, 600000, 700000, 800000, 900000, 1000000, 1100000, 1200000, 1300000,
  1400000, 1500000, 1600000, 1700000, 1800000, 1900000, 2000000, 2100000, 2200000, 2300000, 2400000, 2500000,
  2600000, 2750000, 2900000, 3100000, 3400000, 3700000, 4000000, 4300000, 4600000, 4900000, 5200000, 5500000,
  5800000, 6100000, 6400000, 6700000, 7000000,
];

/** Level, progress and XP to next level for a skill, honoring a level cap. */
export function skillLevel(xp = 0, cap = 50) {
  let level = 0;
  let remaining = xp;
  while (level < cap && remaining >= SKILL_XP[level]) {
    remaining -= SKILL_XP[level];
    level++;
  }
  const next = level < cap ? SKILL_XP[level] : null;
  return { level, cap, xp, toNext: next ? next - remaining : 0, progress: next ? remaining / next : 1 };
}

export const stripColor = (text = '') => String(text).replace(/§./g, '');

function itemRarity(lore) {
  for (let i = lore.length - 1; i >= 0; i--) {
    const line = stripColor(lore[i]).trim();
    if (!line) continue;
    const word = line.replace(/^a /, '').split(' ').filter(Boolean);
    const joined = word.slice(0, 2).join('_');
    if (RARITIES.includes(joined)) return joined;
    if (RARITIES.includes(word[0])) return word[0];
    return null;
  }
  return null;
}

function normalizeGems(gems) {
  if (!gems) return {};
  const out = {};
  for (const [slot, value] of Object.entries(gems)) {
    if (slot === 'unlocked_slots' || slot.endsWith('_gem')) continue;
    out[slot] = typeof value === 'string' ? value : value?.quality ?? null;
  }
  return out;
}

function normalizeItem(raw, location) {
  const extra = raw?.tag?.ExtraAttributes;
  if (!extra?.id) return null;
  const lore = raw.tag.display?.Lore ?? [];
  let petInfo = null;
  if (extra.petInfo) {
    try {
      petInfo = JSON.parse(extra.petInfo);
    } catch {
      petInfo = null;
    }
  }
  const display = raw.tag.display?.Name;
  return {
    id: extra.id,
    uuid: extra.uuid ?? null,
    // Toolkit items carry no display name, so fall back to a readable id.
    name: display ? stripColor(display).trim() : prettyName(extra.id),
    hasDisplayName: Boolean(display),
    // The name as the game shows it, with § colours (gold dungeon stars, red
    // master stars, pink upgrade stars) and the pack-font marks.
    rawName: display ?? null,
    location,
    count: raw.Count ?? 1,
    rarity: itemRarity(lore),
    reforge: extra.modifier ?? null,
    recombobulated: Boolean(extra.rarity_upgrades),
    enchantments: extra.enchantments ?? {},
    gems: normalizeGems(extra.gems),
    unlockedGemSlots: extra.gems?.unlocked_slots ?? null,
    hotPotato: extra.hot_potato_count ?? 0,
    farmingForDummies: extra.farming_for_dummies_count ?? 0,
    attributes: extra.attributes ?? {},
    petInfo,
    // The in-game lore lines, with their § colour codes, and when it was obtained.
    lore,
    obtained: obtainedAt(extra.timestamp),
    // What the icon is drawn from: the 1.8 item id and damage ("#351:3"),
    // the player-head skin and a leather dye colour ("R,G,B").
    mat: typeof raw.id === 'number' ? `#${raw.id}:${raw.Damage ?? 0}` : null,
    skull: skullHash(raw.tag.SkullOwner?.Properties?.textures?.[0]?.Value),
    color: raw.tag.display?.color != null ? [16, 8, 0].map((b) => (raw.tag.display.color >> b) & 255).join(',') : null,
    extra,
  };
}

/** ExtraAttributes.timestamp: milliseconds, or "4/15/20 12:41 AM" on old items. */
function obtainedAt(ts) {
  if (typeof ts === 'number') return ts;
  if (typeof ts !== 'string') return null;
  const ms = Date.parse(ts.replace(/(\d+)\/(\d+)\/(\d{2})\b/, (m, a, b, y) => `${a}/${b}/20${y}`));
  return Number.isNaN(ms) ? null : ms;
}

const prettyName = (id) => String(id).toLowerCase().replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

/**
 * Farming and hunting toolkit slots hold one bare item compound (its
 * ExtraAttributes) instead of an inventory list, so wrap it as an item.
 */
function decodeToolkitSlot(data) {
  const list = decodeInventory(data);
  if (list.length) return list;
  try {
    const root = decodeNbtBase64(data);
    return root?.id ? [{ Count: 1, tag: { ExtraAttributes: root } }] : [];
  } catch {
    return [];
  }
}

// Inventory fields that hold a single encoded blob.
const SINGLE_BLOBS = {
  inv_armor: 'Armor',
  equipment_contents: 'Equipment',
  inv_contents: 'Inventory',
  ender_chest_contents: 'Ender chest',
  wardrobe_contents: 'Wardrobe',
  personal_vault_contents: 'Personal vault',
};

const BAG_NAMES = {
  talisman_bag: 'Accessory bag',
  fishing_bag: 'Fishing bag',
  quiver: 'Quiver',
  potion_bag: 'Potion bag',
};

/** Recursively find every { data: base64 } blob under an object. */
function findBlobs(node, path, out) {
  if (!node || typeof node !== 'object') return;
  if (typeof node.data === 'string' && node.data.length > 20) {
    out.push({ path, data: node.data });
    return;
  }
  for (const [key, value] of Object.entries(node)) findBlobs(value, `${path}.${key}`, out);
}

export function collectItems(member) {
  const items = [];
  const push = (blob, location, decode = decodeInventory) => {
    for (const raw of decode(blob)) {
      const item = normalizeItem(raw, location);
      if (item) items.push(item);
    }
  };

  const inv = member.inventory ?? {};
  for (const [key, label] of Object.entries(SINGLE_BLOBS)) if (inv[key]) push(inv[key], label);
  for (const [key, label] of Object.entries(BAG_NAMES)) if (inv.bag_contents?.[key]) push(inv.bag_contents[key], label);
  for (const blob of Object.values(inv.backpack_contents ?? {})) push(blob, 'Backpack');

  // Newer storage spots: armor/equipment loadouts and the garden farming toolkit.
  const extra = [];
  findBlobs(member.loadout, 'loadout', extra);
  findBlobs(member.garden_player_data?.farming_toolkit, 'toolkit', extra);
  findBlobs(member.foraging?.hunting_toolkit, 'hunting', extra);
  const where = { toolkit: 'Farming toolkit', hunting: 'Hunting toolkit', loadout: 'Loadout' };
  for (const { path, data } of extra) {
    const kind = path.split('.')[0];
    push(data, where[kind], kind === 'loadout' ? decodeInventory : decodeToolkitSlot);
  }

  return items;
}

/** Pet level from total XP using the NEU leveling curve. */
export function petLevel(pet, petConstants) {
  if (!petConstants) return null;
  const offset = petConstants.pet_rarity_offset?.[pet.tier] ?? 0;
  const custom = petConstants.custom_pet_leveling?.[pet.type];
  let curve = petConstants.pet_levels.slice(offset, offset + 99);
  let maxLevel = 100;
  if (custom?.type === 1 && custom.pet_levels) {
    curve = curve.concat(custom.pet_levels);
    maxLevel = custom.max_level ?? maxLevel;
  }
  let level = 1;
  let xp = pet.exp ?? 0;
  for (const need of curve) {
    if (level >= maxLevel || xp < need) break;
    xp -= need;
    level++;
  }
  // XP into the current level and what the next one takes (null at max), and the total max level takes.
  const next = level < maxLevel ? curve[level - 1] ?? null : null;
  const xpMax = curve.slice(0, maxLevel - 1).reduce((a, b) => a + b, 0);
  return { level, maxLevel, xpCurrent: Math.round(xp), xpForNext: next, xpMax };
}

export function collectPets(member, petConstants) {
  return (member.pets_data?.pets ?? []).map((pet) => ({
    type: pet.type,
    tier: pet.tier,
    active: Boolean(pet.active),
    heldItem: pet.heldItem ?? null,
    exp: pet.exp ?? 0,
    ...(petLevel(pet, petConstants) ?? { level: null, maxLevel: 100 }),
  }));
}

/** Find a value anywhere under `node` whose key matches `key` (case-insensitive). */
export function deepFind(node, key, depth = 0) {
  if (!node || typeof node !== 'object' || depth > 6) return undefined;
  for (const [k, v] of Object.entries(node)) {
    if (k.toLowerCase() === key) return v;
  }
  for (const v of Object.values(node)) {
    const found = deepFind(v, key, depth + 1);
    if (found !== undefined) return found;
  }
  return undefined;
}
