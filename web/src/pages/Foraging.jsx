// The foraging helper: everything about foraging on Galatea for one player,
// on a frosted card over a Galatea screenshot (day or night with the theme),
// with the player's skin beside it. This page alone uses that look.
import { ArrowRightIcon, MagnifyingGlassIcon } from '@phosphor-icons/react';
import { useEffect, useMemo, useState } from 'react';
import { fetchReport } from '../lib/api.js';
import { coins, int, num, until } from '../lib/format.js';
import { loadHotf, perkCurrency, perkLore, perkValue } from '../foraging/hotf.js';
import SkinModel from '../foraging/SkinModel.jsx';
import { ItemSlot, itemCard, mcText } from '../mc.jsx';
import { ErrorNote } from '../ui.jsx';
import '../foraging/foraging.css';

// --------------------------------------------------------------- data

function useReport(player, profile) {
  const [state, setState] = useState({ status: player ? 'loading' : 'idle', report: null, error: null });
  useEffect(() => {
    if (!player) {
      setState({ status: 'idle', report: null, error: null });
      return undefined;
    }
    const ctrl = new AbortController();
    setState((s) => ({ status: 'loading', report: s.report?.player?.name?.toLowerCase() === player.toLowerCase() ? s.report : null, error: null }));
    fetchReport(player, profile, { signal: ctrl.signal })
      .then((report) => setState({ status: 'ready', report, error: null }))
      .catch((error) => error.name !== 'AbortError' && setState({ status: 'error', report: null, error }));
    return () => ctrl.abort();
  }, [player, profile]);
  return state;
}

function useHotf() {
  const [hotf, setHotf] = useState(null);
  useEffect(() => {
    let alive = true;
    loadHotf().then((h) => alive && setHotf(h));
    return () => {
      alive = false;
    };
  }, []);
  return hotf;
}

/** Fortune and Sweep by source: gear from its lore, then Heart of the Forest perks. */
function fortuneSources(f) {
  const rows = [];
  const g = f.gear;
  for (const p of [...g.armor, ...g.equipment, ...g.accessories]) rows.push({ key: `${p.location}-${p.id}`, item: p, label: p.name, fortune: p.fortune, sweep: p.sweep });
  if (g.axe) rows.push({ key: 'axe', item: g.axe, label: g.axe.name, note: 'Best axe on the profile', fortune: g.axe.fortune, sweep: g.axe.sweep });
  const on = (id) => (f.perks[id] ?? 0) > 0 && !f.disabled.includes(id);
  if (on('foraging_fortune')) rows.push({ key: 'p-ff', label: 'Foraging Fortune perk', note: `Level ${f.perks.foraging_fortune}`, fortune: f.perks.foraging_fortune * 3, sweep: 0 });
  if (on('sweep')) rows.push({ key: 'p-sw', label: 'Sweep perk', note: `Level ${f.perks.sweep}`, fortune: 0, sweep: f.perks.sweep });
  if (on('foraging_madness')) rows.push({ key: 'p-fm', label: 'Foraging Madness', note: 'Heart of the Forest', fortune: 50, sweep: 10 });
  return rows;
}

/** Perks still to level that add Foraging Fortune or Sweep, biggest gain first. */
function nextPerks(f, hotf) {
  if (!hotf) return [];
  const want = [
    ['foraging_fortune', (left) => `+${left * 3} Foraging Fortune`],
    ['sweep', (left) => `+${left} Sweep`],
    ['foraging_madness', () => '+50 Foraging Fortune and +10 Sweep'],
    ['early_bird', () => '+100 Foraging Fortune and +20 Sweep for your first 250 trees a day'],
    ['forest_strength', () => 'Part of your Strength as Fortune and Sweep'],
    ['forest_speed', () => 'Part of your Speed as Fortune and Sweep'],
  ];
  return want
    .map(([id, gain]) => {
      const perk = hotf.perks[id];
      if (!perk) return null;
      const level = f.perks[id] ?? 0;
      const left = perk.maxLevel - level;
      return left > 0 ? { id, name: perk.name, level, max: perk.maxLevel, gain: gain(left), currency: perkCurrency(perk, level + 1) } : null;
    })
    .filter(Boolean);
}

// --------------------------------------------------------------- pieces

const Section = ({ title, children, className = '' }) => (
  <section className={`forage-section ${className}`}>
    <h2 className="forage-h2">{title}</h2>
    {children}
  </section>
);

function Search({ onPlayer, initial = '' }) {
  const [q, setQ] = useState(initial);
  return (
    <form
      className="forage-search"
      onSubmit={(e) => {
        e.preventDefault();
        if (q.trim()) onPlayer(q.trim());
      }}
    >
      <label htmlFor="forage-player" className="sr-only">
        Player name
      </label>
      <MagnifyingGlassIcon size={16} aria-hidden="true" />
      <input id="forage-player" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Player name" autoComplete="off" spellCheck="false" />
      <button type="submit">Look up</button>
    </form>
  );
}

function Headline({ report, f, totals }) {
  const skill = report.stats.skills.list.find((s) => s.id === 'foraging');
  const forest = f.whispers.forest;
  const desert = f.whispers.desert;
  const tiles = [
    { label: 'Foraging', value: skill ? num(skill.exact ?? skill.level, 2) : '-', sub: skill && !skill.maxed ? `${int(skill.toNext)} XP to ${skill.level + 1}` : 'Maxed' },
    { label: 'Heart of the Forest', value: f.hotf.level, sub: `${f.nodes} perks unlocked` },
    { label: 'Foraging Fortune', value: int(totals.fortune), sub: 'Gear and perks', tone: 'gold' },
    { label: 'Sweep', value: num(totals.sweep, 1), sub: 'Gear and perks', tone: 'green' },
    { label: 'Forest Whispers', value: forest ? coins(forest.total) : '-', sub: forest ? `${coins(forest.spent)} on perks` : 'None yet' },
    { label: 'Desert Whispers', value: desert ? coins(desert.total) : '-', sub: desert ? `${coins(desert.spent)} on perks` : 'None yet' },
  ];
  return (
    <dl className="forage-tiles">
      {tiles.map((t) => (
        <div key={t.label} className="forage-tile">
          <dt>{t.label}</dt>
          <dd className={`forage-tile-value ${t.tone ? `is-${t.tone}` : ''}`}>{t.value}</dd>
          <dd className="forage-tile-sub">{t.sub}</dd>
        </div>
      ))}
    </dl>
  );
}

function Sources({ rows, totals }) {
  return (
    <Section title="Where your Fortune and Sweep come from">
      {rows.length === 0 ? (
        <p className="forage-muted">No foraging gear or perks found on this profile yet.</p>
      ) : (
        <div className="forage-table-wrap">
          <table className="forage-table">
            <thead>
              <tr>
                <th scope="col">Source</th>
                <th scope="col" className="text-right">
                  Fortune
                </th>
                <th scope="col" className="text-right">
                  Sweep
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.key}>
                  <td>
                    <span className="flex items-center gap-3">
                      {r.item ? (
                        <ItemSlot id={r.item.id} rarity={r.item.rarity} tooltip={itemCard({ id: r.item.id, name: r.item.rawName ?? r.item.name, rarity: r.item.rarity, lore: r.item.lore })} />
                      ) : (
                        <ItemSlot id={r.key === 'p-sw' ? 'STRIPPED_OAK_LOG' : 'OAK_LOG'} tooltip={false} />
                      )}
                      <span className="min-w-0">
                        <span className="block truncate font-medium">{r.item ? mcText(r.item.rawName ?? r.label) : r.label}</span>
                        {(r.note || r.item) && <span className="block text-xs forage-muted">{r.note ?? r.item.location}</span>}
                      </span>
                    </span>
                  </td>
                  <td className="text-right tabular forage-gold">{r.fortune ? `+${num(r.fortune, 2)}` : ''}</td>
                  <td className="text-right tabular forage-green">{r.sweep ? `+${num(r.sweep, 2)}` : ''}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <th scope="row">Total</th>
                <td className="text-right tabular forage-gold">{num(totals.fortune, 2)}</td>
                <td className="text-right tabular forage-green">{num(totals.sweep, 2)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
      <p className="forage-note">
        Read from your items' own stats. Your pet, attribute shards and perks that only work some of the time (Early Bird, Half Full, the daily effect) aren't
        included.
      </p>
    </Section>
  );
}

const PERK_ICON = (perk, level) => {
  const v = perkValue(perk, 'item', level);
  return typeof v === 'string' ? v : level >= perk.maxLevel ? 'OAK_LOG' : level > 0 ? 'STRIPPED_OAK_LOG' : 'PALE_OAK_BUTTON';
};

function PerkTree({ f, hotf }) {
  if (!hotf) return <div className="forage-skeleton h-72" aria-label="Loading the perk tree" />;
  const perks = Object.entries(hotf.perks);
  const rows = Math.max(...perks.map(([, p]) => p.y)) + 1;
  const cols = Math.max(...perks.map(([, p]) => p.x)) + 1;
  return (
    <div className="forage-tree" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`, gridTemplateRows: `repeat(${rows}, auto)` }}>
      {perks.map(([id, perk]) => {
        const level = f.perks[id] ?? 0;
        const off = f.disabled.includes(id);
        const shown = Math.max(1, level);
        const lore = perkLore(perk, shown);
        const state = level >= perk.maxLevel ? 'maxed' : level > 0 ? 'started' : 'locked';
        return (
          <div key={id} className={`forage-perk is-${state} ${off ? 'is-off' : ''}`} style={{ gridColumn: perk.x + 1, gridRow: perk.y + 1 }}>
            <ItemSlot
              id={PERK_ICON(perk, level)}
              alt={perk.name}
              tooltip={{
                name: perk.name,
                rarity: state === 'maxed' ? 'LEGENDARY' : state === 'started' ? 'UNCOMMON' : 'COMMON',
                card: true,
                lore,
                lines: [
                  { text: perk.isAbility ? (level ? 'Ability unlocked' : 'Ability, not unlocked') : `Level ${level} / ${perk.maxLevel}`, color: 'var(--code-yellow)' },
                  !level && !perk.isAbility ? { text: 'Shown at level 1', color: 'var(--code-dark-grey)' } : null,
                  off ? { text: 'Switched off', color: 'var(--code-red)' } : null,
                  perkCurrency(perk, level + 1) && level < perk.maxLevel ? { text: `Levels with ${perkCurrency(perk, level + 1)}`, color: 'var(--code-grey)' } : null,
                ],
                label: perk.isAbility ? 'AXE ABILITY' : 'PERK',
              }}
            />
            <span className="forage-perk-level tabular">{perk.isAbility || perk.maxLevel === 1 ? (level ? 'On' : '') : `${level}/${perk.maxLevel}`}</span>
          </div>
        );
      })}
    </div>
  );
}

function Hives({ hives }) {
  const ready = hives.filter((h) => h.ready).length;
  const next = hives.find((h) => !h.ready);
  return (
    <div className="forage-box">
      <h3 className="forage-h3">Honey hives</h3>
      {hives.length === 0 ? (
        <p className="forage-muted">No hives tapped yet.</p>
      ) : (
        <>
          <p className="forage-big tabular">
            {ready}
            <span className="forage-muted text-base font-normal"> / {hives.length} ready</span>
          </p>
          <p className="forage-muted text-sm">{next ? `Next refills in ${until(next.readyAt)}` : 'All refilled'}</p>
        </>
      )}
    </div>
  );
}

// --------------------------------------------------------------- page

export default function Foraging({ route, onRoute }) {
  const player = route?.player ?? '';
  const { status, report, error } = useReport(player, route?.profile);
  const hotf = useHotf();
  const [retry, setRetry] = useState(0);

  // Only this page uses the Galatea background.
  useEffect(() => {
    document.body.classList.add('forage-bg');
    return () => document.body.classList.remove('forage-bg');
  }, []);

  const f = report?.stats?.foraging;
  const rows = useMemo(() => (f?.gear ? fortuneSources(f) : []), [f]);
  const totals = useMemo(() => rows.reduce((t, r) => ({ fortune: t.fortune + (r.fortune || 0), sweep: t.sweep + (r.sweep || 0) }), { fortune: 0, sweep: 0 }), [rows]);
  const upgrades = useMemo(() => (f ? nextPerks(f, hotf) : []), [f, hotf]);
  const lookUp = (name) => onRoute({ player: name });

  return (
    <div className="forage" key={retry}>
      <div className="forage-layout">
        <aside className="forage-player" aria-label="Player">
          {report ? (
            <>
              <SkinModel uuid={report.player.uuid} name={report.player.name} />
              <div className="forage-nameplate">
                <p className="forage-name">{report.player.name}</p>
                <p className="forage-muted text-sm">{report.profile.name} profile</p>
                <button type="button" className="forage-link" onClick={() => onRoute({ player: report.player.name, page: '' })}>
                  Full profile
                  <ArrowRightIcon size={14} aria-hidden="true" />
                </button>
              </div>
            </>
          ) : (
            <div className="forage-player-empty" aria-hidden="true" />
          )}
        </aside>

        <main className="forage-card">
          <header className="forage-head">
            <div>
              <h1 className="forage-title">Foraging helper</h1>
              <p className="forage-muted">Your Galatea setup, Heart of the Forest and daily progress in one place.</p>
            </div>
            <Search key={player} initial={player} onPlayer={lookUp} />
          </header>

          {!player && <p className="forage-empty">Look up a player to see their foraging setup.</p>}
          {player && status === 'loading' && !report && <div className="forage-skeleton h-96" aria-label="Loading" />}
          {status === 'error' && (
            <div className="forage-section">
              <ErrorNote error={error} onRetry={() => setRetry((n) => n + 1)} />
            </div>
          )}

          {f && (
            <>
              <Headline report={report} f={f} totals={totals} />

              <div className="forage-split">
                <Sources rows={rows} totals={totals} />
                <Section title="Next perks for Fortune and Sweep">
                  {upgrades.length === 0 ? (
                    <p className="forage-muted">{hotf ? 'Every Fortune and Sweep perk is maxed.' : 'Loading the perk tree.'}</p>
                  ) : (
                    <ol className="forage-steps">
                      {upgrades.map((u) => (
                        <li key={u.id}>
                          <span className="font-medium">{u.name}</span>
                          <span className="forage-muted tabular text-sm">
                            {' '}
                            {u.level}/{u.max}
                          </span>
                          <span className="block text-sm forage-gold">{u.gain}</span>
                          {u.currency && <span className="block text-xs forage-muted">Costs {u.currency}</span>}
                        </li>
                      ))}
                    </ol>
                  )}
                </Section>
              </div>

              <Section title="Heart of the Forest">
                <p className="forage-muted mb-4 text-sm">
                  Tier {f.hotf.level}
                  {f.ability ? `, ability ${f.ability.replace(/_/g, ' ')}` : ''}. Hover a perk for what it does at your level.
                </p>
                <PerkTree f={f} hotf={hotf} />
              </Section>

              <div className="forage-grid">
                <div className="forage-box">
                  <h3 className="forage-h3">Today</h3>
                  <p className="forage-big">{f.daily.effect ?? 'No effect'}</p>
                  <p className="forage-muted text-sm">Today's effect, with {int(f.daily.gifts)} tree gifts so far</p>
                </div>
                <div className="forage-box">
                  <h3 className="forage-h3">Tree gifts</h3>
                  <ul className="forage-pairs">
                    {f.gifts.map((g) => (
                      <li key={g.id}>
                        <span>{g.name}</span>
                        <span className="tabular font-semibold">{int(g.count)}</span>
                      </li>
                    ))}
                    {!f.gifts.length && <li className="forage-muted">None yet</li>}
                  </ul>
                </div>
                <div className="forage-box">
                  <h3 className="forage-h3">Starlyn personal bests</h3>
                  <ul className="forage-pairs">
                    {f.starlynBests.map((b) => (
                      <li key={b.id}>
                        <span>{b.name}</span>
                        <span className="tabular font-semibold">{int(b.value)}</span>
                      </li>
                    ))}
                    {!f.starlynBests.length && <li className="forage-muted">No contests yet</li>}
                  </ul>
                </div>
                <Hives hives={f.hives} />
              </div>

              <Section title="Hina's tasks">
                <p className="forage-muted mb-3 text-sm">
                  {f.hina.completed} done, tier {f.hinaTier} claimed. Still open:
                </p>
                {f.hina.tasks.length === 0 ? (
                  <p className="forage-muted">Nothing open right now.</p>
                ) : (
                  <ul className="forage-tasks">
                    {f.hina.tasks.map((t) => {
                      const pct = t.target ? Math.min(1, t.progress / t.target) : null;
                      return (
                        <li key={t.id} className={pct === 1 ? 'is-done' : ''}>
                          <span className="min-w-0 truncate">{t.name}</span>
                          <span className="tabular text-sm">
                            {int(t.progress)}
                            {t.target ? ` / ${int(t.target)}` : ''}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </Section>

              <Section title="Fish family">
                <p className="forage-muted mb-3 text-sm">{f.fishFamily} found.</p>
                <ul className="forage-chips">
                  {f.fish.map((n) => (
                    <li key={n}>{n}</li>
                  ))}
                </ul>
              </Section>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
