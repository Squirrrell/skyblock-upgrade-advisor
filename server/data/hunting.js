// Hunting fortune sources. Values follow the community wiki "Hunting Fortune"
// page (renamed from Hunter Fortune in July 2026).

export const HUNTING_SHARDS = [
  { ability: 'hunter_karma', shard: 'SHARD_MEGALITH', name: 'Megalith Shard', attribute: "Hunter's Karma", rarity: 'LEGENDARY', max: 10 },
  { ability: 'decent_karma', shard: 'SHARD_NEWT', name: 'Newt Shard', attribute: 'Decent Karma', rarity: 'COMMON', max: 20, condition: 'When hunting Common shards' },
  { ability: 'good_karma', shard: 'SHARD_SALAMANDER', name: 'Salamander Shard', attribute: 'Good Karma', rarity: 'UNCOMMON', max: 20, condition: 'When hunting Uncommon shards' },
  { ability: 'great_karma', shard: 'SHARD_LIZARD_KING', name: 'Lizard King Shard', attribute: 'Great Karma', rarity: 'RARE', max: 10, condition: 'When hunting Rare shards' },
  { ability: 'excellent_karma', shard: 'SHARD_LEVIATHAN', name: 'Leviathan Shard', attribute: 'Excellent Karma', rarity: 'EPIC', max: 10, condition: 'When hunting Epic shards' },
  { ability: 'hunters_grasp', shard: 'SHARD_KING_COBRA', name: 'King Cobra Shard', attribute: "Hunter's Grasp", rarity: 'RARE', max: 10, unit: '% fortune', condition: 'While using Black Holes' },
  { ability: 'echo_of_hunter', shard: 'SHARD_SEA_SERPENT', name: 'Sea Serpent Shard', attribute: 'Echo of Hunter', rarity: 'EPIC', max: 20, unit: '% stronger', condition: "Boosts Hunter's Karma and Hunter's Grasp" },
  { ability: 'echo_of_echoes', shard: 'SHARD_TIAMAT', name: 'Tiamat Shard', attribute: 'Echo of Echoes', rarity: 'LEGENDARY', max: 50, unit: '% stronger', condition: 'Boosts Echo attributes' },
];

export const KUUDRA_CORES = [
  { id: 'BURNING_KUUDRA_CORE', value: 1 },
  { id: 'FIERY_KUUDRA_CORE', value: 2 },
  { id: 'INFERNAL_KUUDRA_CORE', value: 3 },
];

// Hunting tools: fortune only applies to shards of the matching type.
export const HUNTING_TOOLS = [
  {
    id: 'net',
    name: 'Fishing net',
    condition: 'Water shards',
    tiers: [
      { id: 'MEDIUM_FISHING_NET', value: 2.5 },
      { id: 'TURBO_FISHING_NET', value: 5 },
      { id: 'GIGANTIC_FISHING_NET', value: 10 },
    ],
    others: ['BASIC_FISHING_NET'],
  },
  {
    id: 'lasso',
    name: 'Lasso',
    condition: 'Forest shards',
    tiers: [
      { id: 'ENTANGLER_LASSO', value: 2.5 },
      { id: 'EVERSTRETCH_LASSO', value: 5 },
    ],
    others: ['ABYSMAL_LASSO', 'VINERIP_LASSO'],
  },
  {
    id: 'black-hole',
    name: 'Pocket Black Hole',
    condition: 'Combat shards',
    tiers: [
      { id: 'MEDIUM_POCKET_BLACK_HOLE', value: 2.5 },
      { id: 'LARGE_POCKET_BLACK_HOLE', value: 5 },
    ],
    others: ['SMALL_POCKET_BLACK_HOLE'],
  },
];

// Majestic reforge (Morning Dew) on the Safari Belt, by rarity, common to divine.
export const MAJESTIC = [0.5, 1, 1.5, 2, 3, 4, 5];
