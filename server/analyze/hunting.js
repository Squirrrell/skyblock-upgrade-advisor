import { HUNTING_SHARDS, HUNTING_TOOLS, KUUDRA_CORES, MAJESTIC } from '../data/hunting.js';
import { deepFind, skillLevel } from '../profile.js';
import { attributeSource } from './attributes.js';
import { RARITY_INDEX, group, prettyId, priceLines, source, totals } from './helpers.js';

function skillGroup(ctx) {
  const xp = ctx.member.player_data?.experience?.SKILL_HUNTING ?? 0;
  const lvl = skillLevel(xp, 50);
  return group('skill', 'Skill', [
    source({
      id: 'hunting-level',
      name: 'Hunting level',
      current: lvl.level,
      max: 50,
      detail: `Level ${lvl.level} of 50 (+1 per level)`,
      action: lvl.level < 50 ? `${Math.ceil(lvl.toNext).toLocaleString('en-US')} XP to level ${lvl.level + 1}` : null,
      costNote: 'Earned by catching shards',
    }),
  ]);
}

function shardGroup(ctx) {
  return group(
    'shards',
    'Attribute shards',
    HUNTING_SHARDS.map((def) => attributeSource(def, ctx)),
    'Karma attributes add fortune for shards of one rarity. Echo attributes multiply the others.',
  );
}

function gearGroup(ctx) {
  const { items, book } = ctx;
  const has = (id) => items.find((i) => i.id === id);
  const rows = [];

  const cloak = has('DAVIDS_CLOAK');
  rows.push(
    source({
      id: 'davids-cloak',
      name: "David's Cloak",
      status: cloak ? (cloak.rarity === 'MYTHIC' ? 'done' : 'unknown') : 'missing',
      current: cloak?.rarity === 'MYTHIC' ? 30 : 0,
      max: 30,
      detail: cloak
        ? `Yours is ${prettyId(cloak.rarity ?? 'common')}. It reaches +30 at Mythic with Attribute Stacks milestone XXX.`
        : 'Not owned. Get it from David Hunterbrough on Galatea.',
      action: cloak ? 'Upgrade it by raising your Attribute Stacks milestone' : 'Start the hunting quest line on Galatea',
      costNote: 'Not tradeable',
    }),
  );

  const belt = has('SAFARI_BELT');
  const beltRarity = Math.min(6, RARITY_INDEX[belt?.rarity] ?? 0);
  rows.push(
    source({
      id: 'safari-belt',
      name: 'Safari Belt',
      status: belt ? (belt.rarity === 'MYTHIC' ? 'done' : 'unknown') : 'missing',
      current: belt?.rarity === 'MYTHIC' ? 30 : 0,
      max: 30,
      condition: 'Critter Safari only',
      detail: belt
        ? `Yours is ${prettyId(belt.rarity ?? 'common')}. It reaches +30 at Mythic with the Haunted and Cavern biome milestones.`
        : 'Not owned',
      action: belt ? 'Raise your biome milestones' : 'Unlock it through Critter Safari biome milestones',
      costNote: 'Not tradeable',
    }),
  );
  if (belt) {
    const majestic = belt.reforge === 'majestic';
    rows.push(
      source({
        id: 'majestic',
        name: 'Majestic reforge on Safari Belt',
        status: majestic ? 'done' : 'missing',
        current: majestic ? MAJESTIC[beltRarity] : 0,
        max: MAJESTIC[beltRarity],
        condition: 'Critter Safari only',
        detail: majestic ? 'Applied' : `Currently ${belt.reforge ? prettyId(belt.reforge) : 'not reforged'}`,
        action: 'Apply Morning Dew at a reforge anvil',
        cost: priceLines(book, [{ id: 'MORNING_DEW', qty: 1 }]),
      }),
    );
  }

  const active = items.filter((i) => i.location === 'Accessory bag' || i.location === 'Inventory');
  const core = KUUDRA_CORES.filter((c) => active.some((i) => i.id === c.id)).pop();
  const topCore = KUUDRA_CORES[KUUDRA_CORES.length - 1];
  const nextCore = KUUDRA_CORES.find((c) => c.value > (core?.value ?? 0));
  rows.push(
    source({
      id: 'kuudra-core',
      name: 'Kuudra Core accessory',
      current: core?.value ?? 0,
      max: topCore.value,
      detail: core ? `You have ${book.name(core.id) ?? prettyId(core.id)}` : 'None in your accessory bag',
      action: nextCore ? `Get ${book.name(nextCore.id) ?? prettyId(nextCore.id)}` : null,
      cost: nextCore ? priceLines(book, [{ id: nextCore.id, qty: 1 }]) : null,
      costGain: nextCore ? nextCore.value - (core?.value ?? 0) : 0,
    }),
  );
  return group('gear', 'Gear and accessories', rows);
}

function toolsGroup(ctx) {
  const { items, book } = ctx;
  const rows = HUNTING_TOOLS.map((tool) => {
    const owned = tool.tiers.filter((t) => items.some((i) => i.id === t.id)).pop();
    const top = tool.tiers[tool.tiers.length - 1];
    const next = tool.tiers.find((t) => t.value > (owned?.value ?? 0));
    const hasBasic = tool.others.some((id) => items.some((i) => i.id === id));
    return source({
      id: `hunt-${tool.id}`,
      name: tool.name,
      current: owned?.value ?? 0,
      max: top.value,
      condition: tool.condition,
      detail: owned ? `Best owned: ${book.name(owned.id) ?? prettyId(owned.id)}` : hasBasic ? 'Only a starter version owned (no fortune)' : 'Not owned',
      action: next ? `Upgrade to ${book.name(next.id) ?? prettyId(next.id)}` : null,
      cost: next ? priceLines(book, [{ id: next.id, qty: 1 }]) : null,
      costGain: next ? next.value - (owned?.value ?? 0) : 0,
    });
  });

  const net = items.find((i) => /FISHING_NET$/.test(i.id) && i.id !== 'BASIC_FISHING_NET');
  if (net) {
    const sticky = net.reforge === 'sticky';
    rows.push(
      source({
        id: 'sticky',
        name: 'Sticky reforge on fishing net',
        status: sticky ? 'done' : 'missing',
        current: sticky ? 2.5 : 0,
        max: 2.5,
        condition: 'Water shards',
        detail: sticky ? `Applied to ${net.name}` : `${net.name} is ${net.reforge ? prettyId(net.reforge) : 'not reforged'}`,
        action: 'Apply Extremely Mild Adhesive at a reforge anvil',
        cost: priceLines(book, [{ id: 'EXTREMELY_MILD_ADHESIVE', qty: 1 }]),
      }),
    );
  }
  return group('tools', 'Hunting tools', rows, 'Tool fortune only counts for its shard type, so it is not added to your total.');
}

function otherGroup(ctx) {
  const { member, pets, book } = ctx;
  const rows = [];

  // A missing key under an existing skill tree just means the perk is level 0.
  const luck = deepFind(member.skill_tree, 'hunters_luck') ?? (member.skill_tree?.nodes ? 0 : undefined);
  rows.push(
    source({
      id: 'hunters-luck',
      name: "Hunter's Luck (Heart of the Forest)",
      status: typeof luck === 'number' ? undefined : 'unknown',
      current: typeof luck === 'number' ? luck : 0,
      max: 50,
      detail: typeof luck === 'number' ? `Perk level ${luck} of 50` : 'Could not find this perk in the API data. Check your Heart of the Forest.',
      action: 'Level the perk with forest whispers',
      costNote: 'Paid with forest whispers',
    }),
  );

  const eagle = pets.filter((p) => p.type === 'EAGLE').sort((a, b) => (b.level ?? 0) - (a.level ?? 0))[0];
  rows.push(
    source({
      id: 'eagle',
      name: 'Eagle pet',
      current: eagle ? (2.5 * (eagle.level ?? 0)) / 100 : 0,
      max: 10,
      condition: 'Critter Safari, grows with other Eagle owners nearby',
      detail: eagle ? `Level ${eagle.level} ${prettyId(eagle.tier)}` : 'Not owned',
      action: eagle ? null : 'Buy a Legendary Eagle',
      cost: eagle ? null : priceLines(book, [{ id: 'PET_EAGLE_LEGENDARY', qty: 1 }]),
    }),
  );

  const now = Date.now();
  const cake = (member.player_data?.temp_stat_buffs ?? []).find((b) => /hunt/i.test(b.key ?? '') && b.expire_at > now);
  rows.push(
    source({
      id: 'starborn-cake',
      name: 'Starborn Century Cake',
      status: cake ? 'done' : 'missing',
      current: cake ? 1 : 0,
      max: 1,
      condition: 'Lasts 48 hours',
      detail: cake ? 'Active right now' : 'Not active',
      action: 'Eat one before a hunting session',
      cost: priceLines(book, [{ id: 'EPOCH_CAKE_STARBORN', qty: 1 }]),
    }),
  );

  const perks = member.player_data?.perks;
  const hotspot = perks && typeof perks === 'object' ? perks.hunting_hotspot ?? 0 : undefined;
  rows.push(
    source({
      id: 'hotspot',
      name: 'Hunting Hotspot perk',
      status: typeof hotspot === 'number' ? undefined : 'unknown',
      current: typeof hotspot === 'number' ? hotspot * 5 : 0,
      max: 25,
      condition: 'In the highlighted Critter Safari zone',
      detail: typeof hotspot === 'number' ? `Level ${hotspot} of 5` : 'Bought with Safari Essence. Not found in the API data.',
      action: 'Buy levels in the Safari Essence shop',
      cost: priceLines(book, [{ id: 'ESSENCE_SAFARI', qty: 1 }]),
      costNote: 'Price per Safari Essence',
    }),
  );
  return group('other', 'Perks, pets and boosts', rows);
}

export function analyzeHunting(ctx) {
  const groups = [skillGroup(ctx), shardGroup(ctx), gearGroup(ctx), toolsGroup(ctx), otherGroup(ctx)];
  return { id: 'hunting', title: 'Hunting fortune', groups, totals: totals(groups) };
}
