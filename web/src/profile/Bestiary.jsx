// The bestiary: every mob family by island, with its tier, kills and how
// far the next tier is. Tiers are worked out from the profile's kill counts
// and NEU's bestiary table (shared/stats/bestiary.js). The milestone is the
// total of all tiers divided by ten; the API only stores the last one claimed.
import { useEffect, useMemo, useState } from 'react';
import { bestiary } from '../../../shared/stats/bestiary.js';
import { int } from '../lib/format.js';
import { loadNeuConstant } from '../lib/neu.js';
import { ItemSlot, mcText } from '../mc.jsx';
import { Bar, Chip, Empty, Panel, SearchInput, Stat, StatGrid } from '../ui.jsx';

const FILTERS = [
  ['all', 'All'],
  ['progress', 'In progress'],
  ['maxed', 'Maxed'],
  ['none', 'Not started'],
];

const keep = (filter, f) =>
  filter === 'maxed' ? f.maxed : filter === 'progress' ? !f.maxed && f.kills > 0 : filter === 'none' ? f.kills === 0 : true;

function Family({ f }) {
  return (
    <li className="flex min-w-0 items-center gap-2.5 py-1.5">
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
        <span className="flex items-baseline justify-between gap-2 text-sm">
          <span className="truncate">{mcText(f.name)}</span>
          <span className={`shrink-0 tabular text-xs ${f.maxed ? 'text-warn' : 'text-muted'}`}>
            {f.tier}/{f.maxTier}
          </span>
        </span>
        <Bar value={f.progress} className="mt-1" gold={f.maxed} />
      </span>
    </li>
  );
}

export default function Bestiary({ stats }) {
  const [constants, setConstants] = useState(undefined);
  const [filter, setFilter] = useState('all');
  const [q, setQ] = useState('');
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
  const islands = data.islands
    .map((i) => ({
      ...i,
      groups: i.groups
        .map((g) => ({ ...g, families: g.families.filter((f) => keep(filter, f) && (!query || f.plain.toLowerCase().includes(query))) }))
        .filter((g) => g.families.length),
    }))
    .filter((i) => i.groups.length);

  return (
    <div className="fade-in flex flex-col gap-6">
      <StatGrid>
        {/* One milestone per 10 tiers; the API only stores the last one claimed in game. */}
        <Stat
          label="Bestiary milestone"
          value={Math.floor(data.tiers / 10)}
          sub={raw.milestone < Math.floor(data.tiers / 10) ? `${raw.milestone} claimed so far` : 'All claimed'}
          accent
        />
        <Stat label="Tiers unlocked" value={`${int(data.tiers)} / ${int(data.maxTiers)}`} sub={`${Math.round((data.tiers / data.maxTiers) * 100)}% of the bestiary`} />
        <Stat label="Families maxed" value={`${data.maxed} / ${data.families}`} sub={`${data.islands.length} islands`} />
        <Stat label="Mobs killed" value={int(data.kills)} sub="Counted towards the bestiary" />
      </StatGrid>

      <div className="flex flex-wrap items-center gap-2">
        <SearchInput value={q} onChange={setQ} placeholder="Search mobs" className="w-full sm:w-64" />
        {FILTERS.map(([id, label]) => (
          <Chip key={id} active={filter === id} onClick={() => setFilter(id)}>
            {label}
          </Chip>
        ))}
      </div>

      {islands.length === 0 && <Empty>No mobs match that.</Empty>}
      {islands.map((i) => (
        <Panel key={i.id} title={i.name} subtitle={`${i.tiers} / ${i.maxTiers} tiers, ${i.maxed} of ${i.families} maxed`}>
          {i.groups.map((g) => (
            <div key={g.id} className="mt-1 first:mt-0">
              {g.name && <h3 className="mt-3 mb-1 text-sm font-semibold text-muted first:mt-0">{g.name}</h3>}
              <ul className="grid gap-x-6 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
                {g.families.map((f) => (
                  <Family key={`${g.id}-${f.plain}`} f={f} />
                ))}
              </ul>
            </div>
          ))}
        </Panel>
      ))}
    </div>
  );
}
