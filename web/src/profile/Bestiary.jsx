// The bestiary: every mob family by island, with its tier, kills and how
// far the next tier is. Tiers are worked out from the profile's kill counts
// and NEU's bestiary table (shared/stats/bestiary.js). The milestone is the
// total of all tiers divided by ten; the API only stores the last one claimed.
//
// One island is shown at a time (picked from the list beside it), as small
// tiles, so the tab fits on about one screen. A search looks through all of them.
import { useEffect, useMemo, useState } from 'react';
import { bestiary } from '../../../shared/stats/bestiary.js';
import { int } from '../lib/format.js';
import { loadNeuConstant } from '../lib/neu.js';
import { ItemSlot, mcText } from '../mc.jsx';
import { Bar, Chip, Empty, SearchInput } from '../ui.jsx';

const SURFACE = 'border border-line bg-surface shadow-panel';

const FILTERS = [
  ['all', 'All'],
  ['progress', 'In progress'],
  ['maxed', 'Maxed'],
  ['none', 'Not started'],
];

const keep = (filter, f) =>
  filter === 'maxed' ? f.maxed : filter === 'progress' ? !f.maxed && f.kills > 0 : filter === 'none' ? f.kills === 0 : true;

const pct = (a, b) => (b ? Math.round((a / b) * 100) : 0);

function Family({ f }) {
  return (
    <li className="bs-mob">
      <ItemSlot
        id={`BESTIARY_${f.plain}`}
        hint={f.icon ?? undefined}
        tooltip={{
          name: f.name,
          lines: [
            { text: `Tier ${f.tier} / ${f.maxTier}`, color: f.maxed ? 'var(--code-gold)' : 'var(--code-yellow)' },
            `Kills: ${int(f.kills)}`,
            `Deaths: ${int(f.deaths)}`,
            f.next != null ? { text: `Next tier at ${int(f.next)} kills (${int(f.next - f.kills)} to go)`, color: 'var(--code-green)' } : { text: 'Maxed', color: 'var(--code-gold)' },
          ],
        }}
      />
      <span className="min-w-0 flex-1">
        <span className="flex items-baseline justify-between gap-2 text-[13px] leading-tight">
          <span className={`truncate ${f.kills === 0 ? 'text-muted' : ''}`}>{mcText(f.name)}</span>
          <span className={`shrink-0 tabular text-xs ${f.maxed ? 'text-warn' : 'text-muted'}`}>
            {f.tier}/{f.maxTier}
          </span>
        </span>
        <Bar value={f.progress} className="bs-bar" gold={f.maxed} />
      </span>
    </li>
  );
}

function Families({ families }) {
  return (
    <ul className="bs-grid">
      {families.map((f) => (
        <Family key={f.plain} f={f} />
      ))}
    </ul>
  );
}

/** A small heading inside the mob pane: an island (search results) or a group (Fishing). */
const SubHead = ({ children, note }) => (
  <h3 className="bs-sub">
    <span>{children}</span>
    {note && <span className="tabular font-normal">{note}</span>}
  </h3>
);

export default function Bestiary({ stats }) {
  const [constants, setConstants] = useState(undefined);
  const [filter, setFilter] = useState('all');
  const [q, setQ] = useState('');
  const [pick, setPick] = useState(null);
  useEffect(() => {
    let alive = true;
    loadNeuConstant('bestiary').then((c) => alive && setConstants(c));
    return () => {
      alive = false;
    };
  }, []);
  const raw = stats.bestiary;
  const data = useMemo(() => (constants && raw ? bestiary(constants, raw.kills, raw.deaths) : null), [constants, raw]);

  if (!raw) return <Empty>This report is from before the bestiary was added. Refresh to load it.</Empty>;
  if (constants === null) return <Empty>The bestiary table couldn't be loaded. Try again in a moment.</Empty>;
  if (!data) return <div className="skeleton h-96" aria-label="Loading the bestiary" />;

  const query = q.trim().toLowerCase();
  const island = data.islands.find((i) => i.id === pick) ?? data.islands[0];
  const shown = (groups) =>
    groups
      .map((g) => ({ ...g, families: g.families.filter((f) => keep(filter, f) && (!query || f.plain.toLowerCase().includes(query))) }))
      .filter((g) => g.families.length);

  // Searching looks through every island; otherwise only the picked one.
  const results = query
    ? data.islands.map((i) => ({ ...i, families: shown(i.groups).flatMap((g) => g.families) })).filter((i) => i.families.length)
    : null;
  const groups = query ? null : shown(island.groups);
  const milestone = Math.floor(data.tiers / 10);

  return (
    <div className="fade-in bs flex flex-col gap-3">
      {/* One milestone per 10 tiers; the API only stores the last one claimed in game. */}
      <div className={`${SURFACE} bs-summary`}>
        <div>
          <span className="text-muted">Milestone</span>
          <b className="text-accent">{milestone}</b>
          <span className="text-muted">{raw.milestone < milestone ? `${raw.milestone} claimed` : 'all claimed'}</span>
        </div>
        <div>
          <span className="text-muted">Tiers</span>
          <b>
            {int(data.tiers)} / {int(data.maxTiers)}
          </b>
          <span className="text-muted">{pct(data.tiers, data.maxTiers)}%</span>
        </div>
        <div>
          <span className="text-muted">Maxed</span>
          <b>
            {data.maxed} / {data.families}
          </b>
        </div>
        <div>
          <span className="text-muted">Kills</span>
          <b>{int(data.kills)}</b>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <SearchInput value={q} onChange={setQ} placeholder="Search all mobs" className="w-full sm:w-56" />
        {FILTERS.map(([id, label]) => (
          <Chip key={id} active={filter === id} onClick={() => setFilter(id)}>
            {label}
          </Chip>
        ))}
      </div>

      <div className="bs-layout">
        <nav className={`${SURFACE} bs-islands`} aria-label="Islands">
          {data.islands.map((i) => (
            <button
              key={i.id}
              type="button"
              className="bs-island"
              aria-current={!query && i.id === island.id ? 'true' : undefined}
              onClick={() => {
                setPick(i.id);
                setQ('');
              }}
            >
              <span className="min-w-0 flex-1">
                <span className="flex items-baseline justify-between gap-2">
                  <span className="truncate">{i.name}</span>
                  <span className={`shrink-0 tabular text-xs ${i.maxed === i.families ? 'text-warn' : 'text-muted'}`}>
                    {i.maxed}/{i.families}
                  </span>
                </span>
                <Bar value={i.maxTiers ? i.tiers / i.maxTiers : 0} className="bs-bar" gold={i.tiers === i.maxTiers} />
              </span>
            </button>
          ))}
        </nav>

        <section className={`${SURFACE} bs-pane`} aria-live="polite">
          {query ? (
            <>
              <header className="bs-head">
                <h2 className="font-bold">Results</h2>
                <span className="text-sm text-muted">
                  {results.reduce((n, i) => n + i.families.length, 0)} mobs on {results.length} islands
                </span>
              </header>
              {results.length === 0 && <p className="py-6 text-center text-sm text-muted">No mobs match that.</p>}
              {results.map((i) => (
                <div key={i.id}>
                  <SubHead>{i.name}</SubHead>
                  <Families families={i.families} />
                </div>
              ))}
            </>
          ) : (
            <>
              <header className="bs-head">
                <h2 className="font-bold">{island.name}</h2>
                <span className="text-sm text-muted tabular">
                  {island.tiers} / {island.maxTiers} tiers, {island.maxed} of {island.families} maxed
                </span>
              </header>
              {groups.length === 0 && <p className="py-6 text-center text-sm text-muted">No mobs here match that filter.</p>}
              {groups.map((g) =>
                g.name ? (
                  <div key={g.id}>
                    <SubHead note={`${g.families.filter((f) => f.maxed).length}/${g.families.length}`}>{g.name}</SubHead>
                    <Families families={g.families} />
                  </div>
                ) : (
                  <Families key={g.id} families={g.families} />
                ),
              )}
            </>
          )}
        </section>
      </div>
    </div>
  );
}
