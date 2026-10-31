// The Heart of the Forest perk tree from the NEU data repository
// (constants/hotflayout.json): each perk's grid position, max level, whisper
// type and lore, with stat formulas written as small Lisp expressions,
// "(* level 3)". This evaluates just the forms that file uses.

const URL_HOTF = 'https://raw.githubusercontent.com/NotEnoughUpdates/NotEnoughUpdates-REPO/master/constants/hotflayout.json';

let layout = null;
/** Resolves to { perks: { id: perk } } or null. */
export const loadHotf = () =>
  (layout ??= fetch(URL_HOTF)
    .then((r) => (r.ok ? r.json() : null))
    .then((j) => j?.hotf ?? null)
    .catch(() => null));

/** "(* level 3)" -> nested arrays of tokens. */
function parse(src) {
  const tokens = String(src).match(/\(|\)|[^\s()]+/g) ?? [];
  let i = 0;
  const read = () => {
    const t = tokens[i++];
    if (t === '(') {
      const list = [];
      while (tokens[i] !== ')' && i < tokens.length) list.push(read());
      i++;
      return list;
    }
    return t;
  };
  return tokens.length ? read() : null;
}

const FNS = {
  '+': (...a) => a.reduce((x, y) => x + y, 0),
  '-': (a, ...b) => (b.length ? b.reduce((x, y) => x - y, a) : -a),
  '*': (...a) => a.reduce((x, y) => x * y, 1),
  '/': (a, b) => a / b,
  pow: Math.pow,
  round: Math.round,
  floor: Math.floor,
  ceil: Math.ceil,
  min: Math.min,
  max: Math.max,
  id: (x) => x,
  lt: (a, b) => a < b,
  gt: (a, b) => a > b,
  '=': (a, b) => a === b,
  'round-decimals': (n, p) => Math.round(n * 10 ** p) / 10 ** p,
  'list.new': (...a) => a,
  'list.at': (l, i) => l?.[i],
};

function evaluate(node, env) {
  if (Array.isArray(node)) {
    const [head, ...args] = node;
    if (head === 'if') return evaluate(args[0], env) ? evaluate(args[1], env) : evaluate(args[2], env);
    const fn = FNS[head];
    if (!fn) return undefined;
    return fn(...args.map((a) => evaluate(a, env)));
  }
  if (node == null) return undefined;
  if (/^-?\d+(\.\d+)?$/.test(node)) return Number(node);
  if (node.startsWith(':')) return node.slice(1);
  if (node in env) return env[node];
  return node; // bare names like FOREST_WHISPERS
}

/** A perk's formula field at `level`, or undefined if it can't be read. */
export function perkValue(perk, field, level) {
  const src = perk?.[field];
  if (src == null || src === '') return undefined;
  try {
    return evaluate(parse(src), { level, level0: level, maxLevel: perk.maxLevel });
  } catch {
    return undefined;
  }
}

const fmt = (v) => (typeof v === 'number' ? Number(v.toFixed(2)).toLocaleString('en-US') : String(v));

/** The perk's lore lines at `level` with its {stat...} placeholders filled in. */
export function perkLore(perk, level) {
  const lines = [];
  for (const entry of perk.lore ?? []) {
    if (typeof entry === 'string') lines.push(entry);
    else if (entry?.text && (!entry.onlyIf || perkValue({ x: entry.onlyIf, maxLevel: perk.maxLevel }, 'x', level))) lines.push(entry.text);
  }
  // {stat}, {statFortune}...; {stats} is a typo for {stat} in the repository.
  return lines.map((l) =>
    l.replace(/\{(stats?|stat[A-Z]\w*)\}/g, (m, key) => {
      const v = perkValue(perk, key === 'stats' ? 'stat' : key, level);
      return v === undefined ? m : fmt(v);
    }),
  );
}

/** Which whispers a perk's levels cost, as a display name. */
export function perkCurrency(perk, level) {
  const v = /^\(/.test(perk.powder ?? '') ? perkValue(perk, 'powder', level) : perk.powder;
  return v === 'DESERT_WHISPERS' ? 'Desert Whispers' : v === 'FOREST_WHISPERS' ? 'Forest Whispers' : null;
}
