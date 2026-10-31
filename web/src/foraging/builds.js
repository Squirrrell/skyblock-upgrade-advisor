// Tier 8 Heart of the Forest trees that players use, read off in-game
// screenshots of the perk menu. Both unlock the same 18 perks bar four:
// Half Full and Lottery in one, Half Empty and Speed Boost in the other.
// Half Full and Half Empty pair up: each gives Fortune and Sweep for every
// player on the island who runs the other, so a group splits between them.
// Perks are listed in the order to level them; abilities are left to taste.

const SHARED = [
  ['sweep', 50],
  ['foraging_fortune', 50],
  ['foraging_madness', 1],
  ['center_of_the_forest', 5],
  ['forest_strength', 50],
  ['forest_speed', 50],
  ['two_for_one', 100],
  ['timber', 10],
  ['starlyn_supreme', 100],
  ['efficient_forager', 100],
  ['luck_of_the_forest', 40],
  ['250_gifts', 40],
  ['essence_fortune', 50],
  ['ricochet', 10],
  ['hunters_luck', 50],
  ['iron_lungs', 50],
];

export const BUILDS = [
  {
    id: 'half-full',
    name: 'Half Full',
    goal: 'Gains +50 Fortune and +25 Sweep for each player near you running Half Empty (up to 5). Takes Lottery for its daily random buff.',
    perks: [['half_full', 25], ...SHARED.slice(0, 4), ['lottery', 1], ...SHARED.slice(4)],
  },
  {
    id: 'half-empty',
    name: 'Half Empty',
    goal: 'Gains +50 Fortune and +25 Sweep for each player near you running Half Full (up to 5). Takes Speed Boost, which Forest Speed turns into more Fortune and Sweep.',
    perks: [['half_empty', 25], ...SHARED.slice(0, 4), ['speed_boost', 50], ...SHARED.slice(4)],
  },
];

/** A build's targets as { perkId: level }, and how far `perks` (the player's levels) are. */
export function buildProgress(build, perks, hotf) {
  const targets = {};
  for (const [id, lvl] of build.perks) {
    const max = hotf?.perks?.[id]?.maxLevel;
    if (max) targets[id] = lvl === 'max' ? max : Math.min(lvl, max);
  }
  const need = Object.values(targets).reduce((a, b) => a + b, 0);
  const have = Object.entries(targets).reduce((n, [id, t]) => n + Math.min(perks[id] ?? 0, t), 0);
  return { targets, done: need ? have / need : 0 };
}
