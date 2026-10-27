// The upgrade advisor (farming fortune, hunting fortune, consumables) in the
// new design: an overview of where the fortune comes from, the best buys,
// the section's own stats (garden and contests, or shards and the safari),
// then every source by category with a sticky index to jump around.
import { ArrowRightIcon, CaretDownIcon, CoinsIcon, MagnifyingGlassIcon } from '@phosphor-icons/react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { rowIcon } from '../components/SourceRow.jsx';
import { remainingCost } from '../lib/sections.js';
import { coins, int, num } from '../lib/format.js';
import { load, save } from '../lib/storage.js';
import { Bar, ItemIcon, StatusBadge } from './parts.jsx';

const SOURCE_LABEL = { bazaar: 'Bazaar', auction: 'Lowest BIN' };
const OPEN = new Set(['missing', 'partial']);

const counted = (s) => s.counted && s.unit === 'fortune' && s.status !== 'tip' && s.status !== 'unknown';

function groupTotals(g) {
  let current = 0;
  let max = 0;
  for (const s of g.items) {
    if (!counted(s)) continue;
    current += s.current;
    max += s.max;
  }
  return { current, max, open: g.items.filter((s) => OPEN.has(s.status)).length };
}

// One accent, stepped down in strength for each category.
const shade = (i) => `color-mix(in srgb, var(--nx-accent) ${Math.max(28, 100 - i * 11)}%, var(--nx-surface-3))`;

// ------------------------------------------------------------------ overview

const LABEL = { farming: 'Farming fortune', hunting: 'Hunting fortune', consumables: 'Consumables' };

function Overview({ section, groups }) {
  const isCount = section.id === 'consumables';
  const usable = section.groups.flatMap((g) => g.items).filter((s) => s.unit === 'used' && s.status !== 'unknown');
  const totals = isCount ? { current: usable.filter((s) => s.status === 'done').length, max: usable.length } : section.totals;
  const cost = remainingCost(section);
  const left = Math.max(0, totals.max - totals.current);
  const parts = groups.filter((g) => g.t.current > 0).sort((a, b) => b.t.current - a.t.current);
  const rows = groups.flatMap((g) => g.items);
  const maxed = rows.filter((s) => s.status === 'done').length;
  const tracked = rows.filter((s) => s.status !== 'info' && s.status !== 'tip').length;
  const buyable = rows.filter((s) => OPEN.has(s.status) && s.cost?.total > 0 && !s.tags.includes('alternative')).length;
  const biggest = rows.filter((s) => counted(s) && OPEN.has(s.status)).sort((a, b) => b.gain - a.gain)[0];
  return (
    <div className="nx-shell nx-rise h-full">
      <div className="nx-core flex h-full flex-col p-6 sm:p-8">
        <div className="nx-eyebrow">{LABEL[section.id]}</div>
        <div className="mt-4 flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <span className="nx-num text-[56px] leading-none font-semibold tracking-[-0.04em] sm:text-[72px]">{num(totals.current)}</span>
          <span className="nx-num nx-muted text-xl">
            of {num(totals.max)}
            {isCount ? ' used up' : ''}
          </span>
        </div>
        <p className="nx-muted mt-3 max-w-[56ch] text-[15px]">
          <span className="nx-num text-[var(--nx-text)]">{num(left)}</span> {isCount ? (left === 1 ? 'consumable' : 'consumables') + ' still to use' : 'fortune left to unlock'}
          {cost > 0 && (
            <>
              , about <span className="nx-coin nx-num">{coins(cost)} coins</span> to buy the rest
            </>
          )}
          .
        </p>

        <dl className="mt-8 grid grid-cols-3 gap-3">
          {[
            ['Sources maxed', `${maxed} / ${tracked}`],
            ['Upgrades to buy', buyable],
            isCount ? ['To buy', cost > 0 ? coins(cost) : '-', 'coins for the rest'] : ['Biggest gap', biggest ? `+${num(biggest.gain)}` : '-', biggest?.name],
          ].map(([label, value, sub]) => (
            <div key={label} className="nx-inset px-4 py-3">
              <dt className="nx-faint text-[12px]">{label}</dt>
              <dd className="nx-num mt-1 text-[20px] font-semibold tracking-[-0.02em]">{value}</dd>
              {sub && <dd className="nx-faint truncate text-[12px]">{sub}</dd>}
            </div>
          ))}
        </dl>

        {!isCount && parts.length > 0 && <div className="mt-auto pt-8">
          <div className="nx-stack" aria-hidden="true">
            {parts.map((g, i) => (
              <span key={g.id} title={`${g.title}: +${num(g.t.current)}`} style={{ width: `${(g.t.current / totals.max) * 100}%`, background: shade(i), animationDelay: `${i * 40}ms` }} />
            ))}
          </div>
          <ul className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2 text-[13px] sm:grid-cols-3">
            {parts.map((g, i) => (
              <li key={g.id} className="flex min-w-0 items-center gap-2">
                <span className="size-2 shrink-0 rounded-full" style={{ background: shade(i) }} />
                <span className="nx-muted truncate">{g.title}</span>
                <span className="nx-num ml-auto">{num(g.t.current)}</span>
              </li>
            ))}
          </ul>
          {totals.unreadable > 0 && (
            <p className="nx-faint mt-4 text-[13px]">
              {num(totals.unreadable)} of the maximum comes from sources Hypixel doesn't share, so check those in game.
            </p>
          )}
        </div>}
      </div>
    </div>
  );
}

function BestBuys({ picks, onJump }) {
  return (
    <div className="nx-shell nx-rise h-full" style={{ '--i': 1 }}>
      <div className="nx-core flex h-full flex-col p-3 sm:p-4">
        <div className="px-3 pt-3 pb-2">
          <div className="nx-eyebrow">Best value</div>
          <h2 className="nx-h2 mt-1.5">Cheapest fortune per coin</h2>
        </div>
        {picks?.length ? (
          <ol className="flex flex-col">
            {picks.slice(0, 5).map((p) => (
              <li key={p.id}>
                <button type="button" className="nx-pick" onClick={() => onJump(p.id)}>
                  <ItemIcon id={p.icon} size={34} alt={p.name} />
                  <span className="min-w-0">
                    <span className="block truncate text-[14px] font-medium">{p.name}</span>
                    <span className="nx-faint block truncate text-[13px]">{p.group}</span>
                  </span>
                  <span className="text-right text-[13px]">
                    <span className="nx-gain nx-num block font-medium">+{num(p.gain)}</span>
                    <span className="nx-coin nx-num block">{coins(p.total)}</span>
                  </span>
                </button>
              </li>
            ))}
          </ol>
        ) : (
          <p className="nx-muted px-3 py-6 text-[14px]">Nothing left to buy here. Everything that can be bought is already done.</p>
        )}
        {picks?.length > 0 && (
          <p className="nx-faint mt-auto px-3 pt-3 pb-2 text-[12px]">Always-on fortune only, ranked by coins per point.</p>
        )}
      </div>
    </div>
  );
}

function Facts({ rows }) {
  return (
    <dl className="nx-facts">
      {rows.map(([k, v]) => (
        <div key={k} className="contents">
          <dt>{k}</dt>
          <dd>{v}</dd>
        </div>
      ))}
    </dl>
  );
}

function GardenCards({ stats }) {
  const g = stats.garden;
  const j = stats.jacob;
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="nx-shell nx-rise" style={{ '--i': 2 }}>
        <div className="nx-core p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="nx-eyebrow">Garden</div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="nx-num text-[32px] leading-none font-semibold tracking-[-0.03em]">{g ? g.level : '-'}</span>
                <span className="nx-muted text-[14px]">garden level</span>
              </div>
            </div>
            <ItemIcon id="GRASS" size={44} alt="Garden" />
          </div>
          {g ? (
            <div className="mt-5">
              <Facts
                rows={[
                  ['Plots unlocked', `${g.plots} / 24`],
                  ['Visitors served', `${int(g.visitorsServed)} (${int(g.uniqueVisitors)} unique)`],
                  ['Copper', int(g.copper)],
                ]}
              />
              {g.cropUpgrades.length > 0 && (
                <details className="group mt-3">
                  <summary className="nx-muted flex items-center gap-1.5 py-1 text-[13px] hover:text-[var(--nx-text)]">
                    Crop upgrades
                    <CaretDownIcon size={12} className="transition-transform duration-300 group-open:rotate-180" />
                  </summary>
                  <div className="mt-2">
                    <Facts rows={g.cropUpgrades.map((c) => [c.name, `${c.level} / 9`])} />
                  </div>
                </details>
              )}
            </div>
          ) : (
            <p className="nx-muted mt-4 text-[14px]">Garden data isn't available for this profile.</p>
          )}
        </div>
      </div>

      <div className="nx-shell nx-rise" style={{ '--i': 3 }}>
        <div className="nx-core p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="nx-eyebrow">Jacob's contests</div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="nx-num text-[32px] leading-none font-semibold tracking-[-0.03em]">{j ? int(j.contests) : 0}</span>
                <span className="nx-muted text-[14px]">contests entered</span>
              </div>
            </div>
            <ItemIcon id="JACOBS_TICKET" size={44} alt="Jacob's ticket" />
          </div>
          {j ? (
            <div className="mt-5">
              <Facts
                rows={[
                  ['Medals to spend', `${j.medals.gold ?? 0} gold · ${j.medals.silver ?? 0} silver · ${j.medals.bronze ?? 0} bronze`],
                  ['Anita level cap', `${j.perks.levelCap} / 10`],
                  ['Double drops perk', `${j.perks.doubleDrops} / 15`],
                ]}
              />
              {j.personalBests.length > 0 && (
                <details className="group mt-3">
                  <summary className="nx-muted flex items-center gap-1.5 py-1 text-[13px] hover:text-[var(--nx-text)]">
                    Personal bests
                    <CaretDownIcon size={12} className="transition-transform duration-300 group-open:rotate-180" />
                  </summary>
                  <div className="mt-2">
                    <Facts rows={j.personalBests.map((p) => [p.name, int(p.value)])} />
                  </div>
                </details>
              )}
            </div>
          ) : (
            <p className="nx-muted mt-4 text-[14px]">No contests entered yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}

function HuntingCards({ stats }) {
  const h = stats.hunting;
  const tiles = [
    ['Shards fused', int(h.shardsFused)],
    ['Unique shards', int(h.uniqueShards), `${h.shardTypesOwned} types held`],
    ['Attributes unlocked', h.attributesUnlocked],
    ['Safari captures', int(h.safariCaptures), `${h.critters} critters found`],
  ];
  const activity = [
    ['Combat shard hunts', int(h.hunts.combat)],
    ['Fishing shard hunts', int(h.hunts.fishing)],
    ['Forest shard hunts', int(h.hunts.forest)],
    ['Salt shard hunts', int(h.hunts.salt)],
    ...h.biomes.map((b) => [`${b.name} captures`, `${int(b.captures)} (milestone ${b.milestone})`]),
    ['Trapper pelts', int(h.pelts)],
  ];
  return (
    <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <div className="nx-shell nx-rise" style={{ '--i': 2 }}>
        <div className="nx-core grid h-full grid-cols-2 gap-3 p-4">
          {tiles.map(([label, value, sub]) => (
            <div key={label} className="nx-inset px-4 py-3">
              <div className="nx-faint text-[12px]">{label}</div>
              <div className="nx-num mt-1 text-[22px] font-semibold tracking-[-0.02em]">{value}</div>
              {sub && <div className="nx-faint text-[12px]">{sub}</div>}
            </div>
          ))}
        </div>
      </div>
      <div className="nx-shell nx-rise" style={{ '--i': 3 }}>
        <div className="nx-core p-6">
          <div className="nx-eyebrow mb-3">Hunting activity</div>
          <Facts rows={activity} />
        </div>
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ rows

function CostLines({ cost }) {
  return (
    <div className="nx-inset mt-4 p-2">
      <ul className="nx-divide">
        {cost.lines.map((line) => (
          <li key={line.id} className="flex items-center gap-3 px-2 py-2 text-[14px]">
            <ItemIcon id={line.id} size={28} alt={line.name} />
            <span className="min-w-0 flex-1">
              <span className="block truncate">
                {line.qty > 1 && <span className="nx-muted nx-num">{line.qty} × </span>}
                {line.name}
              </span>
              {line.source && (
                <span className="nx-faint block text-[12px]">
                  {SOURCE_LABEL[line.source]}
                  {line.qty > 1 && line.unit ? ` · ${coins(line.unit)} each` : ''}
                  {line.note ? ` · ${line.note}` : ''}
                </span>
              )}
            </span>
            <span className={`nx-num shrink-0 ${line.total ? 'nx-coin' : 'nx-faint'}`}>{line.total ? coins(line.total) : 'no price'}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Row({ item, flash, sectionId }) {
  const [open, setOpen] = useState(false);
  const showNumbers = item.max > 0 && item.status !== 'tip';
  const cost = item.cost;
  const priced = cost && (cost.total > 0 || cost.unpriced > 0);
  const hasLines = cost?.lines?.length > 0;

  return (
    <li id={`nx-row-${item.id}`} className={`nx-row ${flash ? 'is-flash' : ''}`}>
      <ItemIcon id={rowIcon(item, sectionId)} alt={item.name} />

      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
          <h3 className="nx-row-title">{item.name}</h3>
          <StatusBadge status={item.status} />
          {item.condition && <span className="nx-badge">{item.condition}</span>}
          {item.tags.includes('alternative') && <span className="nx-badge">Alternative</span>}
        </div>
        {item.detail && <p className="nx-row-detail">{item.detail}</p>}
        {item.action && (
          <p className="nx-row-action">
            <ArrowRightIcon size={15} weight="regular" className="nx-gain mt-[3px] shrink-0" aria-hidden="true" />
            <span>{item.action}</span>
          </p>
        )}
      </div>

      <div className="col-start-2 mt-2 md:mt-0 min-[900px]:col-start-3 min-[900px]:pt-0.5">
        {showNumbers && (
          <>
            <div className="flex items-baseline justify-between gap-2 text-[14px]">
              <span className="nx-num">
                {num(item.current)}
                <span className="nx-faint"> / {num(item.max)}</span>
              </span>
              {item.gain > 0 && item.status !== 'unknown' && <span className="nx-gain nx-num font-medium">+{num(item.gain)}</span>}
            </div>
            <Bar value={item.max ? item.current / item.max : 0} muted={item.status === 'unknown'} className="mt-2" />
            <div className="nx-faint mt-1.5 text-[12px]">{item.unit}</div>
          </>
        )}
      </div>

      <div className="col-start-2 min-[900px]:col-start-4 min-[900px]:pt-0.5 min-[900px]:text-right">
        {priced ? (
          <>
            <div className="nx-coin nx-num inline-flex items-center gap-1.5 text-[15px] font-medium">
              <CoinsIcon size={15} weight="regular" aria-hidden="true" />
              {cost.total > 0 ? coins(cost.total) : 'no price'}
            </div>
            {item.costGain > 0 && item.costGain < item.gain && <div className="nx-faint text-[12px]">for the next +{num(item.costGain)}</div>}
            {cost.unpriced > 0 && cost.total > 0 && <div className="nx-faint text-[12px]">+{cost.unpriced} without a price</div>}
            {item.costNote && <div className="nx-faint mt-0.5 text-[12px] leading-snug">{item.costNote}</div>}
            {hasLines && (
              <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="nx-btn nx-btn-ghost nx-btn-sm mt-2 -mr-3">
                {open ? 'Hide' : 'Breakdown'}
                <CaretDownIcon size={12} className={`transition-transform duration-300 ${open ? 'rotate-180' : ''}`} />
              </button>
            )}
          </>
        ) : (
          item.costNote && item.status !== 'done' && <div className="nx-faint text-[13px] leading-snug">{item.costNote}</div>
        )}
      </div>

      {hasLines && (
        <div className={`nx-expand col-span-full min-[900px]:col-start-2 ${open ? 'is-open' : ''}`}>
          <div>{open && <CostLines cost={cost} />}</div>
        </div>
      )}
    </li>
  );
}

// ------------------------------------------------------------------ list

const SORTS = {
  default: (items) => items,
  gain: (items) => [...items].sort((a, b) => b.gain - a.gain),
  cost: (items) => [...items].sort((a, b) => (a.cost?.total || Infinity) - (b.cost?.total || Infinity)),
};

function useActiveGroup(ids) {
  const [active, setActive] = useState(ids[0]);
  useEffect(() => {
    const els = ids.map((id) => document.getElementById(`nx-group-${id}`)).filter(Boolean);
    const obs = new IntersectionObserver(
      (entries) => {
        const top = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (top) setActive(top.target.id.replace('nx-group-', ''));
      },
      { rootMargin: '-90px 0px -60% 0px' },
    );
    els.forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, [ids.join('|')]); // eslint-disable-line react-hooks/exhaustive-deps
  return active;
}

export default function Advisor({ report, stats, sectionId = 'farming' }) {
  const section = report.sections[sectionId];
  const picks = report.bestValue[sectionId];
  const [filter, setFilter] = useState(() => load('nxFilter', 'all'));
  const [sort, setSort] = useState('default');
  const [query, setQuery] = useState('');
  const [flash, setFlash] = useState(null);
  const flashTimer = useRef(null);

  const groups = useMemo(() => section.groups.map((g) => ({ ...g, t: groupTotals(g) })), [section]);
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return groups
      .map((g) => {
        let items = g.items;
        if (filter === 'todo') items = items.filter((s) => OPEN.has(s.status));
        if (filter === 'done') items = items.filter((s) => s.status === 'done');
        if (q) items = items.filter((s) => `${s.name} ${s.detail ?? ''} ${s.action ?? ''}`.toLowerCase().includes(q));
        return { ...g, items: SORTS[sort](items) };
      })
      .filter((g) => g.items.length);
  }, [groups, filter, sort, query]);
  const active = useActiveGroup(visible.map((g) => g.id));

  const pickFilter = (f) => {
    setFilter(f);
    save('nxFilter', f);
  };

  const scrollToGroup = (id) => {
    const el = document.getElementById(`nx-group-${id}`);
    if (el) window.scrollTo({ top: window.scrollY + el.getBoundingClientRect().top - 84, behavior: 'smooth' });
  };

  const jumpToRow = (rowId) => {
    setFilter('all');
    setQuery('');
    requestAnimationFrame(() => {
      const el = document.getElementById(`nx-row-${rowId}`);
      if (!el) return;
      window.scrollTo({ top: window.scrollY + el.getBoundingClientRect().top - 120, behavior: 'smooth' });
      setFlash(rowId);
      clearTimeout(flashTimer.current);
      flashTimer.current = setTimeout(() => setFlash(null), 1700);
    });
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 lg:grid-cols-12">
        <div className={picks ? 'lg:col-span-7' : 'lg:col-span-12'}>
          <Overview section={section} groups={groups} />
        </div>
        {picks && (
          <div className="lg:col-span-5">
            <BestBuys picks={picks} onJump={jumpToRow} />
          </div>
        )}
      </div>

      {sectionId === 'farming' && <GardenCards stats={stats} />}
      {sectionId === 'hunting' && <HuntingCards stats={stats} />}

      <div className="mt-10 grid gap-8 lg:grid-cols-[220px_minmax(0,1fr)]">
        <aside className="hidden lg:block">
          <nav className="nx-rail" aria-label="Categories">
            <div className="nx-eyebrow mb-3 px-3">Categories</div>
            <ul className="flex flex-col gap-0.5">
              {groups.map((g) => {
                const shown = visible.some((v) => v.id === g.id);
                return (
                  <li key={g.id}>
                    <button
                      type="button"
                      className="nx-rail-link"
                      aria-current={active === g.id}
                      disabled={!shown}
                      style={shown ? undefined : { opacity: 0.4, cursor: 'default' }}
                      onClick={() => scrollToGroup(g.id)}
                    >
                      <span className="truncate text-[14px] font-medium">{g.title}</span>
                      {g.t.open > 0 ? <span className="nx-num text-[12px] text-[var(--nx-miss)]">{g.t.open}</span> : <span />}
                      {g.t.max > 0 && <Bar value={g.t.current / g.t.max} className="col-span-2 mt-1.5 !h-[3px]" />}
                    </button>
                  </li>
                );
              })}
            </ul>
          </nav>
        </aside>

        <div className="min-w-0">
          <div className="mb-5 flex flex-wrap items-center gap-3">
            <div className="nx-seg" role="group" aria-label="Show">
              {[
                ['all', 'All'],
                ['todo', 'To do'],
                ['done', 'Done'],
              ].map(([id, label]) => (
                <button key={id} type="button" aria-pressed={filter === id} onClick={() => pickFilter(id)}>
                  {label}
                </button>
              ))}
            </div>
            <label className="nx-search !ml-0 max-w-[260px] min-w-[180px]">
              <MagnifyingGlassIcon size={15} weight="regular" aria-hidden="true" />
              <span className="sr-only">Filter sources</span>
              <input className="nx-plain" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Filter sources" />
            </label>
            <label className="ml-auto inline-flex items-center gap-2">
              <span className="nx-muted text-[13px]">Sort</span>
              <select value={sort} onChange={(e) => setSort(e.target.value)} className="nx-select">
                <option value="default">By category</option>
                <option value="gain">Biggest gain</option>
                <option value="cost">Cheapest first</option>
              </select>
            </label>
          </div>

          {visible.length === 0 ? (
            <div className="nx-shell">
              <div className="nx-core px-6 py-14 text-center">
                <p className="text-[15px] font-medium">Nothing matches</p>
                <p className="nx-muted mt-1 text-[14px]">{query ? 'Try a different word, or clear the filter.' : 'Switch to All to see every source.'}</p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-5">
              {visible.map((g, i) => (
                <section key={g.id} id={`nx-group-${g.id}`} className="nx-shell nx-rise scroll-mt-24" style={{ '--i': Math.min(i, 4) }} aria-labelledby={`nx-title-${g.id}`}>
                  <div className="nx-core overflow-hidden">
                    <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2 border-b border-[var(--nx-line)] px-5 pt-5 pb-4 sm:px-6">
                      <div className="min-w-0">
                        <h2 id={`nx-title-${g.id}`} className="nx-h2">
                          {g.title}
                        </h2>
                        {g.blurb && <p className="nx-muted mt-1 max-w-[68ch] text-[14px]">{g.blurb}</p>}
                      </div>
                      {g.t.max > 0 && (
                        <div className="w-full sm:w-44">
                          <div className="flex justify-between text-[13px]">
                            <span className="nx-muted">Fortune</span>
                            <span className="nx-num">
                              {num(g.t.current)}
                              <span className="nx-faint"> / {num(g.t.max)}</span>
                            </span>
                          </div>
                          <Bar value={g.t.current / g.t.max} className="mt-1.5" />
                        </div>
                      )}
                    </header>
                    <ul className="nx-divide">
                      {g.items.map((item) => (
                        <Row key={item.id} item={item} flash={flash === item.id} sectionId={section.id} />
                      ))}
                    </ul>
                  </div>
                </section>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
