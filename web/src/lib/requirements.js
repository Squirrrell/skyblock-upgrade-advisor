// Item requirements in words, and whether this profile meets them. Two
// sources: the crafting requirement from the NEU data repository's
// "crafttext" ("Requires: Honeycomb V"), and the requirements to use an item
// from Hypixel's item list ({ type: 'SKILL', skill: 'FARMING', level: 20 }).
import { prettyId } from '../../../shared/analyze/helpers.js';

const ROMAN = { I: 1, V: 5, X: 10, L: 50, C: 100 };
export const fromRoman = (s) =>
  [...s].reduce((n, c, i, a) => (ROMAN[c] < (ROMAN[a[i + 1]] ?? 0) ? n - ROMAN[c] : n + ROMAN[c]), 0);
const toRoman = (n) => ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII', 'XIII', 'XIV', 'XV'][n] ?? String(n);

const SLAYERS = { zombie: 'Revenant Horror', spider: 'Tarantula Broodfather', wolf: 'Sven Packmaster', enderman: 'Voidgloom Seraph', blaze: 'Inferno Demonlord', vampire: 'Riftstalker Bloodfiend' };

/** The collection entry ({ id, name, tiers }) with this display name, from Hypixel's collections list. */
function findCollection(collections, test) {
  for (const cat of Object.values(collections?.collections ?? {})) {
    for (const [id, c] of Object.entries(cat.items ?? {})) if (test(id, c)) return { id, ...c };
  }
  return null;
}

function collectionCheck(entry, tier, stats) {
  const need = entry?.tiers?.find((t) => t.tier === tier)?.amountRequired;
  const have = stats?.collections?.total?.[entry?.id];
  if (need == null || have == null) return { met: null };
  return { met: have >= need, have, need };
}

/**
 * One requirement as { text, met, have?, need? }. `met` is true or false when
 * the profile can tell, null when it can't.
 */
export function describe(r, stats, collections) {
  switch (r.type) {
    case 'SKILL': {
      const s = stats?.skills?.list?.find((x) => x.id === String(r.skill).toLowerCase());
      return { text: `${prettyId(r.skill)} level ${r.level}`, met: s ? s.level >= r.level : null };
    }
    case 'SLAYER': {
      const s = stats?.slayers?.list?.find((x) => x.id === r.slayer_boss_type);
      return { text: `${SLAYERS[r.slayer_boss_type] ?? prettyId(r.slayer_boss_type)} level ${r.level}`, met: s ? s.level >= r.level : null };
    }
    case 'COLLECTION': {
      const entry = findCollection(collections, (id) => id === r.collection);
      return { text: `${entry?.name ?? prettyId(r.collection)} collection ${toRoman(r.tier)}`, ...collectionCheck(entry, r.tier, stats) };
    }
    case 'HEART_OF_THE_MOUNTAIN': {
      const level = stats?.mining?.hotm?.level;
      return { text: `Heart of the Mountain ${r.tier}`, met: level == null ? null : level >= r.tier };
    }
    case 'DUNGEON_SKILL': {
      const level = stats?.dungeons?.catacombs?.level;
      return { text: `Catacombs level ${r.level}`, met: level == null ? null : level >= r.level };
    }
    case 'DUNGEON_TIER':
      return { text: `${prettyId(r.dungeon_type)} floor ${r.tier} completed`, met: null };
    case 'GARDEN_LEVEL': {
      const level = stats?.garden?.level;
      return { text: `Garden level ${r.level}`, met: level == null ? null : level >= r.level };
    }
    case 'CRIMSON_ISLE_REPUTATION':
      return { text: `${r.reputation.toLocaleString('en-US')} ${prettyId(r.faction)} reputation`, met: null };
    case 'ANY_OF':
    case 'ONE_OF': {
      const parts = (r.requirements ?? []).filter((x) => x.type !== 'PROFILE_TYPE').map((x) => describe(x, stats, collections));
      return { text: parts.map((p) => p.text).join(' or '), met: parts.some((p) => p.met) || (parts.every((p) => p.met === false) ? false : null) };
    }
    case 'PROFILE_AGE':
      return { text: `Profile at least ${r.minimum_age} ${String(r.minimum_age_unit).toLowerCase()} old`, met: null };
    default:
      return { text: prettyId(r.type), met: null };
  }
}

/**
 * The collection tier that unlocks an item's recipe, from Hypixel's own
 * collections list ("Pressure Artifact Recipe" at Sea Lumies IX), as a
 * requirement, or null if no collection unlocks it.
 */
export function recipeUnlock(itemName, stats, collections) {
  if (!itemName) return null;
  const want = `${itemName} Recipe`.toLowerCase();
  for (const cat of Object.values(collections?.collections ?? {})) {
    for (const [id, c] of Object.entries(cat.items ?? {})) {
      const tier = c.tiers?.find((t) => t.unlocks?.some((u) => u.toLowerCase() === want));
      if (tier) return { text: `${c.name} collection ${toRoman(tier.tier)}`, ...collectionCheck({ id, ...c }, tier.tier, stats) };
    }
  }
  return null;
}

/** NEU's crafttext, "Requires: Honeycomb V" or "Requires: HotM 2", as a requirement. */
export function craftRequirement(crafttext, stats, collections) {
  const m = /^Requires:\s*(.+?)\s+([IVXLC]+|\d+)$/.exec(String(crafttext ?? '').trim());
  if (!m) return crafttext ? { text: String(crafttext).replace(/^Requires:\s*/, ''), met: null } : null;
  const [, what, level] = m;
  const n = /^\d+$/.test(level) ? Number(level) : fromRoman(level);
  if (/^hotm$/i.test(what)) return describe({ type: 'HEART_OF_THE_MOUNTAIN', tier: n }, stats, collections);
  const entry = findCollection(collections, (id, c) => c.name?.toLowerCase() === what.toLowerCase());
  if (entry) return { text: `${entry.name} collection ${toRoman(n)}`, ...collectionCheck(entry, n, stats) };
  const skill = stats?.skills?.list?.find((s) => s.name.toLowerCase() === what.toLowerCase());
  if (skill) return { text: `${skill.name} level ${n}`, met: skill.level >= n };
  return { text: `${what} ${level}`, met: null };
}
