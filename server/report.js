import { ApiError } from '../shared/errors.js';
import { buildReport, pickProfile } from '../shared/report.js';
import { getGarden, getProfiles, resolvePlayer } from './hypixel.js';
import { getPriceBook } from './prices.js';
import { getAttributeConstants, getPetConstants } from './repo.js';

export async function analyzePlayer(query, wantedProfile) {
  const player = await resolvePlayer(query);
  const profiles = await getProfiles(player.uuid);
  if (!profiles.length) throw new ApiError(404, `${player.name} has never played SkyBlock.`, { code: 'NO_PROFILES' });

  const profile = pickProfile(profiles, wantedProfile);
  const [garden, book, petConstants, attrConstants] = await Promise.all([
    getGarden(profile.profile_id).catch(() => null),
    getPriceBook(),
    getPetConstants(),
    getAttributeConstants(),
  ]);

  return buildReport({ player, profiles, profile, garden, book, petConstants, attrConstants });
}
