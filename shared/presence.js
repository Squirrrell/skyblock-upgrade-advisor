// Whether a player is online and where, from Hypixel's /v2/status session
// (shown only while they are online) and the last login and logout times
// from /v2/player. Players who turn off "Online Status" in their in-game API
// settings send neither, and the site shows nothing for them.

// SkyBlock area ids ("mode" in the status session) and their names, from the
// NEU repository's constants/islands.json.
export const AREA_NAMES = {
  dynamic: 'Private Island',
  hub: 'Hub',
  mining_1: 'Gold Mine',
  mining_2: 'Deep Caverns',
  mining_3: 'Dwarven Mines',
  combat_1: "Spider's Den",
  crimson_isle: 'Crimson Isle',
  combat_3: 'The End',
  farming_1: 'The Farming Islands',
  foraging_1: 'The Park',
  winter: "Jerry's Workshop",
  dungeon: 'Dungeon',
  dungeon_hub: 'Dungeon Hub',
  crystal_hollows: 'Crystal Hollows',
  garden: 'The Garden',
  rift: 'Rift',
  kuudra: "Kuudra's Hollow",
  mineshaft: 'Glacite Mineshafts',
  fishing_1: 'Backwater Bayou',
  foraging_2: 'Moonglade Marsh',
  lotus_atoll: 'Lotus Atoll',
  foraging_3: 'Torrhus Canyon',
  safari: 'Safari',
};

const words = (s) => String(s).toLowerCase().replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

/**
 * { session, lastLogin, lastLogout } -> one of
 *   { online: true, where: 'The Garden' }          (SkyBlock area, or the game's name)
 *   { online: false, lastSeen: <ms> }
 *   null                                          (status hidden by the player)
 */
export function presence(data) {
  const s = data?.session;
  if (s?.online) {
    const where = s.gameType === 'SKYBLOCK' ? (AREA_NAMES[s.mode] ?? (s.mode ? words(s.mode) : 'SkyBlock')) : words(s.gameType ?? 'Hypixel');
    return { online: true, where, skyblock: s.gameType === 'SKYBLOCK' };
  }
  const lastSeen = Math.max(data?.lastLogout ?? 0, data?.lastLogin ?? 0);
  return lastSeen ? { online: false, lastSeen } : null;
}
