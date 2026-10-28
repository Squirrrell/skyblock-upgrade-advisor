/** 1234567 -> "1.23M" */
export function coins(n) {
  if (n == null) return '-';
  const abs = Math.abs(n);
  if (abs >= 1e9) return `${trim(n / 1e9)}B`;
  if (abs >= 1e6) return `${trim(n / 1e6)}M`;
  if (abs >= 1e3) return `${trim(n / 1e3)}k`;
  return Math.round(n).toLocaleString('en-US');
}

function trim(v) {
  const digits = Math.abs(v) >= 100 ? 0 : Math.abs(v) >= 10 ? 1 : 2;
  return Number(v.toFixed(digits)).toString();
}

export function num(n, digits = 1) {
  if (n == null) return '-';
  return Number(n.toFixed(digits)).toLocaleString('en-US');
}

export function ago(ts) {
  if (!ts) return 'never';
  const s = Math.max(0, Math.round((Date.now() - ts) / 1000));
  if (s < 60) return `${s}s ago`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min ago`;
  return `${Math.round(m / 60)} h ago`;
}

/** 104584 ms -> "1:44" */
export function duration(ms) {
  if (ms == null) return '-';
  const total = Math.round(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = String(total % 60).padStart(2, '0');
  return h ? `${h}:${String(m).padStart(2, '0')}:${s}` : `${m}:${s}`;
}

export function date(ts) {
  if (!ts) return '-';
  return new Date(ts).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

/** Whole numbers with separators: 1234567 -> "1,234,567" */
export const int = (n) => (n == null ? '-' : Math.round(n).toLocaleString('en-US'));

/** Time until a future timestamp: "2 h 5 min", "14 min", "now". */
export function until(ts, now = Date.now()) {
  const s = Math.round((ts - now) / 1000);
  if (s <= 0) return 'now';
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (d) return `${d} d ${h} h`;
  if (h) return `${h} h ${m} min`;
  if (m) return `${m} min`;
  return `${s}s`;
}

/**
 * Tooltip lines for an item's value and what it is made of (itemValueParts in
 * shared/stats/networth.js): the item itself, then each upgrade on it.
 */
export function valueLines(x, max = 8) {
  if (!x?.value) return [];
  const lines = [{ text: `Value: ${coins(x.value)}`, color: 'var(--code-gold)' }];
  const parts = x.parts ?? [];
  if (!parts.length) return lines;
  const grey = (text) => ({ text, color: 'var(--code-grey)' });
  lines.push(grey(`  Item: ${coins(x.base ?? 0)}`));
  for (const p of parts.slice(0, max)) lines.push(grey(`  + ${p.label}: ${coins(p.value)}`));
  const rest = parts.slice(max);
  if (rest.length) lines.push(grey(`  + ${rest.length} more: ${coins(rest.reduce((n, p) => n + p.value, 0))}`));
  return lines;
}
