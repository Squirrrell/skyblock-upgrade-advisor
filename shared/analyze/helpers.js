// Shared building blocks for the analyzers.

export const RARITY_INDEX = { COMMON: 0, UNCOMMON: 1, RARE: 2, EPIC: 3, LEGENDARY: 4, MYTHIC: 5, DIVINE: 6 };

export const round = (n, digits = 1) => {
  const f = 10 ** digits;
  return Math.round((n + Number.EPSILON) * f) / f;
};

/**
 * Price a shopping list. `lines` is [{ id, qty, label? }]. Unpriced lines are
 * kept so the UI can say "plus 3 items with no live price".
 */
export function priceLines(book, lines) {
  let total = 0;
  let missing = 0;
  const out = lines
    .filter((line) => line && line.qty > 0)
    .map((line) => {
      const p = book.price(line.id);
      const name = line.label ?? book.name(line.id) ?? prettyId(line.id);
      if (!p) {
        missing++;
        return { id: line.id, name, qty: line.qty, unit: null, total: null, source: null };
      }
      const lineTotal = p.unit * line.qty;
      total += lineTotal;
      return { id: line.id, name, qty: line.qty, unit: p.unit, total: lineTotal, source: p.source, note: p.note };
    });
  return { total: Math.round(total), lines: out, unpriced: missing };
}

export function prettyId(id = '') {
  return String(id)
    .toLowerCase()
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * One row in the report. `current`/`max` are fortune points, `cost` is a
 * priced shopping list or null when it cannot be bought (skill XP, copper...).
 */
export function source(fields) {
  const current = round(fields.current ?? 0);
  const max = round(fields.max ?? 0);
  let status = fields.status;
  if (!status) {
    if (max <= 0) status = 'info';
    else if (current >= max) status = 'done';
    else if (current > 0) status = 'partial';
    else status = 'missing';
  }
  const gain = Math.max(0, round(max - current));
  return {
    id: fields.id,
    name: fields.name,
    status,
    current,
    max,
    gain,
    // Fortune the listed cost actually buys, when that is only the next step
    // toward `max` (e.g. the next armor tier, not the best one).
    costGain: fields.costGain != null ? Math.max(0, round(fields.costGain)) : gain,
    unit: fields.unit ?? 'fortune',
    detail: fields.detail ?? null,
    action: status === 'done' ? null : fields.action ?? null,
    condition: fields.condition ?? null,
    cost: status === 'done' ? null : fields.cost ?? null,
    costNote: status === 'done' ? null : fields.costNote ?? null,
    counted: fields.counted ?? !fields.condition,
    tags: fields.tags ?? [],
    // Item to show as the row's icon, when the cost lines don't name one.
    icon: fields.icon ?? null,
  };
}

export function group(id, title, items, blurb = null) {
  return { id, title, blurb, items: items.filter(Boolean) };
}

/** Totals over sources that are always active (no condition). */
export function totals(groups) {
  let current = 0;
  let max = 0;
  let unreadable = 0;
  for (const g of groups) {
    for (const s of g.items) {
      if (!s.counted || s.unit !== 'fortune' || s.status === 'tip') continue;
      // Rows we cannot read still count toward the max, just not the current value.
      max += s.max;
      if (s.status === 'unknown') {
        unreadable += s.max;
        continue;
      }
      current += s.current;
    }
  }
  return { current: round(current), max: round(max), unreadable: round(unreadable) };
}

/** Best item (by `score`) among the player's items whose id is in `ids`. */
export function bestOwned(items, ids, score = () => 0) {
  let best = null;
  for (const item of items) {
    if (!ids.includes(item.id)) continue;
    const s = score(item);
    if (!best || s > best.score) best = { item, score: s };
  }
  return best;
}

export function effectiveRarity(item, fallback = 'COMMON') {
  return item?.rarity && RARITY_INDEX[item.rarity] !== undefined ? item.rarity : fallback;
}

export const formatList = (parts) => parts.filter(Boolean).join(', ');
