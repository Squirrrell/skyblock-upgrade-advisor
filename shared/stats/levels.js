// Level math for every XP curve in SkyBlock. All tables are per-level XP.
import { CATACOMBS_XP, HOTF_XP, HOTM_XP, RUNECRAFTING_XP, SKILL_CAPS, SKILL_XP, SLAYER_MAX_TIER, SLAYER_XP, SOCIAL_XP } from './constants.js';

/**
 * Level reached with `xp` on a per-level table, stopping at `cap`.
 * `overflow` is the XP each level costs past the end of the table (catacombs).
 */
export function levelFrom(xp = 0, table, cap = table.length, overflow = 0) {
  let level = 0;
  let left = Math.max(0, xp);
  const limit = overflow ? Infinity : Math.min(cap, table.length);
  while (level < limit) {
    const need = level < table.length ? table[level] : overflow;
    if (left < need) break;
    left -= need;
    level++;
  }
  const maxed = level >= cap;
  const next = level < table.length ? table[level] : overflow;
  const progress = next ? left / next : 1;
  return {
    xp,
    level: Math.min(level, cap),
    // Levels past the cap (catacombs 50+ overflow) are reported separately.
    overflow: overflow && level > cap ? level - cap + progress : 0,
    cap,
    maxed,
    progress: maxed && !overflow ? 1 : progress,
    toNext: maxed && !overflow ? 0 : Math.max(0, next - left),
    exact: Math.min(level, cap) + (maxed ? 0 : progress),
  };
}

/** Total XP needed to go from 0 to `level` on a table. */
export function xpForLevel(level, table, overflow = 0) {
  let total = 0;
  for (let i = 0; i < level; i++) total += i < table.length ? table[i] : overflow;
  return total;
}

export const SKILLS = [
  { id: 'farming', name: 'Farming' },
  { id: 'mining', name: 'Mining' },
  { id: 'combat', name: 'Combat' },
  { id: 'foraging', name: 'Foraging' },
  { id: 'fishing', name: 'Fishing' },
  { id: 'enchanting', name: 'Enchanting' },
  { id: 'alchemy', name: 'Alchemy' },
  { id: 'taming', name: 'Taming' },
  { id: 'carpentry', name: 'Carpentry' },
  { id: 'hunting', name: 'Hunting' },
  { id: 'runecrafting', name: 'Runecrafting', cosmetic: true },
  { id: 'social', name: 'Social', cosmetic: true },
];

export function skillTable(id) {
  if (id === 'runecrafting') return RUNECRAFTING_XP;
  if (id === 'social') return SOCIAL_XP;
  return SKILL_XP;
}

/** Highest level reachable in game, ignoring per-player caps. */
export const SKILL_MAX = { farming: 60, taming: 60, foraging: 54 };

export function skillCap(id, member) {
  const base = SKILL_CAPS[id] ?? 50;
  if (id === 'farming') return base + (member.jacobs_contest?.perks?.farming_level_cap ?? 0);
  if (id === 'foraging') return base + (member.player_data?.experience?.SKILL_FORAGING_extra_level_cap ?? 0);
  if (id === 'taming') return base + Math.min(10, member.pets_data?.pet_care?.pet_types_sacrificed?.length ?? 0);
  return base;
}

export const catacombsLevel = (xp) => levelFrom(xp, CATACOMBS_XP, 50, 200_000_000);
export const hotmLevel = (xp) => levelFrom(xp, HOTM_XP, SKILL_CAPS.HOTM);
export const hotfLevel = (xp) => levelFrom(xp, HOTF_XP, SKILL_CAPS.HOTF);

/** Slayer tables are cumulative XP thresholds. */
export function slayerLevel(boss, xp = 0) {
  const table = SLAYER_XP[boss] ?? [];
  let level = 0;
  while (level < table.length && xp >= table[level]) level++;
  const maxed = level >= table.length;
  const prev = level ? table[level - 1] : 0;
  return {
    xp,
    level,
    cap: table.length,
    maxed,
    toNext: maxed ? 0 : table[level] - xp,
    progress: maxed ? 1 : (xp - prev) / (table[level] - prev),
    maxTier: SLAYER_MAX_TIER[boss] ?? 5,
  };
}

export { CATACOMBS_XP, HOTF_XP, HOTM_XP, SKILL_XP, SLAYER_XP };
