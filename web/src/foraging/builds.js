// Heart of the Forest builds for tier 8, one per goal. These are worked out
// from what each perk does (NEU's perk data), not copied from a community
// guide: no current guide could be found once the official wiki closed.
// Each lists its perks in the order to level them; 'max' is the perk's max.

export const BUILDS = [
  {
    id: 'logs',
    name: 'Log farming',
    goal: 'The most Foraging Fortune and Sweep, for cutting logs and filling collections.',
    perks: [
      ['sweep', 'max'],
      ['foraging_fortune', 'max'],
      ['foraging_madness', 'max'],
      ['early_bird', 'max'],
      ['center_of_the_forest', 'max'],
      ['forest_strength', 'max'],
      ['forest_speed', 'max'],
      ['timber', 'max'],
      ['two_for_one', 'max'],
      ['precision_cutting', 'max'],
      ['efficient_forager', 'max'],
      ['collector', 'max'],
    ],
  },
  {
    id: 'contests',
    name: 'Starlyn and Agatha contests',
    goal: 'More contest points per tree, plus the Fortune and Sweep to cut fast.',
    perks: [
      ['starlyn_supreme', 'max'],
      ['sweep', 'max'],
      ['foraging_fortune', 'max'],
      ['two_for_one', 'max'],
      ['timber', 'max'],
      ['foraging_madness', 'max'],
      ['early_bird', 'max'],
      ['center_of_the_forest', 'max'],
      ['precision_cutting', 'max'],
      ['forest_strength', 'max'],
    ],
  },
  {
    id: 'gifts',
    name: 'Tree gifts and whispers',
    goal: 'Better gift loot and more whispers, to level the rest of the tree faster.',
    perks: [
      ['luck_of_the_forest', 'max'],
      ['250_gifts', 'max'],
      ['tree_whisperer', 'max'],
      ['daily_wishes', 'max'],
      ['center_of_the_forest', 'max'],
      ['lottery', 'max'],
      ['free_trial', 'max'],
      ['beekeeper', 'max'],
      ['essence_fortune', 'max'],
    ],
  },
  {
    id: 'hunting',
    name: 'Hunting on Galatea',
    goal: 'Hunter Fortune and combat stats for catching shards in the forest.',
    perks: [
      ['hunters_luck', 'max'],
      ['monster_hunter', 'max'],
      ['galateas_might', 'max'],
      ['free_trial', 'max'],
      ['damage_boost', 'max'],
      ['strength_boost', 'max'],
      ['speed_boost', 'max'],
      ['center_of_the_forest', 'max'],
    ],
  },
  {
    id: 'fishing',
    name: 'Fishing on Galatea',
    goal: 'Fishing Speed, Sea Creature Chance and the pressure and breath stats for the deep water.',
    perks: [
      ['forest_fisher', 'max'],
      ['deep_waters', 'max'],
      ['iron_lungs', 'max'],
      ['center_of_the_forest', 'max'],
    ],
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
