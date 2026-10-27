// Turns already-fetched data into the report. No network access here, so the
// Node server and the static GitHub Pages build share it.
import { analyzeConsumables } from './analyze/consumables.js';
import { analyzeFarming } from './analyze/farming.js';
import { analyzeHunting } from './analyze/hunting.js';
import { ApiError } from './errors.js';
import { collectItems, collectPets } from './profile.js';
import { buildStats } from './stats/index.js';
import { missingAccessories } from './accessories.js';

export function pickProfile(profiles, wanted) {
  if (wanted) {
    const w = String(wanted).toLowerCase();
    const match = profiles.find((p) => p.profile_id === w || p.cute_name?.toLowerCase() === w);
    if (match) return match;
  }
  return profiles.find((p) => p.selected) ?? profiles[0];
}

function apiWarnings(member, profile) {
  const warnings = [];
  if (['ironman', 'island'].includes(profile.game_mode)) {
    warnings.push('This profile cannot trade on the bazaar or auction house, so prices are only a guide to how hard each item is to get.');
  }
  if (!member.inventory) {
    warnings.push('Inventory API is turned off for this profile, so armor, tools and accessories could not be checked. Turn it on in SkyBlock settings under API settings.');
  }
  if (!member.collection) warnings.push('Collections API is off. Some numbers may be lower than in game.');
  return warnings;
}

/** Cheapest fortune per coin within one fortune section. */
function bestValue(section) {
  const picks = [];
  for (const g of section.groups) {
    for (const s of g.items) {
      // `rank` lets an alternative purchase (left out of the totals) still compete on price.
      if (s.unit !== 'fortune' || !(s.counted || s.tags.includes('rank'))) continue;
      if (!['missing', 'partial'].includes(s.status) || s.gain <= 0) continue;
      if (!s.cost?.total || s.cost.unpriced) continue;
      if (s.costGain <= 0) continue;
      picks.push({ section: section.id, group: g.title, id: s.id, name: s.name, icon: s.cost.lines?.find((l) => l.id)?.id ?? null, gain: s.costGain, total: s.cost.total, perPoint: s.cost.total / s.costGain, action: s.action });
    }
  }
  return picks.sort((a, b) => a.perPoint - b.perPoint).slice(0, 8);
}

export function buildReport({ player, profiles, profile, garden, book, petConstants, attrConstants, accessoryIndex = null }) {
  const member = profile.members?.[player.uuid];
  if (!member) throw new ApiError(404, 'Could not find this player in the selected profile.');

  const ctx = {
    member,
    profile,
    garden,
    book,
    petConstants,
    attrConstants,
    items: collectItems(member),
    pets: collectPets(member, petConstants),
  };

  const farming = analyzeFarming(ctx);
  const hunting = analyzeHunting(ctx);
  const consumables = analyzeConsumables(ctx);
  const stats = buildStats(ctx);
  stats.accessories.missing = missingAccessories(ctx.items, accessoryIndex, book);

  return {
    player,
    profile: { id: profile.profile_id, name: profile.cute_name, gameMode: profile.game_mode ?? 'normal' },
    profiles: profiles.map((p) => ({ id: p.profile_id, name: p.cute_name, selected: Boolean(p.selected), gameMode: p.game_mode ?? 'normal' })),
    sections: { farming, hunting, consumables },
    stats,
    bestValue: { farming: bestValue(farming), hunting: bestValue(hunting) },
    warnings: apiWarnings(member, profile),
    prices: book.meta,
    generatedAt: Date.now(),
  };
}
