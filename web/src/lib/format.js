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
