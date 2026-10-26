import {
  ACCESSORY_FAMILIES,
  ARMOR_SETS,
  ARMOR_SLOTS,
  CHIP_MAX_LEVEL,
  CROP_UPGRADE_KEYS,
  EQUIPMENT_MAX_VISITORS,
  EQUIPMENT_SETS,
  EQUIPMENT_SLOTS,
  FARMING_PETS,
  FARMING_SHARDS,
  FARMING_TOOLS,
  GARDEN_CHIPS,
  GARDEN_LEVEL_XP,
  PERIDOT,
  PET_ITEMS,
  PET_UPGRADES,
  REFORGES,
  TOOL_ENCHANTS,
} from '../data/farming.js';
import { skillLevel } from '../profile.js';
import { attributeSource } from './attributes.js';
import { RARITY_INDEX, group, prettyId, priceLines, round, source, totals } from './helpers.js';

const rarityIdx = (item) => Math.min(5, RARITY_INDEX[item?.rarity] ?? 0);
const toRoman = (n) => ['0', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'][n] ?? String(n);

function gardenLevel(xp = 0) {
  let level = 1;
  for (let i = 0; i < GARDEN_LEVEL_XP.length; i++) if (xp >= GARDEN_LEVEL_XP[i]) level = i + 1;
  return level;
}

// ---------------------------------------------------------------- skill

function skillGroup(ctx) {
  const perks = ctx.member.jacobs_contest?.perks ?? {};
  const capUpgrades = perks.farming_level_cap ?? 0;
  const xp = ctx.member.player_data?.experience?.SKILL_FARMING ?? 0;
  const lvl = skillLevel(xp, 50 + capUpgrades);
  const levelAction = [];
  if (lvl.level < lvl.cap) levelAction.push(`${Math.ceil(lvl.toNext).toLocaleString('en-US')} XP to level ${lvl.level + 1}`);
  if (capUpgrades < 10) levelAction.push(`raise the level cap at Anita (${capUpgrades}/10 bought, costs gold medals)`);

  const anita = perks.double_drops ?? 0;
  return group('skill', 'Skill and Anita', [
    source({
      id: 'farming-level',
      name: 'Farming level',
      current: lvl.level * 4,
      max: 240,
      detail: `Level ${lvl.level} of ${lvl.cap} (+4 per level)`,
      action: levelAction.length ? capitalize(levelAction.join(', then ')) : null,
      costNote: 'Earned by farming',
    }),
    source({
      id: 'anita-bonus',
      name: "Anita's Extra Farming Fortune",
      current: anita * 4,
      max: 60,
      detail: `Tier ${anita} of 15 (+4 per tier)`,
      action: 'Buy the next tier from Anita in the Garden',
      costNote: 'Paid with Jacob contest gold medals',
    }),
    source({
      id: 'personal-bests',
      name: 'Personal bests perk',
      status: perks.personal_bests ? 'done' : 'missing',
      current: perks.personal_bests ? 100 : 0,
      max: 100,
      unit: 'crop fortune',
      condition: 'Scales with your best score per crop',
      detail: perks.personal_bests ? 'Unlocked' : 'Not unlocked yet',
      action: 'Unlock it at Anita, then beat your contest records',
      costNote: 'Paid with Jacob contest medals',
    }),
  ]);
}

// ---------------------------------------------------------------- garden

function gardenGroup(ctx) {
  const garden = ctx.garden;
  if (!garden) {
    return group('garden', 'Garden', [
      source({
        id: 'garden-missing',
        name: 'Garden data',
        status: 'unknown',
        max: 72,
        detail: 'Hypixel returned no garden for this profile, so plots and crop upgrades could not be checked.',
      }),
    ]);
  }

  const plots = garden.unlocked_plots_ids?.length ?? 0;
  const levels = garden.crop_upgrade_levels ?? {};
  const cropRows = Object.entries(CROP_UPGRADE_KEYS).map(([key, name]) => ({ name, level: levels[key] ?? 0 }));
  const unmaxed = cropRows.filter((c) => c.level < 9);
  const totalLevels = cropRows.reduce((a, c) => a + c.level, 0);
  const visits = garden.commission_data ?? {};
  const level = gardenLevel(garden.garden_experience ?? 0);
  const pestKills = Object.entries(ctx.member.bestiary?.kills ?? {})
    .filter(([k]) => k.startsWith('pest_'))
    .reduce((a, [, v]) => a + v, 0);

  return group('garden', 'Garden', [
    source({
      id: 'plots',
      name: 'Garden plots',
      current: plots * 3,
      max: 72,
      detail: `${plots} of 24 plots unlocked (+3 each)`,
      action: plots < 24 ? 'Unlock more plots from the Desk' : null,
      costNote: 'Paid with compost and other garden resources',
    }),
    source({
      id: 'crop-upgrades',
      name: 'Crop upgrades',
      current: totalLevels,
      max: cropRows.length * 9,
      unit: 'levels',
      condition: '+5 crop fortune per level on that crop',
      detail: unmaxed.length
        ? unmaxed.map((c) => `${c.name} ${c.level}/9`).join(', ')
        : 'Every crop is at 9/9',
      action: unmaxed.length ? 'Buy crop upgrades at the Desk' : null,
      costNote: 'Paid with copper',
    }),
    source({
      id: 'garden-level',
      name: 'Garden level',
      current: level,
      max: 15,
      unit: 'levels',
      detail: `Level ${level}. Feeds the Green Bandana (+4 fortune per level).`,
      action: level < 15 ? 'Level up by serving visitors and reaching crop milestones' : null,
    }),
    source({
      id: 'visitors',
      name: 'Visitors served',
      current: Math.min(visits.total_completed ?? 0, EQUIPMENT_MAX_VISITORS),
      max: EQUIPMENT_MAX_VISITORS,
      unit: 'visitors',
      detail: `${(visits.total_completed ?? 0).toLocaleString('en-US')} served, ${visits.unique_npcs_served ?? 0} unique. Peony and Blossom scale with total served, Green Thumb with unique.`,
      action: 'Keep serving garden visitors',
    }),
    source({
      id: 'garden-upgrade',
      name: 'Garden Farming Fortune upgrade',
      status: 'unknown',
      max: 40,
      detail: 'Account upgrade from Elizabeth. Hypixel does not expose it in the profile API, so check it in game.',
    }),
    source({
      id: 'pest-bestiary',
      name: 'Pest bestiary',
      status: 'unknown',
      max: 100,
      detail: `You have killed ${pestKills.toLocaleString('en-US')} pests. Bestiary tiers give up to +100; check your exact tier in the Garden bestiary.`,
    }),
    source({
      id: 'crop-analyzer',
      name: 'Crop Analyzer milestones',
      status: 'unknown',
      max: 30,
      detail: `${ctx.member.garden_player_data?.analyzed_greenhouse_crops?.length ?? 0} greenhouse crops analyzed. Milestones give +5 each, up to +30.`,
    }),
  ]);
}

// ---------------------------------------------------------------- armor

function setValue(set, owned) {
  let value = 0;
  set.pieces.forEach((v, i) => {
    if (owned[i]) value += v;
  });
  if (owned.every(Boolean)) value = set.total;
  return value;
}

function ownedSetPieces(items, set) {
  return ARMOR_SLOTS.map((slot) => {
    const id = `${set.prefix}_${slot}`;
    const candidates = items.filter((i) => i.id === id);
    candidates.sort((a, b) => rarityIdx(b) - rarityIdx(a));
    return candidates[0] ?? null;
  });
}

function armorGroup(ctx) {
  const { items, book } = ctx;
  const evaluated = ARMOR_SETS.map((set) => {
    const owned = ownedSetPieces(items, set);
    return { set, owned, value: setValue(set, owned) };
  });
  const best = evaluated.reduce((a, b) => (b.value > a.value ? b : a), { value: 0, set: null, owned: [] });
  const top = ARMOR_SETS[ARMOR_SETS.length - 1];
  const next = ARMOR_SETS.find((s) => s.total > best.value);

  const rows = [];
  const ownedCount = best.owned.filter(Boolean).length;
  const missingNext = next ? ownedSetPieces(items, next).map((p, i) => (p ? null : `${next.prefix}_${ARMOR_SLOTS[i]}`)).filter(Boolean) : [];
  rows.push(
    source({
      id: 'armor-set',
      name: best.set ? best.set.name : 'Farming armor',
      current: best.value,
      max: top.total,
      detail: best.set ? `${ownedCount}/4 pieces owned, worth +${best.value}` : 'No farming armor found anywhere on this profile',
      action: next ? `Next step: ${next.name} (+${next.total} as a full set)` : null,
      cost: next ? priceLines(book, missingNext.map((id) => ({ id, qty: 1 }))) : null,
      costGain: next ? next.total - best.value : 0,
      costNote: next && next.prefix !== 'MELON' && next.prefix !== 'CROPIE' ? 'Usually upgraded from the tier below, AH price shown' : null,
    }),
  );
  if (next && next !== top) {
    const missingTop = ownedSetPieces(items, top).map((p, i) => (p ? null : `${top.prefix}_${ARMOR_SLOTS[i]}`)).filter(Boolean);
    rows.push(
      source({
        id: 'armor-top',
        name: `${top.name} (best in slot)`,
        current: best.value,
        max: top.total,
        detail: `Full set gives +${top.total}`,
        action: 'Skip ahead to the strongest farming armor',
        cost: priceLines(book, missingTop.map((id) => ({ id, qty: 1 }))),
        counted: false,
        tags: ['alternative'],
      }),
    );
  }

  // Per-piece upgrades only make sense on the set you actually wear.
  const pieces = best.owned.filter(Boolean);
  if (pieces.length) rows.push(...pieceUpgrades(ctx, pieces, 'armor', 'mossy'));
  return group('armor', 'Armor', rows);
}

/** Reforge, Peridot gems and (for armor) Pesterminator across a set of pieces. */
function pieceUpgrades(ctx, pieces, kind, targetReforge) {
  const { book } = ctx;
  const target = REFORGES[targetReforge];
  const rows = [];

  // Reforge
  let reforgeNow = 0;
  let reforgeMax = 0;
  const needReforge = [];
  for (const piece of pieces) {
    const r = rarityIdx(piece);
    const best = target.values[r];
    const have = REFORGES[piece.reforge]?.values[r] ?? 0;
    reforgeMax += best;
    reforgeNow += Math.min(have, best);
    if (piece.reforge !== targetReforge) needReforge.push(piece);
  }
  rows.push(
    source({
      id: `${kind}-reforge`,
      name: `${target.name} reforge`,
      current: reforgeNow,
      max: reforgeMax,
      detail: needReforge.length
        ? `Not on: ${needReforge.map((p) => p.name).join(', ')}`
        : `On all ${pieces.length} pieces`,
      action: needReforge.length ? `Apply ${book.name(target.stone) ?? prettyId(target.stone)} at a reforge anvil` : null,
      cost: priceLines(book, [{ id: target.stone, qty: needReforge.length }]),
      costNote: 'Plus the anvil fee',
      tags: ['reforge'],
    }),
  );

  // Peridot gems
  let gemNow = 0;
  let gemMax = 0;
  let perfectNeeded = 0;
  const unlockLines = [];
  let slotsTotal = 0;
  let slotsPerfect = 0;
  for (const piece of pieces) {
    const r = rarityIdx(piece);
    const slots = (book.item(piece.id)?.gemstone_slots ?? []).filter((s) => s.slot_type === 'PERIDOT');
    slots.forEach((slot, i) => {
      const key = `PERIDOT_${i}`;
      slotsTotal++;
      gemMax += PERIDOT.PERFECT[r];
      const quality = piece.gems[key];
      if (quality) gemNow += PERIDOT[quality]?.[r] ?? 0;
      if (quality === 'PERFECT') {
        slotsPerfect++;
        return;
      }
      perfectNeeded++;
      const locked = slot.costs && Array.isArray(piece.unlockedGemSlots) && !piece.unlockedGemSlots.includes(key);
      const neverUnlocked = slot.costs && !piece.unlockedGemSlots && !quality;
      if (locked || neverUnlocked) {
        for (const c of slot.costs) if (c.type === 'ITEM') unlockLines.push({ id: c.item_id, qty: c.amount });
      }
    });
  }
  if (slotsTotal > 0) {
    rows.push(
      source({
        id: `${kind}-peridot`,
        name: 'Peridot gemstones',
        current: gemNow,
        max: gemMax,
        detail: `${slotsPerfect}/${slotsTotal} slots hold a Perfect Peridot`,
        action: perfectNeeded ? `Socket ${perfectNeeded} Perfect Peridot${perfectNeeded === 1 ? '' : 's'}` : null,
        cost: priceLines(book, mergeLines([{ id: 'PERFECT_PERIDOT_GEM', qty: perfectNeeded }, ...unlockLines])),
        costNote: unlockLines.length ? 'Includes gems to unlock empty slots, coin fees not included' : null,
        tags: ['gemstone'],
      }),
    );
  }

  if (kind === 'armor') {
    let now = 0;
    const missingV = [];
    const missingVI = [];
    for (const piece of pieces) {
      const lvl = piece.enchantments.pesterminator ?? 0;
      now += lvl * 2;
      if (lvl < 5) missingV.push(piece);
      if (lvl < 6) missingVI.push(piece);
    }
    rows.push(
      source({
        id: 'pesterminator',
        name: 'Pesterminator',
        current: now,
        max: pieces.length * 12,
        detail: pieces.map((p) => `${slotName(p)} ${toRoman(p.enchantments.pesterminator ?? 0)}`).join(', '),
        action: missingVI.length ? 'Apply Pesterminator V books, then a Beginner\'s Guide to Pesthunting for VI' : null,
        cost: priceLines(book, [
          { id: 'ENCHANTMENT_PESTERMINATOR_5', qty: missingV.length, label: 'Pesterminator V book' },
          { id: 'PESTHUNTING_GUIDE', qty: missingVI.length },
        ]),
        tags: ['enchant'],
      }),
    );
  }
  return rows;
}

function mergeLines(lines) {
  const map = new Map();
  for (const l of lines) {
    if (!l.qty) continue;
    map.set(l.id, { ...l, qty: (map.get(l.id)?.qty ?? 0) + l.qty });
  }
  return [...map.values()];
}

// 'FERMENTO_HELMET' -> 'Helmet', for compact per-piece summaries.
const slotName = (item) => prettyId(item.id.split('_').pop());

// ---------------------------------------------------------------- equipment

function equipmentGroup(ctx) {
  const { items, book } = ctx;
  const served = ctx.garden?.commission_data?.total_completed ?? 0;
  const unique = ctx.garden?.commission_data?.unique_npcs_served ?? 0;
  const scale = Math.min(1, served / EQUIPMENT_MAX_VISITORS);
  const pieceValue = (set) => set.min + (set.max - set.min) * scale;
  const top = EQUIPMENT_SETS[EQUIPMENT_SETS.length - 1];

  const slots = EQUIPMENT_SLOTS.map((slot) => {
    let best = null;
    for (const set of EQUIPMENT_SETS) {
      const item = items.find((i) => i.id === `${set.prefix}_${slot}`);
      if (item && (!best || pieceValue(set) > best.value)) best = { item, set, value: pieceValue(set) };
    }
    return { slot, best };
  });

  const current = slots.reduce((a, s) => a + (s.best?.value ?? 0), 0);
  const needBlossom = slots.filter((s) => s.best?.set !== top).map((s) => `${top.prefix}_${s.slot}`);
  const rows = [
    source({
      id: 'equipment-set',
      name: 'Peony / Blossom equipment',
      current,
      max: top.max * 4,
      detail: `${slots.filter((s) => s.best).map((s) => s.best.item.name).join(', ') || 'No farming equipment owned'}. Values assume ${served.toLocaleString('en-US')} visitors served.`,
      action: needBlossom.length ? `Get Blossom pieces for: ${needBlossom.map((id) => prettyId(id.split('_').pop())).join(', ')}` : null,
      cost: priceLines(book, needBlossom.map((id) => ({ id, qty: 1 }))),
      costNote: 'Peony upgrades into Blossom in game; AH price shown',
    }),
  ];

  const worn = slots.map((s) => s.best?.item).filter(Boolean);
  if (worn.length) {
    rows.push(...pieceUpgrades(ctx, worn, 'equipment', 'rooted'));
    let gtNow = 0;
    const needGt = [];
    for (const piece of worn) {
      const lvl = piece.enchantments.green_thumb ?? 0;
      gtNow += 0.05 * lvl * unique;
      if (lvl < 5) needGt.push(piece);
    }
    rows.push(
      source({
        id: 'green-thumb',
        name: 'Green Thumb',
        current: gtNow,
        max: worn.length * 0.05 * 5 * unique,
        detail: `Gives 0.05 per level per unique visitor (${unique} served). ${worn.map((p) => `${slotName(p)} ${toRoman(p.enchantments.green_thumb ?? 0)}`).join(', ')}`,
        action: needGt.length ? `Apply Green Thumb V to ${needGt.length} piece${needGt.length === 1 ? '' : 's'}` : null,
        cost: priceLines(book, [{ id: 'ENCHANTMENT_GREEN_THUMB_5', qty: needGt.length, label: 'Green Thumb V book' }]),
        tags: ['enchant'],
      }),
    );
  }

  const zorro = items.find((i) => i.id === 'ZORROS_CAPE');
  rows.push(
    source({
      id: 'zorro',
      name: "Zorro's Cape",
      status: zorro ? 'done' : 'missing',
      current: zorro ? 20 : 0,
      max: 20,
      condition: 'Jacob contests only (doubled to +20), takes the cloak slot',
      action: 'Swap it in for contests',
      cost: zorro ? null : priceLines(book, [{ id: 'ZORROS_CAPE', qty: 1 }]),
    }),
  );
  return group('equipment', 'Equipment', rows);
}

// ---------------------------------------------------------------- pets

function petValue(def, pet) {
  const base = def.values[pet.tier];
  if (!base || !pet.level) return 0;
  return (base * pet.level) / (pet.maxLevel || 100);
}

function petsGroup(ctx) {
  const { pets, book } = ctx;
  const rows = [];
  const always = FARMING_PETS.filter((d) => !d.condition);
  let best = null;
  for (const pet of pets) {
    const def = always.find((d) => d.type === pet.type);
    if (!def) continue;
    const value = petValue(def, pet);
    if (!best || value > best.value) best = { pet, def, value };
  }

  const top = PET_UPGRADES[PET_UPGRADES.length - 1];
  const nextUp = PET_UPGRADES.find((u) => u.value > (best?.value ?? 0) + 0.5);
  rows.push(
    source({
      id: 'farming-pet',
      name: best ? `${prettyId(best.pet.tier)} ${best.def.name}` : 'Farming pet',
      current: best?.value ?? 0,
      max: top.value,
      detail: best
        ? `Level ${best.pet.level}${best.pet.active ? ', currently active' : ''}${best.def.note ? `. ${best.def.note}.` : ''}`
        : 'No farming pet found',
      action: nextUp ? `Next step: ${prettyId(nextUp.tier)} ${prettyId(nextUp.type)} (+${nextUp.value} at max level)` : null,
      cost: nextUp ? priceLines(book, [{ id: `PET_${nextUp.type}_${nextUp.tier}`, qty: 1 }]) : null,
      costGain: nextUp ? nextUp.value - (best?.value ?? 0) : 0,
      costNote: nextUp?.type === 'ROSE_DRAGON' ? 'Price is for a lowest BIN listing; level 200 costs more' : null,
    }),
  );

  // Pet item on the best pet.
  if (best) {
    const level = gardenLevel(ctx.garden?.garden_experience ?? 0);
    // Relics scale base pet stats, not fortune from perks.
    const baseValue = best.def.baseStat != null ? (best.def.baseStat * best.value) / best.def.values[best.pet.tier] : best.value;
    const itemValue = (pi) =>
      pi.kind === 'garden' ? Math.min(pi.cap, pi.perGardenLevel * level) : pi.kind === 'flat' ? pi.value : baseValue * pi.value;
    const options = PET_ITEMS.map((pi) => ({ ...pi, gives: itemValue(pi) })).sort((a, b) => b.gives - a.gives);
    const held = options.find((o) => o.id === best.pet.heldItem);
    const ideal = options[0];
    // A held item we have no fortune value for may still be a deliberate choice.
    const unrated = best.pet.heldItem && !held;
    rows.push(
      source({
        id: 'pet-item',
        name: 'Pet item',
        status: unrated ? 'unknown' : undefined,
        current: held?.gives ?? 0,
        max: ideal.gives,
        detail: `${best.def.name} holds ${held ? held.name : best.pet.heldItem ? prettyId(best.pet.heldItem) : 'nothing'}${unrated ? ', which this tool has no fortune value for' : ''}. Best fortune option: ${ideal.name} (+${round(ideal.gives)}).`,
        action: held?.id === ideal.id ? null : `Give your ${best.def.name} a ${ideal.name}`,
        cost: held?.id === ideal.id ? null : priceLines(book, [{ id: ideal.id, qty: 1 }]),
      }),
    );
  }

  for (const def of FARMING_PETS.filter((d) => d.condition)) {
    const owned = pets.filter((p) => p.type === def.type).sort((a, b) => petValue(def, b) - petValue(def, a))[0];
    const maxTier = Object.keys(def.values).pop();
    rows.push(
      source({
        id: `pet-${def.type.toLowerCase()}`,
        name: `${def.name} pet`,
        current: owned ? petValue(def, owned) : 0,
        max: def.values[maxTier],
        unit: def.unit ?? 'fortune',
        condition: def.condition,
        detail: owned ? `Level ${owned.level} ${prettyId(owned.tier)}` : 'Not owned',
        action: owned ? 'Level it up' : `Buy a ${prettyId(maxTier)} ${def.name}`,
        cost: owned ? null : priceLines(book, [{ id: `PET_${def.type}_${maxTier}`, qty: 1 }]),
      }),
    );
  }
  return group('pets', 'Pets', rows);
}

// ---------------------------------------------------------------- accessories

function accessoryGroup(ctx) {
  const { items, book } = ctx;
  const active = items.filter((i) => i.location === 'Accessory bag' || i.location === 'Inventory');
  const rows = ACCESSORY_FAMILIES.map((fam) => {
    const owned = fam.tiers.filter((t) => active.some((i) => i.id === t.id)).pop();
    const top = fam.tiers[fam.tiers.length - 1];
    const elsewhere = !owned && fam.tiers.some((t) => items.some((i) => i.id === t.id));
    return source({
      id: `acc-${fam.id}`,
      name: fam.name,
      current: owned?.value ?? 0,
      max: top.value,
      unit: fam.unit ?? 'fortune',
      condition: fam.condition,
      detail: owned
        ? `You have ${book.name(owned.id) ?? prettyId(owned.id)}`
        : elsewhere
          ? 'You own one, but it is not in your accessory bag'
          : 'Not owned',
      action: owned?.id === top.id ? null : elsewhere ? 'Move it into your accessory bag' : `Get ${book.name(top.id) ?? prettyId(top.id)}`,
      cost: owned?.id === top.id || elsewhere ? null : priceLines(book, [{ id: top.id, qty: 1 }]),
      costNote: owned && owned.id !== top.id ? 'Upgradable in game; AH price of the top tier shown' : null,
    });
  });
  return group('accessories', 'Accessories', rows);
}

// ---------------------------------------------------------------- shards

function shardGroup(ctx) {
  return group(
    'shards',
    'Attribute shards',
    FARMING_SHARDS.map((def) => attributeSource(def, ctx)),
    'Syphon shards into an attribute from the Hunting Box. Each level costs more shards at higher rarities.',
  );
}

// ---------------------------------------------------------------- tools

function toolsGroup(ctx) {
  const { items, book } = ctx;
  const rows = [];
  for (const def of FARMING_TOOLS) {
    const owned = items.filter((i) => def.match.test(i.id));
    if (!owned.length) continue;
    owned.sort((a, b) => b.id.localeCompare(a.id) || rarityIdx(b) - rarityIdx(a));
    const tool = owned[0];
    const ench = tool.enchantments;
    const mainKey = ench.sunder ? 'sunder' : ench.harvesting ? 'harvesting' : def.main;
    const main = TOOL_ENCHANTS[mainKey];
    const turboLevel = ench[def.turbo] ?? 0;
    const cultivating = ench.cultivating ?? 0;
    const ffd = tool.farmingForDummies;
    const r = rarityIdx(tool);
    const gemSlots = (book.item(tool.id)?.gemstone_slots ?? []).filter((s) => s.slot_type === 'PERIDOT');
    const gemNow = gemSlots.reduce((a, _s, i) => a + (PERIDOT[tool.gems[`PERIDOT_${i}`]]?.[r] ?? 0), 0);
    const gemMissing = gemSlots.filter((_s, i) => tool.gems[`PERIDOT_${i}`] !== 'PERFECT').length;

    const current =
      (ench[mainKey] ?? 0) * main.perLevel + cultivating * 2 + turboLevel * 5 + ffd + gemNow;
    const max =
      main.maxLevel * main.perLevel + TOOL_ENCHANTS.cultivating.maxLevel * 2 + 25 + 5 + gemSlots.length * PERIDOT.PERFECT[r];

    const todo = [];
    const lines = [];
    if ((ench[mainKey] ?? 0) < main.maxLevel) {
      todo.push(`${main.name} VI`);
      lines.push({ id: main.book, qty: 1, label: `${main.name} VI book` });
    }
    if (!cultivating) {
      todo.push('Cultivating');
      lines.push({ id: 'ENCHANTMENT_CULTIVATING_1', qty: 1, label: 'Cultivating I book' });
    }
    if (turboLevel < 5) {
      todo.push('Turbo-Crop V');
      lines.push({ id: `ENCHANTMENT_${def.turbo.toUpperCase()}_5`, qty: 1, label: 'Turbo-Crop V book' });
    }
    if ((ench.dedication ?? 0) < 4) {
      todo.push('Dedication IV');
      lines.push({ id: 'ENCHANTMENT_DEDICATION_4', qty: 1, label: 'Dedication IV book' });
    }
    if (ffd < 5) {
      todo.push(`${5 - ffd}x Farming for Dummies`);
      lines.push({ id: 'FARMING_FOR_DUMMIES', qty: 5 - ffd });
    }
    if (gemMissing) {
      todo.push(`${gemMissing} Perfect Peridot`);
      lines.push({ id: 'PERFECT_PERIDOT_GEM', qty: gemMissing });
    }
    rows.push(
      source({
        id: `tool-${def.crop.toLowerCase().replace(/\s/g, '-')}`,
        name: tool.name,
        current,
        max,
        condition: `While farming ${def.crop.toLowerCase()}`,
        detail: `${main.name} ${toRoman(ench[mainKey] ?? 0)}, Cultivating ${toRoman(cultivating)}, Turbo ${toRoman(turboLevel)}, Dedication ${toRoman(ench.dedication ?? 0)}, ${ffd}/5 Farming for Dummies`,
        action:
          [
            todo.length ? `Add ${todo.join(', ')}` : null,
            cultivating && cultivating < 10 ? `Farm more to level Cultivating past ${toRoman(cultivating)}` : null,
          ]
            .filter(Boolean)
            .join('. ') || null,
        cost: lines.length ? priceLines(book, lines) : null,
        costNote: (ench.dedication ?? 0) < 4 ? 'Dedication scales with crop milestones, so it is not in the number' : null,
        tags: ['tool'],
      }),
    );
  }
  if (!rows.length) {
    rows.push(
      source({
        id: 'tool-none',
        name: 'Specialized farming tools',
        status: 'missing',
        max: 0,
        detail: 'No crop-specific tools found. Buy one at SkyMart in the Garden with copper.',
        costNote: 'Paid with copper',
      }),
    );
  }
  return group('tools', 'Tools', rows, 'Tool fortune only applies to the crop that tool farms, so it is not added to your total.');
}

// ---------------------------------------------------------------- chips

function chipsGroup(ctx) {
  const raw = ctx.member.player_data?.garden_chips ?? {};
  const levels = Object.fromEntries(Object.entries(raw).map(([k, v]) => [k.toLowerCase().replace(/[^a-z]/g, ''), v]));
  const rows = GARDEN_CHIPS.map((chip) => {
    const key = Object.keys(levels).find((k) => k.includes(chip.key));
    const level = key ? levels[key] : 0;
    return source({
      id: `chip-${chip.key}`,
      name: chip.name,
      current: level,
      max: CHIP_MAX_LEVEL,
      unit: 'levels',
      detail: `${chip.effect}. Level ${level}/${CHIP_MAX_LEVEL}.`,
      action: level < CHIP_MAX_LEVEL ? 'Feed more chips into it at the Garden' : null,
      cost: level < CHIP_MAX_LEVEL ? priceLines(ctx.book, [{ id: chip.id, qty: 1 }]) : null,
      costNote: 'Price of one chip',
    });
  });
  return group('chips', 'Garden chips', rows);
}

// ---------------------------------------------------------------- boosts

function boostsGroup(ctx) {
  const { member, book } = ctx;
  const now = Date.now();
  const buffs = member.player_data?.temp_stat_buffs ?? [];
  const cake = buffs.find((b) => b.key === 'cake_farming_fortune' && b.expire_at > now);
  const effects = member.player_data?.active_effects ?? [];
  const harbinger = effects.find((e) => /harvest_harbinger/i.test(e.effect ?? ''));
  const truffles = member.events?.easter?.refined_dark_cacao_truffles ?? 0;

  return group('boosts', 'Consumables and boosts', [
    source({
      id: 'rosewater',
      name: 'Filled Rosewater Flask',
      status: 'unknown',
      max: 5,
      detail: 'Each one eaten gives +1 permanently, up to 5. Hypixel does not report how many you have eaten.',
      cost: priceLines(book, [{ id: 'FILLED_ROSEWATER_FLASK', qty: 5 }]),
      costNote: 'Price for all 5',
    }),
    source({
      id: 'truffle',
      name: 'Refined Dark Cacao Truffle',
      current: truffles,
      max: 5,
      unit: 'crop fortune',
      condition: 'Cocoa beans only',
      detail: `${truffles}/5 eaten (+1 cocoa fortune each, permanent)`,
      action: truffles < 5 ? `Eat ${5 - truffles} more` : null,
      cost: priceLines(book, [{ id: 'REFINED_DARK_CACAO_TRUFFLE', qty: 5 - truffles }]),
    }),
    source({
      id: 'choc-cake',
      name: 'Chocolate Century Cake',
      status: cake ? 'done' : 'missing',
      current: cake ? 5 : 0,
      max: 5,
      condition: 'Lasts 48 hours',
      detail: cake ? 'Active right now' : 'Not active',
      action: 'Eat one before a farming session',
      cost: priceLines(book, [{ id: 'EPOCH_CAKE_BROWN', qty: 1 }]),
    }),
    source({
      id: 'harbinger',
      name: 'Harvest Harbinger Potion',
      status: harbinger ? 'done' : 'missing',
      current: harbinger ? 50 : 0,
      max: 50,
      condition: 'Lasts 25 minutes',
      detail: harbinger ? 'Active right now' : 'Not active',
      action: 'Brew one or buy it from other players',
    }),
    source({
      id: 'mason-jar',
      name: 'Celestial Mason Jar',
      status: 'tip',
      max: 15,
      condition: 'Lasts 36 hours',
      detail: 'Hypixel does not report whether it is active',
      cost: priceLines(book, [{ id: 'CELESTIAL_MASON_JAR', qty: 1 }]),
    }),
    source({
      id: 'pesthunter',
      name: 'Pesthunter Phillip bonus',
      status: 'tip',
      max: 200,
      condition: 'Lasts 30 minutes',
      detail: 'Hand pests to Phillip: +5 per pest, up to +200 at 40 pests',
      costNote: 'Free',
    }),
    source({
      id: 'carrolyn',
      name: 'Carrolyn exports',
      status: 'unknown',
      max: 12,
      unit: 'crop fortune',
      condition: 'Per crop, +12 each',
      detail: 'Give Carrolyn one of each export for +12 fortune on that crop. Not visible in the API.',
      cost: priceLines(book, [
        'EXPORTABLE_CARROTS', 'EXPIRED_PUMPKIN', 'SUPREME_CHOCOLATE_BAR', 'FINE_FLOUR',
        'HALF_EATEN_MUSHROOM', 'WARTY', 'PRICKLY_KISS', 'POTTED_CACTUS',
      ].map((id) => ({ id, qty: 1 }))),
      costNote: 'Price for all 8 exports',
    }),
  ]);
}

const capitalize = (s) => s.charAt(0).toUpperCase() + s.slice(1);

export function analyzeFarming(ctx) {
  const groups = [
    skillGroup(ctx),
    gardenGroup(ctx),
    armorGroup(ctx),
    equipmentGroup(ctx),
    petsGroup(ctx),
    accessoryGroup(ctx),
    shardGroup(ctx),
    toolsGroup(ctx),
    chipsGroup(ctx),
    boostsGroup(ctx),
  ];
  return { id: 'farming', title: 'Farming fortune', groups, totals: totals(groups) };
}
