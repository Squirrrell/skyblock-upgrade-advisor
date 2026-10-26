import { ApiError, getGarden, getProfiles, resolvePlayer } from '../hypixel.js';
import { getPriceBook } from '../prices.js';
import { collectItems, collectPets } from '../profile.js';
import { getAttributeConstants, getPetConstants } from '../repo.js';
import { analyzeConsumables } from './consumables.js';
import { analyzeFarming } from './farming.js';
import { analyzeHunting } from './hunting.js';

function pickProfile(profiles, wanted) {
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

/** Cheapest fortune per coin across both fortune sections. */
function bestValue(sections) {
  const picks = [];
  for (const section of sections) {
    for (const g of section.groups) {
      for (const s of g.items) {
        if (s.unit !== 'fortune' || !s.counted) continue;
        if (!['missing', 'partial'].includes(s.status) || s.gain <= 0) continue;
        if (!s.cost?.total || s.cost.unpriced) continue;
        if (s.costGain <= 0) continue;
        picks.push({ section: section.id, group: g.title, id: s.id, name: s.name, gain: s.costGain, total: s.cost.total, perPoint: s.cost.total / s.costGain, action: s.action });
      }
    }
  }
  return picks.sort((a, b) => a.perPoint - b.perPoint).slice(0, 8);
}

export async function analyzePlayer(query, wantedProfile) {
  const player = await resolvePlayer(query);
  const profiles = await getProfiles(player.uuid);
  if (!profiles.length) throw new ApiError(404, `${player.name} has never played SkyBlock.`, { code: 'NO_PROFILES' });

  const profile = pickProfile(profiles, wantedProfile);
  const member = profile.members?.[player.uuid];
  if (!member) throw new ApiError(404, 'Could not find this player in the selected profile.');

  const [garden, book, petConstants, attrConstants] = await Promise.all([
    getGarden(profile.profile_id).catch(() => null),
    getPriceBook(),
    getPetConstants(),
    getAttributeConstants(),
  ]);

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

  return {
    player,
    profile: { id: profile.profile_id, name: profile.cute_name, gameMode: profile.game_mode ?? 'normal' },
    profiles: profiles.map((p) => ({ id: p.profile_id, name: p.cute_name, selected: Boolean(p.selected), gameMode: p.game_mode ?? 'normal' })),
    sections: { farming, hunting, consumables },
    bestValue: bestValue([farming, hunting]),
    warnings: apiWarnings(member, profile),
    prices: book.meta,
    generatedAt: Date.now(),
  };
}
