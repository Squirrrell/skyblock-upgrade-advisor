// A pet's in-game lore at its own level, the way the pets menu shows it. The
// NEU data repository has each pet's lore as a template ("§7Crit Damage:
// §9+{CRIT_DAMAGE}%", "{0}% less damage") and constants/petnums.json the
// values at level 1 and 100; the numbers in between scale linearly with level
// (or over the levels a pet's stats_levelling_curve names, like 101-200 for
// the Golden Dragon). Hypixel's API has no lore for pets.
import { itemInfo } from './icons.js';
import { loadNeuItem } from './neu.js';

const NUMS_URL = 'https://raw.githubusercontent.com/NotEnoughUpdates/NotEnoughUpdates-REPO/master/constants/petnums.json';
const RARITIES = ['COMMON', 'UNCOMMON', 'RARE', 'EPIC', 'LEGENDARY', 'MYTHIC'];
// Rarity colour codes, for the held item's name.
const CODE = { COMMON: 'f', UNCOMMON: 'a', RARE: '9', EPIC: '5', LEGENDARY: '6', MYTHIC: 'd', DIVINE: 'b', SPECIAL: 'c' };

let nums = null;
const loadNums = () =>
  (nums ??= fetch(NUMS_URL)
    .then((r) => (r.ok ? r.json() : null))
    .catch(() => null));

const clamp = (x) => Math.max(0, Math.min(1, x));

/** { other: [n...], stat: { KEY: n } } at `level`. */
function numbersAt(entry, level) {
  const lo = entry['1'];
  const hi = entry['100'] ?? lo;
  if (!lo) return null;
  const curve = String(entry.stats_levelling_curve ?? '').split(':').map(Number);
  const frac = curve.length >= 2 && curve.every(Number.isFinite) ? clamp((level - curve[0]) / (curve[1] - curve[0])) : clamp((level - 1) / 99);
  const mix = (a, b) => a + ((b ?? a) - a) * frac;
  return {
    other: (lo.otherNums ?? []).map((a, i) => mix(a, hi.otherNums?.[i])),
    stat: Object.fromEntries(Object.entries(lo.statNums ?? {}).map(([k, a]) => [k, mix(a, hi.statNums?.[k])])),
  };
}

const fmt = (n) => Number(n.toFixed(n >= 100 ? 0 : 1)).toLocaleString('en-US');

/**
 * The lore lines (with § codes) for a pet: { type, tier, level, heldItem,
 * skin, xpCurrent, xpForNext, exp, candyUsed }. Resolves to null when the
 * repository has no such pet.
 */
export async function petLore(pet) {
  const idx = RARITIES.indexOf(pet.tier);
  if (idx < 0) return null;
  const [item, all] = await Promise.all([loadNeuItem(`${pet.type};${idx}`), loadNums()]);
  if (!Array.isArray(item?.lore)) return null;
  const level = pet.level ?? 1;
  const n = all?.[pet.type]?.[pet.tier] ? numbersAt(all[pet.type][pet.tier], level) : null;
  const filled = item.lore
    .map((l) =>
      String(l)
        .replace(/\{LVL\}/g, String(level))
        .replace(/\{(\d+)\}/g, (m, i) => (n?.other[i] != null ? fmt(n.other[i]) : m))
        .replace(/\{([A-Z_]+)\}/g, (m, k) => (n?.stat[k] != null ? fmt(n.stat[k]) : m)),
    )
    // The repository's item is the pet as an item; the menu has no "add to your pets" line.
    .filter((l) => !/Right-click to add this pet/i.test(l));

  // Laid out like SkyCrypt's pet card: the pet, its rarity, then what it
  // holds (and what that does), its skin, and its progress.
  const body = filled.slice(0, -1);
  // Drop the blank line the removed "add" line leaves before the rarity.
  while (body.length && !plain(body[body.length - 1])) body.pop();
  const out = [...body, '', filled[filled.length - 1]];

  if (pet.heldItem) {
    // Pet items are often missing from Hypixel's item list; the repository has their name and effect.
    const neu = await loadNeuItem(pet.heldItem);
    const held = itemInfo(pet.heldItem);
    const name = held.name ? `§${CODE[held.tier] ?? 'f'}${held.name}` : neu?.displayname ?? `§f${pet.heldItem}`;
    out.push('', `§6Held Item: ${name}`, ...petItemEffect(neu?.lore));
  }
  if (pet.skin) out.push('', `§7Skin: §f${itemInfo(`PET_SKIN_${pet.skin}`).name ?? pet.skin}`);
  if (pet.candyUsed) out.push(`§7Pet Candy Used: §a${pet.candyUsed}§7/10`);

  out.push('');
  if (pet.xpForNext) {
    const pct = clamp(pet.xpCurrent / pet.xpForNext);
    out.push(`§7Progress to Level ${level + 1}: §e${(pct * 100).toFixed(1)}%`);
    out.push(`${bar(pct)} §e${short(pet.xpCurrent)} §6/ §e${short(pet.xpForNext)}`);
  } else if (pet.level != null) {
    out.push('§bMAX LEVEL');
  }
  if (pet.exp) {
    const max = pet.xpMax ? ` §6/ §e${short(pet.xpMax)} §6(${Math.min(100, (pet.exp / pet.xpMax) * 100).toFixed(2)}%)` : '';
    out.push(`§7Total XP: §e${short(pet.exp)}${max}`);
  }
  return out;
}

const plain = (l) => String(l).replace(/§./g, '').trim();

/** 15380000 -> "15.38M", 636420 -> "636.42K" */
function short(n) {
  if (n >= 1e9) return `${Number((n / 1e9).toFixed(2))}B`;
  if (n >= 1e6) return `${Number((n / 1e6).toFixed(2))}M`;
  if (n >= 1e3) return `${Number((n / 1e3).toFixed(2))}K`;
  return String(Math.round(n));
}

/** A text progress bar: green for done, white for the rest. */
function bar(pct, width = 20) {
  const done = Math.round(pct * width);
  return `§2${'━'.repeat(done)}§f${'━'.repeat(width - done)}`;
}

/**
 * What a pet item does, from its lore: the paragraphs left after dropping
 * "Consumed on use", the general "Pet Items can boost pets..." text, the
 * "Right-click on your summoned pet" hint and the rarity line.
 */
function petItemEffect(lore) {
  if (!Array.isArray(lore)) return [];
  const paragraphs = [[]];
  for (const l of lore) {
    if (plain(l)) paragraphs[paragraphs.length - 1].push(l);
    else if (paragraphs[paragraphs.length - 1].length) paragraphs.push([]);
  }
  const skip = /Consumed on use|Pet Items can boost|must be visible|Right-click on your|PET ITEM$/i;
  return paragraphs.filter((p) => p.length && !p.some((l) => skip.test(plain(l)))).flat();
}
