// Foraging on Galatea: the stats the profile stores (Heart of the Forest
// perks, whispers, tree gifts, Hina's tasks, Starlyn contests, honey hives)
// and the Foraging Fortune and Sweep the player's gear gives, read from the
// items' own lore ("Foraging Fortune: +88 (+6) (+20)"; the first number is the
// item's total).
import { prettyId } from '../analyze/helpers.js';
import { isSoulbound, itemValue } from './networth.js';

const strip = (s) => String(s).replace(/§./g, '');

/** The total of a stat line in an item's lore ("Sweep: +22 (+2)" -> 22), or 0. */
export function loreStat(lore, label) {
  const re = new RegExp(`^${label}: \\+([\\d,.]+)`);
  for (const line of lore ?? []) {
    const m = re.exec(strip(line).trim());
    if (m) return Number(m[1].replace(/,/g, ''));
  }
  return 0;
}

/** The item type from the lore's last line ("§6§lLEGENDARY AXE" -> "AXE"). */
function itemType(lore) {
  for (let i = (lore?.length ?? 0) - 1; i >= 0; i--) {
    const line = strip(lore[i]).trim();
    if (line) return line.replace(/^.*?(COMMON|UNCOMMON|RARE|EPIC|LEGENDARY|MYTHIC|DIVINE|SPECIAL|VERY SPECIAL)\s*/, '').replace(/\s*[a-z]$/, '');
  }
  return '';
}

/** One piece of gear, with what its card shows (value, when it was obtained, soulbound). */
const piece = (item, book) => ({
  id: item.id,
  name: item.name,
  rawName: item.rawName,
  rarity: item.rarity,
  reforge: item.reforge ?? null,
  location: item.location,
  lore: item.lore,
  obtained: item.obtained ?? null,
  soulbound: isSoulbound(item),
  value: book ? itemValue(item, book) : null,
  type: itemType(item.lore),
  fortune: loreStat(item.lore, 'Foraging Fortune'),
  sweep: loreStat(item.lore, 'Sweep'),
});

const ARMOR = ['HELMET', 'CHESTPLATE', 'LEGGINGS', 'BOOTS'];
// Gloves and bracelets share one equipment slot.
const EQUIPMENT = [['NECKLACE'], ['CLOAK'], ['BELT'], ['GLOVES', 'BRACELET']];
const WORN = new Set(['Armor', 'Equipment']);

/**
 * The best foraging gear the player has for each slot, wherever it is: worn,
 * in the wardrobe, a loadout, the ender chest or a backpack. Someone farming
 * right now still has their foraging set stored, and the held item isn't in
 * the API, so the axe is the best one anywhere too. Best means most Fortune
 * plus Sweep; on a tie the piece being worn wins.
 */
export function foragingGear(items, book) {
  const seen = new Set();
  const pieces = [];
  for (const item of items) {
    // Loadouts repeat what is worn; count each item once.
    if (item.uuid) {
      if (seen.has(item.uuid)) continue;
      seen.add(item.uuid);
    }
    const p = piece(item, book);
    if (p.fortune > 0 || p.sweep > 0) pieces.push(p);
  }
  const best = (types) =>
    pieces
      .filter((p) => types.includes(p.type))
      .sort((a, b) => b.fortune + b.sweep - (a.fortune + a.sweep) || WORN.has(b.location) - WORN.has(a.location))[0] ?? null;
  const axes = pieces.filter((p) => /\bAXE\b/.test(p.type)).sort((a, b) => b.fortune + b.sweep - (a.fortune + a.sweep));
  return {
    armor: ARMOR.map((t) => best([t])).filter(Boolean),
    equipment: EQUIPMENT.map((types) => best(types)).filter(Boolean),
    accessories: pieces.filter((p) => p.location === 'Accessory bag'),
    axe: axes[0] ?? null,
    otherAxes: axes.slice(1, 4),
  };
}

/**
 * Whispers per kind: the total earned and what the perks cost. The API keeps
 * a spend figure for each perk preset ("1" to "5"), all drawing on the same
 * total, so the largest one is what the perks take.
 */
function whispers(core) {
  const out = {};
  for (const [kind, data] of Object.entries(core?.whispers ?? {})) {
    const spent = Math.max(0, ...Object.entries(data ?? {}).filter(([k]) => k !== 'total').map(([, v]) => v?.spent ?? 0));
    out[kind] = { total: data?.total ?? 0, spent };
  }
  return out;
}

// "CATCH_HIDEONLEAF_5" -> 5, "COLLECT_50_BERRIES" -> 50: the target when the task names it.
const taskTarget = (id) => Number(/_(\d+)(?:_|$)/.exec(id)?.[1]) || null;

export function foragingStats(member, items, { hotfLevel, countNodes, book }) {
  const tree = member.skill_tree ?? {};
  const f = member.foraging ?? {};
  const core = member.foraging_core ?? {};
  const giftCounts = Object.entries(f.tree_gifts ?? {}).filter(([, v]) => typeof v === 'number');
  const hina = f.hina?.tasks ?? {};
  const done = new Set(hina.completed_tasks ?? []);
  const now = Date.now();
  return {
    hotf: hotfLevel(tree.experience?.foraging ?? 0),
    tokensSpent: Object.entries(tree.tokens_spent ?? {})
      .filter(([k]) => k.startsWith('forest'))
      .reduce((n, [, v]) => n + v, 0),
    nodes: countNodes(tree.nodes?.foraging),
    // Perk levels by id ("foraging_fortune": 14); a perk switched off has toggle_<id> false.
    perks: Object.fromEntries(Object.entries(tree.nodes?.foraging ?? {}).filter(([k, v]) => !k.startsWith('toggle_') && typeof v === 'number')),
    disabled: Object.entries(tree.nodes?.foraging ?? {})
      .filter(([k, v]) => k.startsWith('toggle_') && v === false)
      .map(([k]) => k.slice(7)),
    ability: tree.selected_ability?.foraging ?? null,
    whispers: whispers(core),
    gifts: giftCounts.map(([id, count]) => ({ id, name: prettyId(id), count, milestone: f.tree_gifts?.milestone_tier_claimed?.[id] ?? 0 })),
    daily: {
      effect: core.current_daily_effect ? prettyId(core.current_daily_effect) : null,
      gifts: core.daily_gifts ?? 0,
      treesCut: core.daily_trees_cut ?? 0,
    },
    hinaTier: hina.tier_claimed ?? 0,
    hina: {
      completed: done.size,
      tasks: Object.entries(hina.task_progress ?? {})
        .filter(([id]) => !done.has(id))
        .map(([id, progress]) => ({ id, name: prettyId(id), progress, target: taskTarget(id) })),
    },
    fishFamily: f.fish_family?.length ?? 0,
    fish: (f.fish_family ?? []).map((id) => prettyId(id.replace(/_THE_FISH$/, ''))),
    starlynBests: Object.entries(f.starlyn?.personal_bests ?? {}).map(([id, v]) => ({ id, name: prettyId(id.replace(/_LOG$/, '')), value: v })),
    hives: Object.entries(f.honey?.refill_times ?? {})
      .map(([id, at]) => ({ id: Number(id.replace(/\D/g, '')) || id, readyAt: at, ready: at <= now }))
      .sort((a, b) => a.readyAt - b.readyAt),
    gear: foragingGear(items, book),
  };
}
