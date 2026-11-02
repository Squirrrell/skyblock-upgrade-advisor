// Bestiary tiers from the profile's kill counts and the NEU repository's
// constants/bestiary.json. Each family (one bestiary entry, which may count
// several mob ids) has a kill cap and a tier table: its tier is how many of
// the table's kill thresholds it has passed, up to the cap, and its max tier
// is how many thresholds lie within the cap.
import { skullHash } from '../prices.js';

const strip = (s) => String(s ?? '').replace(/§./g, '');

/** The thresholds a family uses: a shared bracket, or a bracket set (critters). */
function thresholdsOf(entry, constants) {
  if (entry.bracketType) return constants.bracketSets?.[entry.bracketType]?.[entry.bracket] ?? [];
  return constants.brackets?.[entry.bracket] ?? [];
}

/** { skull } for a head icon, { mat } for an item ("minecraft:fishing_rod"), or null. */
function iconOf(entry) {
  const skull = skullHash(entry.texture);
  if (skull) return { skull };
  if (entry.item) return { mat: `${String(entry.item).replace(/^minecraft:/, '').toUpperCase()}:0` };
  return null;
}

function family(entry, constants, kills, deaths) {
  const ids = entry.mobs ?? [];
  const k = ids.reduce((n, id) => n + (kills[id] ?? 0), 0);
  const d = ids.reduce((n, id) => n + (deaths[id] ?? 0), 0);
  const steps = thresholdsOf(entry, constants).filter((t) => t <= entry.cap);
  const tier = steps.filter((t) => k >= t).length;
  const maxTier = steps.length;
  const prev = tier > 0 ? steps[tier - 1] : 0;
  const next = tier < maxTier ? steps[tier] : null;
  return {
    name: entry.name,
    plain: strip(entry.name),
    icon: iconOf(entry),
    kills: k,
    deaths: d,
    tier,
    maxTier,
    next,
    // Progress through the current tier, 0..1 (1 when maxed).
    progress: next == null ? 1 : Math.max(0, Math.min(1, (k - prev) / (next - prev))),
    maxed: maxTier > 0 && tier >= maxTier,
  };
}

/**
 * Every island with its families (islands with subcategories, like Fishing,
 * come as groups), plus totals. `constants` is NEU's bestiary.json, `kills`
 * and `deaths` the profile's bestiary maps.
 */
export function bestiary(constants, kills = {}, deaths = {}) {
  if (!constants) return null;
  const islands = [];
  for (const [id, island] of Object.entries(constants)) {
    if (id === 'brackets' || id === 'bracketSets' || !island || typeof island !== 'object') continue;
    const groups = [];
    if (island.hasSubcategories) {
      for (const [sub, value] of Object.entries(island)) {
        if (value && typeof value === 'object' && Array.isArray(value.mobs)) {
          groups.push({ id: sub, name: strip(value.name), families: value.mobs.map((e) => family(e, constants, kills, deaths)) });
        }
      }
    } else if (Array.isArray(island.mobs)) {
      groups.push({ id, name: null, families: island.mobs.map((e) => family(e, constants, kills, deaths)) });
    }
    const all = groups.flatMap((g) => g.families);
    if (!all.length) continue;
    islands.push({
      id,
      name: strip(island.name),
      icon: iconOf(island.icon ?? {}),
      groups,
      tiers: all.reduce((n, f) => n + f.tier, 0),
      maxTiers: all.reduce((n, f) => n + f.maxTier, 0),
      maxed: all.filter((f) => f.maxed).length,
      families: all.length,
    });
  }
  const sum = (key) => islands.reduce((n, i) => n + i[key], 0);
  return {
    islands,
    tiers: sum('tiers'),
    maxTiers: sum('maxTiers'),
    maxed: sum('maxed'),
    families: sum('families'),
    kills: Object.values(kills).reduce((n, v) => n + (typeof v === 'number' ? v : 0), 0),
  };
}
