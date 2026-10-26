// Small building blocks shared by the profile tabs and tool pages.
import { int, num } from './lib/format.js';

export function Panel({ title, subtitle, actions, children, className = '', pad = true }) {
  return (
    <section className={`rounded-xl border border-line bg-surface shadow-panel ${className}`}>
      {(title || actions) && (
        <header className="flex flex-wrap items-start justify-between gap-3 border-b border-line px-5 py-4 sm:px-6">
          <div className="min-w-0">
            {title && <h2 className="font-semibold tracking-tight">{title}</h2>}
            {subtitle && <p className="mt-1 max-w-[70ch] text-sm text-muted">{subtitle}</p>}
          </div>
          {actions}
        </header>
      )}
      <div className={pad ? 'px-5 py-4 sm:px-6' : ''}>{children}</div>
    </section>
  );
}

export function Stat({ label, value, sub, accent }) {
  return (
    <div className="min-w-0 rounded-xl border border-line bg-surface p-4 shadow-panel">
      <div className="truncate text-xs font-medium text-muted">{label}</div>
      <div className={`mt-1.5 truncate font-mono text-2xl font-medium tracking-tight tabular ${accent ? 'text-accent' : 'text-text'}`}>{value}</div>
      {sub && <div className="mt-1 truncate text-xs text-muted">{sub}</div>}
    </div>
  );
}

export function StatGrid({ children, cols = 'sm:grid-cols-3 lg:grid-cols-4' }) {
  return <div className={`grid grid-cols-2 gap-3 ${cols}`}>{children}</div>;
}

/** Key/value list for dense facts. */
export function Facts({ rows }) {
  return (
    <dl className="grid gap-x-6 gap-y-2.5 text-sm sm:grid-cols-2">
      {rows.filter(Boolean).map(([k, v]) => (
        <div key={k} className="flex items-baseline justify-between gap-3 border-b border-line/60 pb-2">
          <dt className="text-muted">{k}</dt>
          <dd className="text-right font-mono tabular">{v}</dd>
        </div>
      ))}
    </dl>
  );
}

export function Bar({ value, className = '', tone = 'bg-accent' }) {
  const pct = Math.max(0, Math.min(1, value || 0)) * 100;
  return (
    <div className={`h-1.5 overflow-hidden rounded-full bg-line ${className}`}>
      <div className={`h-full rounded-full ${tone}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

/** One leveled thing: skill, slayer, class, HOTM. */
export function LevelRow({ name, info, extra, note }) {
  const maxed = info.maxed;
  return (
    <div className="py-3">
      <div className="flex items-baseline justify-between gap-3">
        <span className="font-medium">
          {name}
          {note && <span className="ml-2 text-xs font-normal text-muted">{note}</span>}
        </span>
        <span className="font-mono text-sm tabular">
          <span className={maxed ? 'text-accent' : 'text-text'}>{info.level}</span>
          <span className="text-muted"> / {info.cap}</span>
          {info.overflow > 0 && <span className="ml-1 text-accent">+{num(info.overflow, 2)}</span>}
        </span>
      </div>
      <Bar value={info.progress} className="mt-2" tone={maxed ? 'bg-accent' : 'bg-accent/70'} />
      <div className="mt-1.5 flex justify-between gap-3 text-xs text-muted">
        <span className="font-mono tabular">{int(info.xp)} XP</span>
        <span className="font-mono tabular">{maxed && !info.overflow ? 'Maxed' : `${int(info.toNext)} to next`}</span>
      </div>
      {extra}
    </div>
  );
}

export function Empty({ children }) {
  return <div className="rounded-xl border border-dashed border-line p-8 text-center text-sm text-muted">{children}</div>;
}

export function Chip({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg border px-3 text-sm transition-colors ${
        active ? 'border-accent bg-accent-soft text-text' : 'border-line text-muted hover:text-text'
      }`}
    >
      {children}
    </button>
  );
}

export function SearchInput({ value, onChange, placeholder, className = '' }) {
  return (
    <input
      type="search"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      autoComplete="off"
      spellCheck="false"
      className={`h-9 rounded-lg border border-line bg-surface px-3 text-sm text-text placeholder:text-muted focus:border-accent focus:outline-none ${className}`}
    />
  );
}

export function Loading({ label = 'Loading' }) {
  return (
    <div className="flex flex-col gap-3" aria-busy="true" aria-label={label}>
      <div className="skeleton h-24" />
      <div className="skeleton h-64" />
    </div>
  );
}

export function ErrorNote({ error, onRetry }) {
  return (
    <div className="rounded-xl border border-danger/40 bg-surface p-5 text-sm" role="alert">
      <p>{error?.message ?? 'Something went wrong.'}</p>
      {onRetry && (
        <button type="button" onClick={onRetry} className="mt-3 rounded-lg border border-line px-3 py-1.5 font-medium hover:border-accent">
          Try again
        </button>
      )}
    </div>
  );
}

const RARITY = {
  COMMON: 'r-common',
  UNCOMMON: 'r-uncommon',
  RARE: 'r-rare',
  EPIC: 'r-epic',
  LEGENDARY: 'r-legendary',
  MYTHIC: 'r-mythic',
  DIVINE: 'r-divine',
  SPECIAL: 'r-special',
  VERY_SPECIAL: 'r-special',
  SUPREME: 'r-divine',
};
export const rarityClass = (r) => RARITY[r] ?? 'text-text';
export const rarityLabel = (r) => (r ? r.replace('_', ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase()) : '');

/** Sortable table header cell. */
export function SortTh({ id, sort, setSort, children, align = 'left' }) {
  const active = sort.key === id;
  return (
    <th className={`px-3 py-2 font-medium ${align === 'right' ? 'text-right' : 'text-left'}`} aria-sort={active ? (sort.dir > 0 ? 'ascending' : 'descending') : 'none'}>
      <button
        type="button"
        onClick={() => setSort({ key: id, dir: active ? -sort.dir : -1 })}
        className={`inline-flex items-center gap-1 hover:text-text ${active ? 'text-text' : ''}`}
      >
        {children}
        <span className="text-[10px]">{active ? (sort.dir > 0 ? '▲' : '▼') : ''}</span>
      </button>
    </th>
  );
}
