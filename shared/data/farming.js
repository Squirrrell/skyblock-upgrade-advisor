// Farming fortune sources and their values.
// Numbers follow the community Hypixel SkyBlock wiki (hypixelskyblock.minecraft.wiki,
// "Farming Fortune" page, autumn 2026). Edit here when a patch changes them.

export const ARMOR_SLOTS = ['HELMET', 'CHESTPLATE', 'LEGGINGS', 'BOOTS'];

// Ordered weakest to strongest. `pieces` is base fortune per slot (helmet,
// chest, legs, boots). `bonus` is the tiered set bonus step: wearing 2, 3 or
// 4 pieces of the same set adds 1, 2 or 3 steps. `total` is the full set.
// Sets can be mixed: the analyzer picks the best piece for every slot.
export const ARMOR_SETS = [
  { prefix: 'FARM_SUIT', name: 'Farmhand Armor', pieces: [5, 5, 5, 5], bonus: 0, total: 20 },
  { prefix: 'FARM_ARMOR', name: 'Haymaker Armor', pieces: [10, 10, 10, 10], bonus: 0, total: 40 },
  { prefix: 'PUMPKIN', name: 'Sprout Armor', pieces: [15, 15, 15, 15], bonus: 0, total: 60 },
  { prefix: 'MELON', name: 'Tater Armor', pieces: [15, 20, 20, 15], bonus: 10, total: 100 },
  { prefix: 'CROPIE', name: 'Cropie Armor', pieces: [20, 25, 25, 20], bonus: 15, total: 135 },
  { prefix: 'SQUASH', name: 'Squash Armor', pieces: [25, 30, 30, 25], bonus: 20, total: 170 },
  { prefix: 'FERMENTO', name: 'Fermento Armor', pieces: [30, 35, 35, 30], bonus: 25, total: 205 },
  { prefix: 'HELIANTHUS', name: 'Helianthus Armor', pieces: [35, 40, 40, 35], bonus: 25, total: 225 },
];

// Single pieces that are not part of a set. They give +1 Farming Fortune per
// Farming level in the Garden, so a high-level player often wears them in
// place of a set piece (Rancher's Boots with three Cropie pieces, say).
export const LOOSE_ARMOR = [
  { id: 'RANCHERS_BOOTS', name: "Rancher's Boots", slot: 3, perLevel: 1 },
  { id: 'FARMER_BOOTS', name: 'Farmer Boots', slot: 3, perLevel: 1 },
];

// Farming fortune from one Peridot gem, by gem quality and item rarity
// (common, uncommon, rare, epic, legendary, mythic).
export const PERIDOT = {
  ROUGH: [0.5, 1, 1.5, 2, 2.5, 3],
  FLAWED: [1, 1.5, 2, 2.5, 3, 4],
  FINE: [1.5, 2, 3, 4, 5, 6],
  FLAWLESS: [2, 3, 4, 5, 6, 8],
  PERFECT: [3, 4, 5, 6, 8, 10],
};

// Reforge fortune by rarity (common to mythic) and the stone that applies it.
export const REFORGES = {
  mossy: { name: 'Mossy', stone: 'OVERGROWN_GRASS', values: [5, 10, 15, 20, 25, 30] },
  bustling: { name: 'Bustling', stone: 'SKYMART_BROCHURE', values: [1, 2, 4, 6, 8, 10] },
  rooted: { name: 'Rooted', stone: 'BURROWING_SPORES', values: [6, 9, 12, 15, 18, 21] },
  blooming: { name: 'Blooming', stone: 'FLOWERING_BOUQUET', values: [1, 2, 3, 4, 5, 6] },
};

// Fixed caps from the wiki's maximum build, so the "max" never depends on
// what a player owns: recombobulated Helianthus with Mossy, 8 Perfect
// Peridots and Pesterminator VI; recombobulated Blossom with Rooted and
// Green Thumb V after every unique visitor.
export const MAX_BUILD = {
  armor: { reforge: 120, gems: 80, pesterminator: 48 },
  equipment: { reforge: 72, gems: 0, pesterminator: 0 },
  greenThumb: 140,
  petItem: 60,
};

export const EQUIPMENT_SLOTS = ['NECKLACE', 'CLOAK', 'BELT', 'BRACELET'];

// Per-piece value climbs from `min` to `max` as you serve garden visitors.
export const EQUIPMENT_SETS = [
  { prefix: 'LOTUS', name: 'Peony', min: 5, max: 20 },
  { prefix: 'BLOSSOM', name: 'Blossom', min: 7, max: 29.5 },
];
export const EQUIPMENT_MAX_VISITORS = 2500;

// Pets. `value` is fortune at max level for that rarity; the analyzer scales
// linearly with level. Conditional pets are listed but not counted in totals.
export const FARMING_PETS = [
  // Only +40 of the Rose Dragon's fortune is a base stat that relics can boost.
  { type: 'ROSE_DRAGON', name: 'Rose Dragon', values: { LEGENDARY: 336.7 }, baseStat: 40, note: 'Assumes maxed crop milestones and other farming pets' },
  { type: 'ELEPHANT', name: 'Elephant', values: { LEGENDARY: 150, MYTHIC: 200 } },
  { type: 'MOOSHROOM_COW', name: 'Mooshroom Cow', values: { COMMON: 100, UNCOMMON: 100, RARE: 100, EPIC: 100, LEGENDARY: 100 }, note: 'Plus more from Strength' },
  { type: 'CHICKEN', name: 'Chicken', values: { COMMON: 50, UNCOMMON: 50, RARE: 50, EPIC: 50, LEGENDARY: 50 } },
  { type: 'BEE', name: 'Bee', values: { RARE: 40, EPIC: 40, LEGENDARY: 40, MYTHIC: 40 }, note: 'Doubled with a Bee Mask' },
  { type: 'HEDGEHOG', name: 'Hedgehog', values: { LEGENDARY: 257.5 }, condition: 'Only on pests' },
  { type: 'SLUG', name: 'Slug', values: { LEGENDARY: 100 }, condition: 'In a sprayed plot' },
  { type: 'MOSQUITO', name: 'Mosquito', values: { RARE: 175, EPIC: 175, LEGENDARY: 175 }, condition: 'Sugar cane only', unit: 'crop fortune' },
  { type: 'PIG', name: 'Pig', values: { COMMON: 20, UNCOMMON: 20, RARE: 20, EPIC: 20, LEGENDARY: 20 }, condition: 'Potatoes only', unit: 'crop fortune' },
];

// Shopping options when recommending a better pet (cheapest useful first).
export const PET_UPGRADES = [
  { type: 'MOOSHROOM_COW', tier: 'LEGENDARY', value: 100 },
  { type: 'ELEPHANT', tier: 'LEGENDARY', value: 150 },
  { type: 'ELEPHANT', tier: 'MYTHIC', value: 200 },
  { type: 'ROSE_DRAGON', tier: 'LEGENDARY', value: 336.7 },
];

export const PET_ITEMS = [
  { id: 'GREEN_BANDANA', name: 'Green Bandana', kind: 'garden', perGardenLevel: 4, cap: 60 },
  { id: 'YELLOW_BANDANA', name: 'Yellow Bandana', kind: 'flat', value: 30 },
  { id: 'MINOS_RELIC', name: 'Minos Relic', kind: 'multiplier', value: 0.333 },
  { id: 'HEPHAESTUS_RELIC', name: 'Hephaestus Relic', kind: 'multiplier', value: 0.5 },
];

// Garden XP needed to reach each garden level (index = level - 1).
export const GARDEN_LEVEL_XP = [0, 70, 140, 280, 520, 1120, 2620, 4620, 7120, 10120, 20120, 30120, 40120, 50120, 60120];

// Accessory families: only the highest tier you own counts.
export const ACCESSORY_FAMILIES = [
  {
    id: 'helianthus-relic',
    name: 'Helianthus Relic',
    tiers: [{ id: 'HELIANTHUS_RELIC', value: 40 }],
  },
  {
    id: 'farming-talisman',
    name: 'Farming Talisman',
    tiers: [{ id: 'FARMING_TALISMAN', value: 3 }],
  },
  {
    id: 'fermento-artifact',
    name: 'Fermento Artifact line',
    unit: 'crop fortune',
    condition: 'Most crops (not sunflower, moonflower or wild rose)',
    tiers: [
      { id: 'CROPIE_TALISMAN', value: 10 },
      { id: 'SQUASH_RING', value: 20 },
      { id: 'FERMENTO_ARTIFACT', value: 30 },
    ],
  },
  {
    id: 'anita-artifact',
    name: "Anita's Artifact line",
    unit: 'crop fortune',
    condition: 'Doubles on one random crop during Jacob contests',
    tiers: [
      { id: 'ANITA_TALISMAN', value: 5 },
      { id: 'ANITA_RING', value: 15 },
      { id: 'ANITA_ARTIFACT', value: 25 },
    ],
  },
  {
    id: 'atmospheric-filter',
    name: 'Atmospheric Filter',
    condition: 'Garden, during Spring',
    tiers: [{ id: 'ATMOSPHERIC_FILTER', value: 25 }],
  },
  {
    id: 'magic-8-ball',
    name: 'Magic 8 Ball',
    condition: 'Random stat each season',
    tiers: [{ id: 'MAGIC_8_BALL', value: 25 }],
  },
];

// Attribute shards that give farming fortune. `ability` is the key Hypixel
// uses under member.attributes.stacks.
export const FARMING_SHARDS = [
  { ability: 'fortunate_farmer', shard: 'SHARD_FLY', name: 'Fly Shard', attribute: 'Fortunate Farmer', rarity: 'COMMON', max: 25 },
  { ability: 'ultimate_dna', shard: 'SHARD_GALAXY_FISH', name: 'Galaxy Fish Shard', attribute: 'Ultimate DNA', rarity: 'LEGENDARY', max: 10 },
  { ability: 'infiltration', shard: 'SHARD_TERMITE', name: 'Earthworm Shard', attribute: 'Infiltration', rarity: 'UNCOMMON', max: 30, condition: 'While a pest is in your plot' },
  { ability: 'pest_fortune', shard: 'SHARD_CRICKET', name: 'Cricket Shard', attribute: 'Pest Fortune', rarity: 'UNCOMMON', max: 50, condition: 'Only on pests' },
  { ability: 'lunar_power', shard: 'SHARD_LUNAR_MOTH', name: 'Lunar Moth Shard', attribute: 'Lunar Power', rarity: 'EPIC', max: 50, condition: 'At night' },
  { ability: 'solar_power', shard: 'SHARD_FIREFLY', name: 'Firefly Shard', attribute: 'Solar Power', rarity: 'EPIC', max: 50, condition: 'During the day' },
];

// Specialized tools. `turbo` is the matching Turbo-Crop enchant, `main` the
// enchant that gives base farming fortune on that tool type.
export const FARMING_TOOLS = [
  { match: /^THEORETICAL_HOE_WHEAT/, crop: 'Wheat', turbo: 'turbo_wheat', main: 'harvesting' },
  { match: /^THEORETICAL_HOE_CARROT/, crop: 'Carrot', turbo: 'turbo_carrot', main: 'harvesting' },
  { match: /^THEORETICAL_HOE_POTATO/, crop: 'Potato', turbo: 'turbo_potato', main: 'harvesting' },
  { match: /^THEORETICAL_HOE_CANE/, crop: 'Sugar Cane', turbo: 'turbo_cane', main: 'harvesting' },
  { match: /^THEORETICAL_HOE_WARTS/, crop: 'Nether Wart', turbo: 'turbo_warts', main: 'harvesting' },
  { match: /^THEORETICAL_HOE_SUNFLOWER/, crop: 'Sunflower', turbo: 'turbo_sunflower', main: 'harvesting' },
  { match: /^THEORETICAL_HOE_WILD_ROSE/, crop: 'Wild Rose', turbo: 'turbo_rose', main: 'harvesting' },
  { match: /^MELON_DICER/, crop: 'Melon', turbo: 'turbo_melon', main: 'sunder' },
  { match: /^PUMPKIN_DICER/, crop: 'Pumpkin', turbo: 'turbo_pumpkin', main: 'sunder' },
  { match: /^COCO_CHOPPER/, crop: 'Cocoa Beans', turbo: 'turbo_coco', main: 'sunder' },
  { match: /^CACTUS_KNIFE/, crop: 'Cactus', turbo: 'turbo_cactus', main: 'harvesting' },
  { match: /^FUNGI_CUTTER/, crop: 'Mushroom', turbo: 'turbo_mushrooms', main: 'harvesting' },
];

export const TOOL_ENCHANTS = {
  harvesting: { name: 'Harvesting', perLevel: 12.5, maxLevel: 6, book: 'ENCHANTMENT_HARVESTING_6' },
  sunder: { name: 'Sunder', perLevel: 12.5, maxLevel: 6, book: 'ENCHANTMENT_SUNDER_6' },
  cultivating: { name: 'Cultivating', perLevel: 2, maxLevel: 10, book: 'ENCHANTMENT_CULTIVATING_1' },
  turbo: { name: 'Turbo-Crop', perLevel: 5, maxLevel: 5 },
};

export const CROP_UPGRADE_KEYS = {
  WHEAT: 'Wheat',
  CARROT_ITEM: 'Carrot',
  POTATO_ITEM: 'Potato',
  PUMPKIN: 'Pumpkin',
  MELON: 'Melon',
  SUGAR_CANE: 'Sugar Cane',
  CACTUS: 'Cactus',
  'INK_SACK:3': 'Cocoa Beans',
  MUSHROOM_COLLECTION: 'Mushroom',
  NETHER_STALK: 'Nether Wart',
  DOUBLE_PLANT: 'Sunflower',
  MOONFLOWER: 'Moonflower',
  WILD_ROSE: 'Wild Rose',
};

export const GARDEN_CHIPS = [
  { key: 'cropshot', id: 'CROPSHOT_GARDEN_CHIP', name: 'Cropshot Chip', effect: 'Up to +100 farming fortune' },
  { key: 'hypercharge', id: 'HYPERCHARGE_GARDEN_CHIP', name: 'Hypercharge Chip', effect: 'Temporary fortune buffs up to 100% stronger' },
  { key: 'overdrive', id: 'OVERDRIVE_GARDEN_CHIP', name: 'Overdrive Chip', effect: 'Up to +140 crop fortune during Jacob contests' },
];
export const CHIP_MAX_LEVEL = 20;
