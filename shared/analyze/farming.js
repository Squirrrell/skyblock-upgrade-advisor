import {
  ACCESSORY_FAMILIES,
  ARMOR_SETS,
  ARMOR_SLOTS,
  LOOSE_ARMOR,
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
  MAX_BUILD,
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

function farmingLevel(ctx) {
  const cap = 50 + (ctx.member.jacobs_contest?.perks?.farming_level_cap ?? 0);
  return skillLevel(ctx.member.player_data?.experience?.SKILL_FARMING ?? 0, cap).level;
}

const bestOwned = (items, id) => items.filter((i) => i.id === id).sort((a, b) => rarityIdx(b) - rarityIdx(a))[0] ?? null;

/**
 * The strongest armor a player can put together from what they own, mixing
 * sets freely: every slot takes a set piece, a loose piece (Rancher's Boots)
 * or nothing, and each set adds its tiered bonus for 2+ pieces worn.
 * Returns { value, slots: [{ id, piece, set, loose, value } | null] x4 }.
 */
export function bestArmorLoadout(items, level) {
  const options = ARMOR_SLOTS.map((slot, i) => {
    const list = [null];
    for (const set of ARMOR_SETS) {
      const piece = bestOwned(items, `${set.prefix}_${slot}`);
      if (piece) list.push({ id: piece.id, piece, set, value: set.pieces[i] });
    }
    for (const loose of LOOSE_ARMOR) {
      const piece = loose.slot === i && bestOwned(items, loose.id);
      if (piece) list.push({ id: piece.id, piece, loose, value: loose.perLevel * level });
    }
    return list;
  });

  const score = (slots) => {
    let value = 0;
    const perSet = new Map();
    for (const s of slots) {
      if (!s) continue;
      value += s.value;
      if (s.set) perSet.set(s.set, (perSet.get(s.set) ?? 0) + 1);
    }
    for (const [set, n] of perSet) value += set.bonus * Math.max(0, n - 1);
    return value;
  };

  // At most ~10 options per slot, so trying every combination is cheap.
  let best = { value: 0, slots: [null, null, null, null] };
  const walk = (i, picked) => {
    if (i === 4) {
      const value = score(picked);
      if (value > best.value) best = { value, slots: [...picked] };
      return;
    }
    for (const o of options[i]) {
      picked.push(o);
      walk(i + 1, picked);
      picked.pop();
    }
  };
  walk(0, []);
  return best;
}

/** Loadout name: the set name for a full set, else "Mixed farming armor". */
function loadoutName(loadout) {
  const sets = new Set(loadout.slots.map((s) => s?.set ?? s?.loose ?? null));
  const only = sets.size === 1 ? [...sets][0] : null;
  if (only?.prefix) return only.name;
  return loadout.slots.some(Boolean) ? 'Mixed farming armor' : 'Farming armor';
}

/** What buying `ids` (pieces you don't own) would add, and which of them the best loadout would wear. */
function armorWith(items, level, base, ids) {
  const extra = ids.filter((id) => !bestOwned(items, id)).map((id) => ({ id, rarity: 'COMMON', name: prettyId(id), hypothetical: true }));
  const loadout = bestArmorLoadout([...items, ...extra], level);
  const worn = loadout.slots.filter((s) => s?.piece.hypothetical).map((s) => s.id);
  return { gain: loadout.value - base.value, worn, loadout };
}

function armorGroup(ctx) {
  const { items, book } = ctx;
  const level = farmingLevel(ctx);
  const best = bestArmorLoadout(items, level);
  const top = ARMOR_SETS[ARMOR_SETS.length - 1];
  const worn = best.slots.filter(Boolean);
  const wornText = worn.map((s) => `${s.piece.name ?? prettyId(s.id)} +${s.value}`).join(', ');
  const looseWorn = worn.filter((s) => s.loose);

  // Next step: the first set tier that beats what you have, buying only the
  // pieces the best mix would actually wear (keep Rancher's Boots, say).
  let next = null;
  for (const set of ARMOR_SETS) {
    if (set.total <= best.value) continue;
    const step = armorWith(items, level, best, ARMOR_SLOTS.map((slot) => `${set.prefix}_${slot}`));
    if (step.gain > 0 && step.worn.length) {
      next = { set, ...step };
      break;
    }
  }
  const kept = next?.loadout.slots.filter((s) => s?.loose) ?? [];

  const rows = [];
  rows.push(
    source({
      id: 'armor-set',
      name: loadoutName(best),
      current: best.value,
      max: top.total,
      detail: worn.length
        ? `Best mix you own: ${wornText}${best.value > worn.reduce((n, s) => n + s.value, 0) ? `, plus the set bonus` : ''}. Worth +${best.value}.`
        : 'No farming armor found anywhere on this profile',
      action: next
        ? `Next step: ${next.worn.length === 4 ? `the full ${next.set.name}` : `${next.worn.length} ${next.set.name} piece${next.worn.length === 1 ? '' : 's'}`}` +
          (kept.length ? `, keeping your ${kept.map((s) => s.loose.name).join(' and ')}` : '') +
          ` (+${round(next.gain)})`
        : null,
      cost: next ? priceLines(book, next.worn.map((id) => ({ id, qty: 1 }))) : null,
      costGain: next ? next.gain : 0,
      costNote: next && next.set.prefix !== 'MELON' && next.set.prefix !== 'CROPIE' ? 'Usually upgraded from the tier below, AH price shown' : null,
    }),
  );

  // Rancher's or Farmer Boots: +1 per Farming level in the Garden, which can
  // beat the boots of a set even after losing a step of its set bonus.
  if (!looseWorn.length && !LOOSE_ARMOR.some((l) => bestOwned(items, l.id)) && level >= 18) {
    const boots = LOOSE_ARMOR.map((l) => ({ l, price: book.price(l.id)?.unit ?? Infinity }))
      .filter((b) => b.l.id !== 'RANCHERS_BOOTS' || level >= 21)
      .sort((a, b) => a.price - b.price)[0];
    const step = boots && armorWith(items, level, best, [boots.l.id]);
    if (step?.gain > 0) {
      rows.push(
        source({
          id: 'armor-loose-boots',
          name: boots.l.name,
          current: best.value,
          max: best.value + step.gain,
          detail: `+1 Farming Fortune per Farming level in the Garden (+${level} for you). Worn in place of your current boots, even without their set bonus step.`,
          action: `Wear ${boots.l.name} with the rest of your armor`,
          cost: priceLines(book, [{ id: boots.l.id, qty: 1 }]),
          costNote: boots.l.id === 'FARMER_BOOTS' ? "Rancher's Boots give the same fortune" : null,
          counted: false,
          tags: ['alternative', 'rank'],
        }),
      );
    }
  }

  if (next && next.set !== top) {
    const step = armorWith(items, level, best, ARMOR_SLOTS.map((slot) => `${top.prefix}_${slot}`));
    rows.push(
      source({
        id: 'armor-top',
        name: `${top.name} (best in slot)`,
        current: best.value,
        max: top.total,
        detail: `Full set gives +${top.total}`,
        action: 'Skip ahead to the strongest farming armor',
        cost: priceLines(book, step.worn.map((id) => ({ id, qty: 1 }))),
        counted: false,
        tags: ['alternative'],
      }),
    );
  }

  // Per-piece upgrades only make sense on the pieces you actually wear.
  rows.push(...pieceUpgrades(ctx, worn.map((s) => s.piece), 'armor', 'mossy', MAX_BUILD.armor));
  return group('armor', 'Armor', rows);
}

/**
 * Reforge, Peridot gems and (for armor) Pesterminator across a set of pieces.
 * `caps` are the fixed best-in-slot totals from the wiki max build, so the
 * maximum never depends on what the player happens to own. `costGain` is
 * what the listed purchase adds to the pieces they have now.
 */
function pieceUpgrades(ctx, pieces, kind, targetReforge, caps) {
  const { book } = ctx;
  const target = REFORGES[targetReforge];
  const rows = [];
  const none = pieces.length === 0;
  const noneNote = kind === 'armor' ? 'Get farming armor first' : 'Get farming equipment first';

  // Reforge
  let reforgeNow = 0;
  let reforgeReach = 0;
  const needReforge = [];
  for (const piece of pieces) {
    const r = rarityIdx(piece);
    const best = target.values[r];
    const have = Math.min(REFORGES[piece.reforge]?.values[r] ?? 0, best);
    reforgeNow += have;
    reforgeReach += best;
    if (piece.reforge !== targetReforge) needReforge.push(piece);
  }
  rows.push(
    source({
      id: `${kind}-reforge`,
      name: `${target.name} reforge`,
      current: reforgeNow,
      max: caps.reforge,
      detail: none
        ? `Worth up to +${caps.reforge} on a full recombobulated set`
        : needReforge.length
          ? `Not on: ${needReforge.map((p) => p.name).join(', ')}`
          : `On all ${pieces.length} pieces. The rest of the max comes from higher rarity (recombobulate or upgrade).`,
      action: none ? noneNote : needReforge.length ? `Apply ${book.name(target.stone) ?? prettyId(target.stone)} at a reforge anvil` : null,
      cost: needReforge.length ? priceLines(book, [{ id: target.stone, qty: needReforge.length }]) : null,
      costGain: reforgeReach - reforgeNow,
      costNote: needReforge.length ? 'Plus the anvil fee' : null,
      tags: ['reforge'],
    }),
  );

  // Peridot gems
  if (caps.gems) {
    let gemNow = 0;
    let gemReach = 0;
    let perfectNeeded = 0;
    const unlockLines = [];
    let slotsTotal = 0;
    let slotsPerfect = 0;
    for (const piece of pieces) {
      const r = rarityIdx(piece);
      const slots = (book.item(piece.id)?.gemstone_slots ?? []).filter((sl) => sl.slot_type === 'PERIDOT');
      slots.forEach((slot, i) => {
        const key = `PERIDOT_${i}`;
        slotsTotal++;
        gemReach += PERIDOT.PERFECT[r];
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
    rows.push(
      source({
        id: `${kind}-peridot`,
        name: 'Peridot gemstones',
        current: gemNow,
        max: caps.gems,
        detail: none
          ? `Worth up to +${caps.gems} with 8 Perfect Peridots in recombobulated Helianthus`
          : `${slotsPerfect}/${slotsTotal} slots hold a Perfect Peridot`,
        action: none ? noneNote : perfectNeeded ? `Socket ${perfectNeeded} Perfect Peridot${perfectNeeded === 1 ? '' : 's'}` : null,
        cost: perfectNeeded ? priceLines(book, mergeLines([{ id: 'PERFECT_PERIDOT_GEM', qty: perfectNeeded }, ...unlockLines])) : null,
        costGain: gemReach - gemNow,
        costNote: unlockLines.length ? 'Includes gems to unlock empty slots, coin fees not included' : null,
        tags: ['gemstone'],
      }),
    );
  }

  if (caps.pesterminator) {
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
        max: caps.pesterminator,
        detail: none ? '+2 per level on each armor piece, up to VI' : pieces.map((p) => `${slotName(p)} ${toRoman(p.enchantments.pesterminator ?? 0)}`).join(', '),
        action: none ? noneNote : missingVI.length ? "Apply Pesterminator V books, then a Beginner's Guide to Pesthunting for VI" : null,
        cost: missingVI.length
          ? priceLines(book, [
              { id: 'ENCHANTMENT_PESTERMINATOR_5', qty: missingV.length, label: 'Pesterminator V book' },
              { id: 'PESTHUNTING_GUIDE', qty: missingVI.length },
            ])
          : null,
        costGain: pieces.length * 12 - now,
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
      cost: needBlossom.length ? priceLines(book, needBlossom.map((id) => ({ id, qty: 1 }))) : null,
      // Blossom pieces bought today are worth what your visitor count allows.
      costGain: pieceValue(top) * 4 - current,
      costNote: 'Peony upgrades into Blossom in game; AH price shown',
    }),
  ];

  const worn = slots.map((s) => s.best?.item).filter(Boolean);
  rows.push(...pieceUpgrades(ctx, worn, 'equipment', 'rooted', MAX_BUILD.equipment));
  {
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
        max: MAX_BUILD.greenThumb,
        detail: `Gives 0.05 per level per unique visitor on each piece (${unique} served so far). ${worn.map((p) => `${slotName(p)} ${toRoman(p.enchantments.green_thumb ?? 0)}`).join(', ')}`,
        action: worn.length
          ? [needGt.length ? `Apply Green Thumb V to ${needGt.length} piece${needGt.length === 1 ? '' : 's'}` : null, 'Serve more unique visitors'].filter(Boolean).join('. ')
          : 'Get farming equipment first',
        cost: needGt.length ? priceLines(book, [{ id: 'ENCHANTMENT_GREEN_THUMB_5', qty: needGt.length, label: 'Green Thumb V book' }]) : null,
        costGain: worn.length * 0.05 * 5 * unique - gtNow,
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
        max: MAX_BUILD.petItem,
        costGain: ideal.gives - (held?.gives ?? 0),
        detail: `${best.def.name} holds ${held ? held.name : best.pet.heldItem ? prettyId(best.pet.heldItem) : 'nothing'}${unrated ? ', which this tool has no fortune value for' : ''}. Best fortune option: ${ideal.name} (+${round(ideal.gives)}).`,
        action: held?.id === ideal.id ? null : `Give your ${best.def.name} a ${ideal.name}`,
        cost: held?.id === ideal.id ? null : priceLines(book, [{ id: ideal.id, qty: 1 }]),
      }),
    );
  } else {
    rows.push(
      source({
        id: 'pet-item',
        name: 'Pet item',
        max: MAX_BUILD.petItem,
        detail: 'A Green Bandana gives +4 per garden level, up to +60',
        action: 'Get a farming pet first',
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
  return {
    id: 'farming',
    title: 'Farming fortune',
    groups,
    totals: { ...totals(groups), note: 'Out of the most general fortune you can have. Tool, crop-only, contest and short-term bonuses come on top.' },
  };
}
