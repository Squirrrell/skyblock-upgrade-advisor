import { ApiError } from '../shared/errors.js';
import { buildReport, pickProfile } from '../shared/report.js';
import { getGarden, getProfiles, resolvePlayer } from './hypixel.js';
import { buildAccessoryIndex } from '../shared/accessories.js';
import { getItemList, getPriceBook } from './prices.js';
import { getAttributeConstants, getMiscConstants, getPetConstants } from './repo.js';

let accessoryIndex = null;
async function getAccessoryIndex() {
  if (accessoryIndex?.list.length) return accessoryIndex;
  const [items, misc] = await Promise.all([getItemList(), getMiscConstants()]);
  accessoryIndex = buildAccessoryIndex(items, misc ?? {});
  return accessoryIndex;
}

export async function analyzePlayer(query, wantedProfile) {
  const player = await resolvePlayer(query);
  const profiles = await getProfiles(player.uuid);
  if (!profiles.length) throw new ApiError(404, `${player.name} has never played SkyBlock.`, { code: 'NO_PROFILES' });

  const profile = pickProfile(profiles, wantedProfile);
  const [garden, book, petConstants, attrConstants, accessories] = await Promise.all([
    getGarden(profile.profile_id).catch(() => null),
    getPriceBook(),
    getPetConstants(),
    getAttributeConstants(),
    getAccessoryIndex().catch(() => null),
  ]);

  return buildReport({ player, profiles, profile, garden, book, petConstants, attrConstants, accessoryIndex: accessories });
}
