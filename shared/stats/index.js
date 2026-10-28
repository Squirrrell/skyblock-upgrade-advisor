// Everything about a profile that is not a fortune upgrade: skills, slayers,
// dungeons, mining, pets, collections, minions, Crimson Isle, the Rift,
// events, and a rough networth. Pure functions over the profiles payload,
// so the Node server and the static build share it.
import { GARDEN_LEVEL_XP } from '../data/farming.js';
import { prettyId } from '../analyze/helpers.js';
import { MINION_MAX_TIER } from './constants.js';
import { SKILLS, catacombsLevel, hotfLevel, hotmLevel, levelFrom, skillCap, skillTable, slayerLevel, SKILL_MAX } from './levels.js';
import { computeNetworth, itemStars, itemValue, itemValueParts, starLabel } from './networth.js';
import { shardStats } from './shards.js';

const RARITY_RANK = { COMMON: 0, UNCOMMON: 1, RARE: 2, EPIC: 3, LEGENDARY: 4, MYTHIC: 5, DIVINE: 6, SPECIAL: 7, VERY_SPECIAL: 8 };
const sum = (values) => values.reduce((a, b) => a + (Number(b) || 0), 0);
const members = (profile) => Object.values(profile.members ?? {});

// ------------------------------------------------------------------ skills

function skills(member, profile) {
  const exp = member.player_data?.experience;
  const list = SKILLS.map(({ id, name, cosmetic }) => {
    let xp = exp?.[`SKILL_${id.toUpperCase()}`] ?? 0;
    // Social XP is pooled across a coop.
    if (id === 'social') xp = sum(members(profile).map((m) => m.player_data?.experience?.SKILL_SOCIAL ?? 0));
    const cap = skillCap(id, member);
    const info = levelFrom(xp, skillTable(id), cap);
    return { id, name, cosmetic: Boolean(cosmetic), maxLevel: Math.max(cap, SKILL_MAX[id] ?? cap), ...info };
  });
  const counted = list.filter((s) => !s.cosmetic);
  return {
    apiOff: !exp,
    list,
    average: counted.length ? sum(counted.map((s) => s.level)) / counted.length : 0,
    averageExact: counted.length ? sum(counted.map((s) => s.exact)) / counted.length : 0,
    totalXp: sum(counted.map((s) => s.xp)),
  };
}

// ------------------------------------------------------------------ slayers

const SLAYERS = [
  { id: 'zombie', name: 'Revenant Horror' },
  { id: 'spider', name: 'Tarantula Broodfather' },
  { id: 'wolf', name: 'Sven Packmaster' },
  { id: 'enderman', name: 'Voidgloom Seraph' },
  { id: 'blaze', name: 'Inferno Demonlord' },
  { id: 'vampire', name: 'Riftstalker Bloodfiend' },
];

function slayers(member) {
  const bosses = member.slayer?.slayer_bosses ?? {};
  const list = SLAYERS.map(({ id, name }) => {
    const data = bosses[id] ?? {};
    const info = slayerLevel(id, data.xp ?? 0);
    const kills = Array.from({ length: info.maxTier }, (_, t) => data[`boss_kills_tier_${t}`] ?? 0);
    return { id, name, ...info, kills, totalKills: sum(kills) };
  });
  return { list, totalXp: sum(list.map((s) => s.xp)) };
}

// ------------------------------------------------------------------ dungeons

const CLASSES = ['healer', 'mage', 'berserk', 'archer', 'tank'];

function floorRows(type, master) {
  if (!type) return [];
  const rows = [];
  for (let f = master ? 1 : 0; f <= 7; f++) {
    const completions = type.tier_completions?.[f] ?? 0;
    const played = type.times_played?.[f] ?? 0;
    if (!completions && !played && !type.best_score?.[f]) continue;
    rows.push({
      floor: master ? `M${f}` : f === 0 ? 'Entrance' : `F${f}`,
      completions,
      played,
      bestScore: type.best_score?.[f] ?? null,
      fastest: type.fastest_time?.[f] ?? null,
      fastestS: type.fastest_time_s?.[f] ?? null,
      fastestSPlus: type.fastest_time_s_plus?.[f] ?? null,
      mobsKilled: type.mobs_killed?.[f] ?? 0,
      watcherKills: type.watcher_kills?.[f] ?? 0,
    });
  }
  return rows;
}

function dungeons(member) {
  const d = member.dungeons;
  if (!d?.dungeon_types?.catacombs) return { played: false };
  const cata = d.dungeon_types.catacombs;
  const master = d.dungeon_types.master_catacombs;
  const classes = CLASSES.map((id) => ({ id, name: prettyId(id), ...catacombsLevel(d.player_classes?.[id]?.experience ?? 0) }));
  const normalRuns = cata.tier_completions?.total ?? sum(Object.entries(cata.tier_completions ?? {}).filter(([k]) => k !== 'total').map(([, v]) => v));
  const masterRuns = sum(Object.entries(master?.tier_completions ?? {}).filter(([k]) => k !== 'total').map(([, v]) => v));
  return {
    played: true,
    catacombs: catacombsLevel(cata.experience ?? 0),
    classes,
    classAverage: sum(classes.map((c) => c.level)) / classes.length,
    selectedClass: d.selected_dungeon_class ?? null,
    secrets: d.secrets ?? 0,
    secretsPerRun: normalRuns + masterRuns ? (d.secrets ?? 0) / (normalRuns + masterRuns) : 0,
    completions: { normal: normalRuns, master: masterRuns },
    highestFloor: cata.highest_tier_completed ?? null,
    highestMaster: master?.highest_tier_completed ?? null,
    floors: floorRows(cata, false),
    masterFloors: floorRows(master, true),
    journals: d.dungeon_journal?.unlocked_journals?.length ?? 0,
  };
}

// ------------------------------------------------------------------ mining, foraging, hunting

function countNodes(nodes) {
  if (!nodes) return 0;
  return Object.entries(nodes).filter(([k, v]) => !k.startsWith('toggle_') && typeof v === 'number' && v > 0).length;
}

function mining(member) {
  const mc = member.mining_core ?? {};
  const tree = member.skill_tree ?? {};
  const hotm = hotmLevel(tree.experience?.mining ?? mc.experience ?? 0);
  const powder = ['mithril', 'gemstone', 'glacite'].map((type) => {
    const current = mc[`powder_${type}`] ?? 0;
    const spent = mc[`powder_spent_${type}`] ?? 0;
    return { type, current, spent, total: current + spent };
  });
  const forge = [];
  for (const slots of Object.values(member.forge?.forge_processes ?? {})) {
    for (const p of Object.values(slots ?? {})) {
      if (p?.id) forge.push({ id: p.id, slot: p.slot, startTime: p.startTime ?? null });
    }
  }
  const crystals = Object.entries(mc.crystals ?? {}).map(([id, c]) => ({ id, name: prettyId(id.replace(/_crystal$/, '')), state: c?.state ?? null, found: c?.total_found ?? 0 }));
  const glacite = member.glacite_player_data ?? null;
  return {
    hotm,
    powder,
    tokensSpent: tree.tokens_spent?.mountain ?? mc.tokens_spent ?? 0,
    nodes: countNodes(tree.nodes?.mining ?? mc.nodes),
    peak: tree.nodes?.mining?.special_0 ?? mc.nodes?.special_0 ?? 0,
    forge,
    crystals,
    corpses: glacite?.corpses_looted ? Object.entries(glacite.corpses_looted).map(([id, n]) => ({ id, name: prettyId(id), count: n })) : [],
    fossils: glacite?.fossils_donated?.length ?? null,
  };
}

function foraging(member) {
  const tree = member.skill_tree ?? {};
  const f = member.foraging ?? {};
  const gifts = Object.entries(f.tree_gifts ?? {})
    .filter(([k, v]) => typeof v === 'number')
    .map(([id, count]) => ({ id, name: prettyId(id), count, milestone: f.tree_gifts?.milestone_tier_claimed?.[id] ?? 0 }));
  return {
    hotf: hotfLevel(tree.experience?.foraging ?? 0),
    tokensSpent: sum(Object.entries(tree.tokens_spent ?? {}).filter(([k]) => k.startsWith('forest')).map(([, v]) => v)),
    nodes: countNodes(tree.nodes?.foraging),
    gifts,
    hinaTier: f.hina?.tasks?.tier_claimed ?? 0,
    fishFamily: f.fish_family?.length ?? 0,
    starlynBests: Object.entries(f.starlyn?.personal_bests ?? {}).map(([id, v]) => ({ id, name: prettyId(id), value: v })),
  };
}

function huntingStats(member) {
  const ps = member.player_stats ?? {};
  const safari = member.safari ?? {};
  return {
    shardsFused: member.shards?.fused ?? 0,
    shardTypesOwned: member.shards?.owned?.length ?? 0,
    shardsOwned: sum((member.shards?.owned ?? []).map((s) => s.amount_owned)),
    uniqueShards: ps.unique_shards ?? 0,
    hunts: {
      combat: ps.shard_combat_hunts ?? 0,
      fishing: ps.shard_fishing_hunts ?? 0,
      forest: ps.shard_forest_hunts ?? 0,
      salt: ps.shard_salt_hunts ?? 0,
    },
    attributesUnlocked: Object.keys(member.attributes?.stacks ?? {}).length,
    safariCaptures: sum(Object.values(safari.biome_captures ?? {})),
    biomes: Object.entries(safari.biome_captures ?? {}).map(([id, n]) => ({ id, name: prettyId(id), captures: n, milestone: safari.milestone_claimed_tiers?.[id] ?? 0 })),
    critters: safari.discovered_critters?.length ?? 0,
    tickets: safari.tickets ?? {},
    pelts: member.quests?.trapper_quest?.pelt_count ?? 0,
  };
}

// ------------------------------------------------------------------ pets

function pets(member, ctxPets) {
  const raw = member.pets_data?.pets ?? [];
  const list = ctxPets.map((p, i) => ({
    ...p,
    name: prettyId(p.type),
    skin: raw[i]?.skin ?? null,
    candyUsed: raw[i]?.candyUsed ?? 0,
  }));
  list.sort((a, b) => Number(b.active) - Number(a.active) || (RARITY_RANK[b.tier] ?? 0) - (RARITY_RANK[a.tier] ?? 0) || (b.level ?? 0) - (a.level ?? 0));
  return {
    list,
    unique: new Set(list.map((p) => p.type)).size,
    maxed: list.filter((p) => p.level != null && p.level >= p.maxLevel).length,
    score: member.leveling?.highest_pet_score ?? null,
    totalXp: member.player_stats?.pets?.total_exp_gained ?? null,
  };
}

// ------------------------------------------------------------------ collections & minions

const MINION_SLOTS = [
  [0, 5], [5, 6], [15, 7], [30, 8], [50, 9], [75, 10], [100, 11], [125, 12], [150, 13], [175, 14], [200, 15],
  [225, 16], [250, 17], [275, 18], [300, 19], [350, 20], [400, 21], [450, 22], [500, 23], [550, 24], [600, 25], [650, 26],
  [700, 27],
];

function collections(member, profile) {
  const total = {};
  for (const m of members(profile)) {
    for (const [id, n] of Object.entries(m.collection ?? {})) total[id] = (total[id] ?? 0) + n;
  }
  return { apiOff: !member.collection, mine: member.collection ?? {}, total };
}

function minions(profile) {
  const crafted = new Set();
  for (const m of members(profile)) for (const g of m.player_data?.crafted_generators ?? []) crafted.add(g);
  const byType = {};
  for (const g of crafted) {
    const cut = g.lastIndexOf('_');
    const type = g.slice(0, cut);
    const tier = Number(g.slice(cut + 1));
    if (!type || !tier) continue;
    (byType[type] ??= new Set()).add(tier);
  }
  const types = new Set([...Object.keys(MINION_MAX_TIER), ...Object.keys(byType)]);
  const list = [...types]
    .map((type) => {
      const tiers = [...(byType[type] ?? [])].sort((a, b) => a - b);
      const maxTier = MINION_MAX_TIER[type] ?? Math.max(11, ...tiers);
      return { type, name: prettyId(type), tiers, maxTier, highest: tiers.at(-1) ?? 0 };
    })
    .sort((a, b) => b.tiers.length - a.tiers.length || a.name.localeCompare(b.name));

  const uniques = crafted.size;
  let slots = 5;
  let nextAt = null;
  for (const [need, s] of MINION_SLOTS) {
    if (uniques >= need) slots = s;
    else {
      nextAt = need;
      break;
    }
  }
  const community = Math.max(0, ...(profile.community_upgrades?.upgrade_states ?? []).filter((u) => u.upgrade === 'minion_slots').map((u) => u.tier));
  return {
    uniques,
    possible: Object.values(MINION_MAX_TIER).reduce((a, b) => a + b, 0),
    slots,
    communitySlots: community,
    nextSlotAt: nextAt,
    list,
  };
}

// ------------------------------------------------------------------ Crimson Isle, Kuudra, Rift

const DOJO = [
  ['mob_kb', 'Force'],
  ['wall_jump', 'Stamina'],
  ['archer', 'Mastery'],
  ['sword_swap', 'Discipline'],
  ['snake', 'Swiftness'],
  ['lock_head', 'Control'],
  ['fireball', 'Tenacity'],
];
const dojoGrade = (p) => (p >= 1000 ? 'S' : p >= 800 ? 'A' : p >= 600 ? 'B' : p >= 400 ? 'C' : p >= 200 ? 'D' : p > 0 ? 'F' : '-');
// Total dojo points per belt, from the community wiki's Dojo page.
const BELTS = [
  [7000, 'Black'],
  [6000, 'Brown'],
  [4000, 'Blue'],
  [2000, 'Green'],
  [1000, 'Yellow'],
  [0, 'None yet'],
];
// Faction titles from the wiki's Reputation page. Reputation cannot go negative.
const REP_RANKS = [
  [12000, 'Hero'],
  [7000, 'Honored'],
  [3000, 'Trusted'],
  [1000, 'Friendly'],
  [-Infinity, 'Neutral'],
];
const KUUDRA_TIERS = [
  ['none', 'Basic'],
  ['hot', 'Hot'],
  ['burning', 'Burning'],
  ['fiery', 'Fiery'],
  ['infernal', 'Infernal'],
];
const TROPHY_FISH = [
  'sulphur_skitter', 'obfuscated_fish_1', 'steaming_hot_flounder', 'gusher', 'blobfish', 'obfuscated_fish_2', 'slugfish', 'flyfish',
  'obfuscated_fish_3', 'lava_horse', 'mana_ray', 'volcanic_stonefish', 'vanille', 'skeleton_fish', 'moldfin', 'soul_fish', 'karate_fish', 'golden_fish',
];

function crimson(member) {
  const n = member.nether_island_player_data ?? {};
  const rank = (rep) => REP_RANKS.find(([min]) => rep >= min)[1];
  const dojo = DOJO.map(([id, name]) => {
    const points = n.dojo?.[`dojo_points_${id}`] ?? 0;
    return { id, name, points, grade: dojoGrade(points), time: n.dojo?.[`dojo_time_${id}`] ?? null };
  });
  const dojoTotal = sum(dojo.map((t) => t.points));
  const tf = member.trophy_fish ?? {};
  return {
    faction: n.selected_faction ?? null,
    mages: { rep: n.mages_reputation ?? 0, rank: rank(n.mages_reputation ?? 0) },
    barbarians: { rep: n.barbarians_reputation ?? 0, rank: rank(n.barbarians_reputation ?? 0) },
    kuudra: KUUDRA_TIERS.map(([id, name]) => ({ id, name, completions: n.kuudra_completed_tiers?.[id] ?? 0, highestWave: n.kuudra_completed_tiers?.[`highest_wave_${id}`] ?? null })),
    dojo,
    dojoTotal,
    belt: BELTS.find(([min]) => dojoTotal >= min)[1],
    lastMinibosses: (n.last_minibosses_killed ?? []).map(prettyId),
    matriarchPearls: n.matriarch?.pearls_collected ?? 0,
    trophyFish: {
      total: tf.total_caught ?? 0,
      rewards: tf.rewards?.length ?? 0,
      list: TROPHY_FISH.map((id) => ({
        id,
        name: prettyId(id.replace(/_\d$/, '')) + (/_\d$/.test(id) ? ` ${id.slice(-1)}` : ''),
        total: tf[id] ?? 0,
        bronze: tf[`${id}_bronze`] ?? 0,
        silver: tf[`${id}_silver`] ?? 0,
        gold: tf[`${id}_gold`] ?? 0,
        diamond: tf[`${id}_diamond`] ?? 0,
      })),
    },
  };
}

function rift(member) {
  const r = member.rift ?? {};
  const s = member.player_stats?.rift ?? {};
  return {
    visited: Boolean(member.rift),
    motes: member.currencies?.motes_purse ?? 0,
    lifetimeMotes: s.lifetime_motes_earned ?? 0,
    visits: s.visits ?? 0,
    enigmaSouls: r.enigma?.found_souls?.length ?? 0,
    timecharms: r.gallery?.secured_trophies?.length ?? 0,
    catsFound: r.dead_cats?.found_cats?.length ?? 0,
    montezuma: Boolean(r.dead_cats?.unlocked_pet),
    eyesKilled: r.wither_cage?.killed_eyes?.length ?? 0,
    areas: (r.lifetime_purchased_boundaries ?? []).map(prettyId),
    burgers: r.castle?.grubber_stacks ?? 0,
  };
}

// ------------------------------------------------------------------ events & misc

function chocolate(member) {
  const e = member.events?.easter;
  if (!e) return null;
  const rabbits = Object.entries(e.rabbits ?? {}).filter(([k, v]) => typeof v === 'number');
  return {
    total: e.total_chocolate ?? 0,
    current: e.chocolate ?? 0,
    sincePrestige: e.chocolate_since_prestige ?? 0,
    prestige: e.chocolate_level ?? 1,
    uniqueRabbits: rabbits.length,
    duplicates: sum(rabbits.map(([, v]) => Math.max(0, v - 1))),
    barn: e.rabbit_barn_capacity_level ?? 0,
    timeTower: e.time_tower?.level ?? 0,
    employees: Object.entries(e.employees ?? {}).map(([id, level]) => ({ id, name: prettyId(id.replace(/^rabbit_/, '')), level })),
    hitmenSlots: e.rabbit_hitmen?.rabbit_hitmen_slots ?? 0,
    rarityUpgrades: e.rabbit_rarity_upgrades ?? 0,
    multiplierUpgrades: e.chocolate_multiplier_upgrades ?? 0,
    clickUpgrades: e.click_upgrades ?? 0,
    locationsFound: sum(Object.values(e.rabbits?.collected_locations ?? {}).map((l) => l.length)),
  };
}

const CROP_NAMES = {
  WHEAT: 'Wheat', CARROT_ITEM: 'Carrot', POTATO_ITEM: 'Potato', PUMPKIN: 'Pumpkin', MELON: 'Melon', SUGAR_CANE: 'Sugar Cane',
  CACTUS: 'Cactus', 'INK_SACK:3': 'Cocoa Beans', MUSHROOM_COLLECTION: 'Mushroom', NETHER_STALK: 'Nether Wart',
  MOONFLOWER: 'Moonflower', WILD_ROSE: 'Wild Rose', DOUBLE_PLANT: 'Sunflower',
};
export const cropName = (id) => CROP_NAMES[id] ?? prettyId(id);

function jacob(member) {
  const j = member.jacobs_contest;
  if (!j) return null;
  const contests = Object.values(j.contests ?? {});
  const earned = { bronze: 0, silver: 0, gold: 0, platinum: 0, diamond: 0 };
  for (const c of contests) if (c.claimed_medal && earned[c.claimed_medal] != null) earned[c.claimed_medal]++;
  return {
    contests: contests.length,
    medals: j.medals_inv ?? {},
    earned,
    perks: { doubleDrops: j.perks?.double_drops ?? 0, levelCap: j.perks?.farming_level_cap ?? 0 },
    personalBests: Object.entries(j.personal_bests ?? {}).map(([id, v]) => ({ id, name: cropName(id), value: v })).sort((a, b) => b.value - a.value),
    brackets: Object.fromEntries(Object.entries(j.unique_brackets ?? {}).map(([k, v]) => [k, v.length])),
  };
}

function garden(g, member) {
  if (!g) return null;
  let level = 1;
  for (let i = 0; i < GARDEN_LEVEL_XP.length; i++) if ((g.garden_experience ?? 0) >= GARDEN_LEVEL_XP[i]) level = i + 1;
  return {
    level,
    xp: g.garden_experience ?? 0,
    plots: g.unlocked_plots_ids?.length ?? 0,
    visitorsServed: g.commission_data?.total_completed ?? 0,
    uniqueVisitors: g.commission_data?.unique_npcs_served ?? 0,
    copper: member.garden_player_data?.copper ?? 0,
    cropUpgrades: Object.entries(g.crop_upgrade_levels ?? {}).map(([id, lvl]) => ({ id, name: cropName(id), level: lvl })),
    milestones: Object.entries(g.resources_collected ?? {}).map(([id, n]) => ({ id, name: cropName(id), collected: n })).sort((a, b) => b.collected - a.collected),
    composter: g.composter_data?.upgrades ?? {},
  };
}

function topEntries(obj, n, skip = []) {
  return Object.entries(obj ?? {})
    .filter(([k, v]) => typeof v === 'number' && !skip.includes(k))
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([id, value]) => ({ id, name: prettyId(id.replace(/_\d+$/, '')), value }));
}

function bestScores(game) {
  if (!game) return [];
  return Object.entries(game)
    .filter(([k]) => k.startsWith('best_score_'))
    .map(([k, v]) => ({ tier: Number(k.slice(11)), best: v, claims: game[`claims_${k.slice(11)}`] ?? 0 }))
    .sort((a, b) => a.tier - b.tier);
}

function misc(member) {
  const ps = member.player_stats ?? {};
  const kills = Object.entries(member.bestiary?.kills ?? {}).filter(([, v]) => typeof v === 'number');
  const exp = member.experimentation;
  return {
    fairySouls: { collected: member.fairy_soul?.total_collected ?? 0, unspent: member.fairy_soul?.unspent_souls ?? 0, exchanges: member.fairy_soul?.fairy_exchanges ?? 0 },
    bestiary: { milestone: member.bestiary?.milestone?.last_claimed_milestone ?? 0, kills: sum(kills.map(([, v]) => v)), mobs: kills.length },
    topKills: topEntries(ps.kills, 10, ['total']),
    topDeaths: topEntries(ps.deaths, 5, ['total']),
    deaths: member.player_data?.death_count ?? sum(Object.entries(ps.deaths ?? {}).filter(([k]) => k !== 'total').map(([, v]) => v)),
    highestCrit: ps.highest_critical_damage ?? null,
    highestDamage: ps.highest_damage ?? null,
    auctions: ps.auctions
      ? { created: ps.auctions.created ?? 0, completed: ps.auctions.completed ?? 0, won: ps.auctions.won ?? 0, bids: ps.auctions.bids ?? 0, earned: ps.auctions.gold_earned ?? 0, spent: ps.auctions.gold_spent ?? 0, fees: ps.auctions.fees ?? 0, highestBid: ps.auctions.highest_bid ?? 0 }
      : null,
    gifts: ps.gifts ?? null,
    candy: ps.candy_collected?.total ?? null,
    seaCreatures: ps.sea_creature_kills ?? 0,
    itemsFished: ps.items_fished?.total ?? 0,
    dragons: ps.end_island?.dragon_fight ?? null,
    zealotLoot: ps.end_island?.special_zealot_loot_collected ?? 0,
    races: Object.entries(ps.races ?? {})
      .filter(([, v]) => typeof v === 'number')
      .map(([id, ms]) => ({ id, name: prettyId(id.replace(/_best_time$/, '')), ms })),
    experiments: exp
      ? {
          superpairs: bestScores(exp.pairings),
          chronomatron: bestScores(exp.simon),
          ultrasequencer: bestScores(exp.numbers),
          serums: exp.serums_drank ?? 0,
        }
      : null,
    essence: Object.entries(member.currencies?.essence ?? {}).map(([type, d]) => ({ type, name: prettyId(type), amount: d?.current ?? 0 })),
    essencePerks: Object.keys(member.player_data?.perks ?? {}).length,
    activeEffects: (member.player_data?.active_effects ?? []).length,
    soulflow: member.item_data?.soulflow ?? 0,
  };
}

// ------------------------------------------------------------------ accessories

function accessories(member, items, book) {
  const bag = items.filter((i) => i.location === 'Accessory bag');
  const abs = member.accessory_bag_storage ?? {};
  return {
    magicalPower: abs.highest_magical_power ?? 0,
    selectedPower: abs.selected_power ? prettyId(abs.selected_power) : null,
    unlockedPowers: (abs.unlocked_powers ?? []).map(prettyId),
    tuning: Object.entries(abs.tuning?.slot_0 ?? {}).filter(([, v]) => v > 0).map(([stat, points]) => ({ stat: prettyId(stat), points })),
    bagUpgrades: abs.bag_upgrades_purchased ?? 0,
    owned: bag.map((i) => ({
      id: i.id,
      name: i.name,
      rarity: i.rarity,
      recombobulated: i.recombobulated,
      enrichment: i.extra?.talisman_enrichment ?? null,
      // For the detailed tooltip: in-game lore, when it was obtained, its value.
      lore: i.lore,
      obtained: i.obtained,
      value: itemValue(i, book),
    })),
    apiOff: !member.inventory,
  };
}

// ------------------------------------------------------------------ inventory

const INVENTORY_ORDER = ['Armor', 'Equipment', 'Inventory', 'Loadout', 'Wardrobe', 'Ender chest', 'Backpack', 'Personal vault', 'Accessory bag', 'Fishing bag', 'Quiver', 'Potion bag', 'Farming toolkit', 'Hunting toolkit'];

// Menu items and placeholders the game puts in inventories.
const HIDDEN_ITEMS = new Set(['SKYBLOCK_MENU', 'SKYBLOCK_GUIDE']);

/** "5 dungeon stars, 2 master stars", "8 Kuudra stars", or null. */
function starText(stars) {
  if (!stars.essence) return null;
  return [starLabel(stars), stars.master && `${stars.master} master star${stars.master === 1 ? '' : 's'}`].filter(Boolean).join(', ');
}

function inventory(items, book) {
  const groups = {};
  for (const item of items) {
    if (HIDDEN_ITEMS.has(item.id)) continue;
    const list = (groups[item.location] ??= []);
    // Plain stackables (no uuid, nothing applied) merge into one row per item.
    const plain = !item.uuid && !item.reforge && !item.petInfo && !Object.keys(item.enchantments ?? {}).length;
    const same = plain && list.find((x) => x.plain && x.id === item.id && x.name === item.name);
    if (same) {
      same.count += item.count;
      same.value += itemValue(item, book);
      continue;
    }
    const worth = itemValueParts(item, book);
    list.push({
      plain,
      id: item.id,
      uuid: item.uuid,
      name: item.hasDisplayName ? item.name : book.name?.(item.id) ?? item.name,
      rawName: item.rawName,
      count: item.count,
      rarity: item.rarity,
      reforge: item.reforge && item.reforge !== 'none' ? item.reforge : null,
      recombobulated: item.recombobulated,
      stars: starText(itemStars(item, book)),
      hotPotato: item.hotPotato,
      enchantments: item.enchantments,
      gems: Object.keys(item.gems ?? {}).length,
      pet: item.petInfo ? { type: item.petInfo.type, tier: item.petInfo.tier } : null,
      value: worth.total,
      // What the value is made of: the item itself and each upgrade on it.
      base: worth.base,
      parts: worth.parts,
      // For the icon: 1.8 item id, player-head skin, leather dye.
      mat: item.mat,
      skull: item.skull,
      color: item.color,
    });
  }
  return INVENTORY_ORDER.filter((l) => groups[l]).map((location) => ({ location, items: groups[location] }))
    .concat(Object.keys(groups).filter((l) => !INVENTORY_ORDER.includes(l)).map((location) => ({ location, items: groups[location] })));
}

// ------------------------------------------------------------------ overview

function overview(member, profile, extra) {
  const sbXp = member.leveling?.experience ?? 0;
  return {
    sbLevel: Math.floor(sbXp / 100),
    sbProgress: (sbXp % 100) / 100,
    sbXp,
    purse: member.currencies?.coin_purse ?? 0,
    bank: profile.banking?.balance ?? null,
    personalBank: member.profile?.bank_account ?? null,
    firstJoin: member.profile?.first_join ?? null,
    coopMembers: Object.keys(profile.members ?? {}).length,
    cookieBuff: Boolean(member.profile?.cookie_buff_active),
    selectedSymbol: member.leveling?.selected_symbol ? prettyId(member.leveling.selected_symbol) : null,
    ...extra,
  };
}

/** Full stats object for the report. `ctx` is the analyzer context from report.js. */
export function buildStats(ctx) {
  const { member, profile, items, book } = ctx;
  const s = skills(member, profile);
  const sl = slayers(member);
  const dg = dungeons(member);
  const mn = mining(member);
  const fg = foraging(member);
  const pt = pets(member, ctx.pets);
  const acc = accessories(member, items, book);
  const nw = computeNetworth({ items, pets: pt.list, member, profile, book });
  return {
    overview: overview(member, profile, {
      skillAverage: s.average,
      catacombs: dg.played ? dg.catacombs.exact : null,
      slayerXp: sl.totalXp,
      networth: nw.total,
      magicalPower: acc.magicalPower,
      hotm: mn.hotm.level,
      hotf: fg.hotf.level,
      pets: pt.list.length,
      fairySouls: member.fairy_soul?.total_collected ?? 0,
    }),
    skills: s,
    slayers: sl,
    dungeons: dg,
    mining: mn,
    foraging: fg,
    hunting: huntingStats(member),
    shards: shardStats(member, book, ctx.attrConstants),
    pets: pt,
    collections: collections(member, profile),
    minions: minions(profile),
    crimson: crimson(member),
    rift: rift(member),
    chocolate: chocolate(member),
    jacob: jacob(member),
    garden: garden(ctx.garden, member),
    misc: misc(member),
    accessories: acc,
    inventory: inventory(items, book),
    networth: nw,
  };
}
