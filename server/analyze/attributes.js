// Attribute (shard) levels. Each level costs a number of shards that depends on
// the shard's rarity; Hypixel reports the running total per attribute.
import { priceLines, source } from './helpers.js';

// Shards needed for each level, from the NEU repo. Used when the repo is unreachable.
const FALLBACK_LEVELLING = {
  COMMON: [1, 3, 5, 6, 7, 8, 10, 14, 18, 24],
  UNCOMMON: [1, 2, 3, 4, 5, 6, 7, 8, 12, 16],
  RARE: [1, 2, 3, 3, 4, 4, 5, 6, 8, 12],
  EPIC: [1, 1, 2, 2, 3, 3, 4, 4, 5, 7],
  LEGENDARY: [1, 1, 1, 2, 2, 2, 3, 3, 4, 5],
};

export function attributeLevel(stacks, rarity, constants) {
  const table = constants?.attribute_levelling?.[rarity] ?? FALLBACK_LEVELLING[rarity] ?? FALLBACK_LEVELLING.COMMON;
  let level = 0;
  let used = 0;
  for (const need of table) {
    if (stacks < used + need) break;
    used += need;
    level++;
  }
  const total = table.reduce((a, b) => a + b, 0);
  return { level, maxLevel: table.length, shardsToMax: Math.max(0, total - stacks) };
}

/** Look up rarity from the NEU shard list, falling back to the hard-coded one. */
function shardRarity(def, constants) {
  const entry = constants?.attributes?.find((a) => a.bazaarName === def.shard);
  return entry?.rarity ?? def.rarity;
}

/**
 * Build a report row for one attribute. `def.max` is the stat at max level;
 * values scale linearly per level.
 */
export function attributeSource(def, ctx, overrides = {}) {
  const stacks = ctx.member.attributes?.stacks?.[def.ability] ?? 0;
  const rarity = shardRarity(def, ctx.attrConstants);
  const { level, maxLevel, shardsToMax } = attributeLevel(stacks, rarity, ctx.attrConstants);
  const current = (def.max * level) / maxLevel;
  return source({
    id: `attr-${def.ability}`,
    name: `${def.attribute} (${def.name})`,
    current,
    max: def.max,
    unit: def.unit ?? 'fortune',
    condition: def.condition,
    detail: `Level ${level}/${maxLevel}, ${stacks} shard${stacks === 1 ? '' : 's'} syphoned`,
    action: shardsToMax > 0 ? `Syphon ${shardsToMax} more ${def.name}${shardsToMax === 1 ? '' : 's'} into the attribute menu` : null,
    cost: shardsToMax > 0 ? priceLines(ctx.book, [{ id: def.shard, qty: shardsToMax }]) : null,
    tags: ['shard', rarity.toLowerCase()],
    ...overrides,
  });
}
