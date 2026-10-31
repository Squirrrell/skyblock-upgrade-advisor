// The foraging helper: everything about foraging on Galatea for one player,
// on a frosted card over a Galatea screenshot (day or night with the theme),
// with the player's skin beside it. This page alone uses that look. Four
// sections: an overview with the player's loadout, a Fortune and Sweep
// optimiser, the foraging shards, and tier 8 Heart of the Forest builds.
import { ArrowRightIcon, MagnifyingGlassIcon } from '@phosphor-icons/react';
import { useEffect, useMemo, useState } from 'react';
import { fetchReport } from '../lib/api.js';
import { loadForaging, loadPrices } from '../lib/data.js';
import { coins, int, num, until } from '../lib/format.js';
import { BUILDS, buildProgress } from '../foraging/builds.js';
import { loadHotf, perkCurrency, perkLore, perkValue } from '../foraging/hotf.js';
import { petStats, upgrades } from '../foraging/optimizer.js';
import SkinModel from '../foraging/SkinModel.jsx';
import { ItemSlot, itemCard, mcText } from '../mc.jsx';
import { ErrorNote } from '../ui.jsx';
import '../foraging/foraging.css';

// --------------------------------------------------------------- data

function useReport(player, profile, retry) {
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
  }, [player, profile, retry]);
  return state;
}

/** Resolves `load()` once; undefined while loading, null if it failed. */
function useData(load) {
  const [value, setValue] = useState(undefined);
  useEffect(() => {
    let alive = true;
    load()
      .then((v) => alive && setValue(() => v ?? null))
      .catch(() => alive && setValue(null));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return value;
}

const PERK_GAINS = [
  ['foraging_fortune', (l) => ({ fortune: l * 3, sweep: 0 }), 'Foraging Fortune perk'],
  ['sweep', (l) => ({ fortune: 0, sweep: l }), 'Sweep perk'],
  ['foraging_madness', () => ({ fortune: 50, sweep: 10 }), 'Foraging Madness'],
];

/** Fortune and Sweep from the gear (its lore), the active pet and the Heart of the Forest. */
function totalsOf(f, pet) {
  const g = f.gear;
  const gear = [...g.armor, ...g.equipment, ...(g.axe ? [g.axe] : [])].reduce((t, p) => ({ fortune: t.fortune + p.fortune, sweep: t.sweep + p.sweep }), { fortune: 0, sweep: 0 });
  const perks = [];
  for (const [id, gain, label] of PERK_GAINS) {
    const level = f.perks[id] ?? 0;
    if (level > 0 && !f.disabled.includes(id)) perks.push({ id, label, level, ...gain(level) });
  }
  const perkSum = perks.reduce((t, p) => ({ fortune: t.fortune + p.fortune, sweep: t.sweep + p.sweep }), { fortune: 0, sweep: 0 });
  const petSum = pet?.stats ?? { fortune: 0, sweep: 0 };
  return {
    gear,
    perks,
    perkSum,
    pet: petSum,
    fortune: gear.fortune + perkSum.fortune + petSum.fortune,
    sweep: gear.sweep + perkSum.sweep + petSum.sweep,
  };
}

/** The active pet, with its Fortune and Sweep at its level when it is a foraging pet. */
function activePet(report, db) {
  const p = report.stats.pets.list.find((x) => x.active);
  if (!p) return null;
  const def = db?.pets?.find((d) => d.type === p.type && d.tier === p.tier);
  return { ...p, stats: def ? petStats(def, p.level) : null };
}

// --------------------------------------------------------------- shared pieces

const Section = ({ title, children, className = '', aside }) => (
  <section className={`forage-section ${className}`}>
    <div className="forage-section-head">
      <h2 className="forage-h2">{title}</h2>
      {aside}
    </div>
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

const Chips = ({ value, options, onChange, label }) => (
  <div className="forage-chipset" role="group" aria-label={label}>
    {options.map(([id, text]) => (
      <button key={id} type="button" aria-pressed={value === id} onClick={() => onChange(id)}>
        {text}
      </button>
    ))}
  </div>
);

const plus = (n, digits = 1) => (n ? `+${num(n, digits)}` : '');

// --------------------------------------------------------------- overview

function Headline({ report, f, totals }) {
  const skill = report.stats.skills.list.find((s) => s.id === 'foraging');
  const forest = f.whispers.forest;
  const desert = f.whispers.desert;
  const tiles = [
    { label: 'Foraging', value: skill ? num(skill.exact ?? skill.level, 2) : '-', sub: skill && !skill.maxed ? `${int(skill.toNext)} XP to ${skill.level + 1}` : 'Maxed' },
    { label: 'Heart of the Forest', value: f.hotf.level, sub: `${f.nodes} perks unlocked` },
    { label: 'Foraging Fortune', value: int(totals.fortune), sub: 'Gear, pet and perks', tone: 'gold' },
    { label: 'Sweep', value: num(totals.sweep, 1), sub: 'Gear, pet and perks', tone: 'green' },
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

const ARMOR_SLOTS = [
  ['HELMET', 'Helmet'],
  ['CHESTPLATE', 'Chestplate'],
  ['LEGGINGS', 'Leggings'],
  ['BOOTS', 'Boots'],
];
const EQUIPMENT_SLOTS = [
  ['NECKLACE', 'Necklace'],
  ['CLOAK', 'Cloak'],
  ['BELT', 'Belt'],
  ['GLOVES', 'Gloves or bracelet'],
];

/** One slot of the loadout: the item (or an empty slot) and what it adds. */
function GearSlot({ piece, empty, extra }) {
  if (!piece) {
    return (
      <li className="forage-slot is-empty">
        <span className="mc-slot" aria-hidden="true" />
        <span className="forage-slot-text forage-muted">{empty}</span>
      </li>
    );
  }
  return (
    <li className="forage-slot">
      {extra?.icon ?? <ItemSlot id={piece.id} rarity={piece.rarity} tooltip={itemCard({ id: piece.id, name: piece.rawName ?? piece.name, rarity: piece.rarity, lore: piece.lore })} />}
      <span className="forage-slot-text">
        <span className="block truncate text-sm font-medium">{mcText(piece.rawName ?? piece.name)}</span>
        <span className="forage-slot-stats tabular">
          {piece.fortune ? <span className="forage-gold">{plus(piece.fortune, 2)} Fortune</span> : null}
          {piece.sweep ? <span className="forage-green">{plus(piece.sweep, 2)} Sweep</span> : null}
          {!piece.fortune && !piece.sweep && <span className="forage-muted">{extra?.none ?? 'No foraging stats'}</span>}
        </span>
      </span>
    </li>
  );
}

/** The loadout: armor, equipment, and axe and pet, side by side like the wardrobe; totals beside them. */
function Loadout({ f, totals, pet }) {
  const g = f.gear;
  const byType = (list) => Object.fromEntries(list.map((p) => [p.type === 'BRACELET' ? 'GLOVES' : p.type, p]));
  const armor = byType(g.armor);
  const equipment = byType(g.equipment);
  const petPiece = pet && {
    id: `PET_${pet.type}_${pet.tier}`,
    name: `[Lvl ${pet.level ?? '?'}] ${pet.name}`,
    rarity: pet.tier,
    fortune: pet.stats?.fortune ?? 0,
    sweep: pet.stats?.sweep ?? 0,
  };
  return (
    <Section title="Your foraging loadout">
      <div className="forage-loadout">
        <div className="forage-loadout-col">
          <h3 className="forage-h3">Armor</h3>
          <ul>
            {ARMOR_SLOTS.map(([t, label]) => (
              <GearSlot key={t} piece={armor[t]} empty={`No foraging ${label.toLowerCase()}`} />
            ))}
          </ul>
        </div>
        <div className="forage-loadout-col">
          <h3 className="forage-h3">Equipment</h3>
          <ul>
            {EQUIPMENT_SLOTS.map(([t, label]) => (
              <GearSlot key={t} piece={equipment[t]} empty={`No foraging ${label.toLowerCase()}`} />
            ))}
          </ul>
        </div>
        <div className="forage-loadout-col">
          <h3 className="forage-h3">Axe and pet</h3>
          <ul>
            <GearSlot piece={g.axe} empty="No foraging axe" />
            <GearSlot
              piece={petPiece}
              empty="No active pet"
              extra={{
                icon: petPiece && <ItemSlot id={petPiece.id} rarity={pet.tier} tooltip={itemCard({ id: petPiece.id, name: petPiece.name, rarity: pet.tier, useNeu: false, pet })} />,
                none: 'Not a foraging pet',
              }}
            />
          </ul>
          {g.axe && <p className="forage-note mt-2">The best axe on the profile; the one you hold isn't in the API.</p>}
        </div>
        <div className="forage-totals">
          <div>
            <p className="forage-h3">Foraging Fortune</p>
            <p className="forage-total forage-gold tabular">{num(totals.fortune, 1)}</p>
          </div>
          <div>
            <p className="forage-h3">Sweep</p>
            <p className="forage-total forage-green tabular">{num(totals.sweep, 1)}</p>
          </div>
          <dl className="forage-pairs text-sm">
            <div>
              <dt>Gear</dt>
              <dd className="tabular">
                {num(totals.gear.fortune, 1)} / {num(totals.gear.sweep, 1)}
              </dd>
            </div>
            <div>
              <dt>Pet</dt>
              <dd className="tabular">
                {num(totals.pet.fortune, 1)} / {num(totals.pet.sweep, 1)}
              </dd>
            </div>
            <div>
              <dt>Perks</dt>
              <dd className="tabular">
                {num(totals.perkSum.fortune, 1)} / {num(totals.perkSum.sweep, 1)}
              </dd>
            </div>
          </dl>
          {totals.perks.length > 0 && (
            <ul className="forage-chips mt-3">
              {totals.perks.map((p) => (
                <li key={p.id}>
                  {p.label}
                  {p.id !== 'foraging_madness' ? ` ${p.level}` : ''}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
      <p className="forage-note">
        Gear stats are read from your items. Pet abilities, attribute shards and perks that only work some of the time (Early Bird, Half Full, the daily effect)
        aren't counted.
      </p>
    </Section>
  );
}

const PERK_ICON = (perk, level) => {
  const v = perkValue(perk, 'item', level);
  return typeof v === 'string' ? v : level >= perk.maxLevel ? 'OAK_LOG' : level > 0 ? 'STRIPPED_OAK_LOG' : 'PALE_OAK_BUTTON';
};

/** The Heart of the Forest laid out like the game's menu. With `targets`, a build's perks stand out. */
function PerkTree({ f, hotf, targets }) {
  if (!hotf) return <div className="forage-skeleton h-72" aria-label="Loading the perk tree" />;
  const perks = Object.entries(hotf.perks);
  const rows = Math.max(...perks.map(([, p]) => p.y)) + 1;
  const cols = Math.max(...perks.map(([, p]) => p.x)) + 1;
  return (
    <div className="forage-tree" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`, gridTemplateRows: `repeat(${rows}, auto)` }}>
      {perks.map(([id, perk]) => {
        const level = f.perks[id] ?? 0;
        const target = targets?.[id];
        const off = f.disabled.includes(id);
        const state = level >= perk.maxLevel ? 'maxed' : level > 0 ? 'started' : 'locked';
        const label = target != null ? `${level}/${target}` : perk.isAbility || perk.maxLevel === 1 ? (level ? 'On' : '') : `${level}/${perk.maxLevel}`;
        return (
          <div
            key={id}
            className={`forage-perk is-${state} ${off ? 'is-off' : ''} ${targets ? (target != null ? (level >= target ? 'is-target is-met' : 'is-target') : 'is-dim') : ''}`}
            style={{ gridColumn: perk.x + 1, gridRow: perk.y + 1 }}
          >
            <ItemSlot
              id={PERK_ICON(perk, level)}
              alt={perk.name}
              tooltip={{
                name: perk.name,
                rarity: state === 'maxed' ? 'LEGENDARY' : state === 'started' ? 'UNCOMMON' : 'COMMON',
                card: true,
                lore: perkLore(perk, Math.max(1, target ?? level)),
                lines: [
                  { text: perk.isAbility ? (level ? 'Ability unlocked' : 'Ability, not unlocked') : `Level ${level} / ${perk.maxLevel}`, color: 'var(--code-yellow)' },
                  target != null ? { text: `This build: level ${target}`, color: 'var(--code-green)' } : null,
                  off ? { text: 'Switched off', color: 'var(--code-red)' } : null,
                  perkCurrency(perk, level + 1) && level < perk.maxLevel ? { text: `Levels with ${perkCurrency(perk, level + 1)}`, color: 'var(--code-grey)' } : null,
                ],
                label: perk.isAbility ? 'AXE ABILITY' : 'PERK',
              }}
            />
            <span className="forage-perk-level tabular">{label}</span>
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

function Overview({ report, f, hotf, totals, pet }) {
  return (
    <>
      <Headline report={report} f={f} totals={totals} />
      <Loadout f={f} totals={totals} pet={pet} />

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
              const done = t.target && t.progress >= t.target;
              return (
                <li key={t.id} className={done ? 'is-done' : ''}>
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
  );
}

// --------------------------------------------------------------- optimiser

const KIND = { gear: 'Gear', reforge: 'Reforge', pet: 'Pet', perk: 'Heart of the Forest' };

function Optimiser({ f, db, prices, hotf, report }) {
  const [metric, setMetric] = useState('fortune');
  const [showAll, setShowAll] = useState(false);
  const list = useMemo(() => {
    if (!db || !prices) return null;
    const all = upgrades({ gear: f.gear, perks: f.perks, disabled: f.disabled, pets: report.stats.pets.list, db, price: prices, metric, hotf });
    // The three best-value items per slot keep the list readable.
    const perSlot = {};
    return all.filter((u) => u.kind !== 'gear' || (perSlot[u.slot] = (perSlot[u.slot] ?? 0) + 1) <= 3);
  }, [f, db, prices, metric, hotf, report]);

  if (db === null) return <p className="forage-muted">The foraging item data couldn't be loaded. It comes with the next site update.</p>;
  if (!list) return <div className="forage-skeleton h-80" aria-label="Loading prices" />;
  const shown = showAll ? list : list.slice(0, 12);
  const unit = metric === 'sweep' ? 'Sweep' : 'Fortune';
  return (
    <Section
      title={`Cheapest ways to more ${unit === 'Sweep' ? 'Sweep' : 'Foraging Fortune'}`}
      aside={
        <Chips
          label="Optimise for"
          value={metric}
          onChange={setMetric}
          options={[
            ['fortune', 'Foraging Fortune'],
            ['sweep', 'Sweep'],
          ]}
        />
      }
    >
      {list.length === 0 ? (
        <p className="forage-muted">Nothing left to improve here: every slot, reforge and perk is at its best.</p>
      ) : (
        <>
          <ol className="forage-upgrades">
            {shown.map((u, i) => (
              <li key={u.key}>
                <span className="forage-rank tabular">{i + 1}</span>
                {u.kind === 'perk' ? <ItemSlot id="OAK_LOG" tooltip={false} /> : <ItemSlot id={u.id} rarity={u.tier} />}
                <span className="min-w-0">
                  <span className="block truncate font-medium">{u.name}</span>
                  <span className="block truncate text-xs forage-muted">
                    {KIND[u.kind]}
                    {u.from ? `, replaces ${u.from}` : ''}
                    {u.note ? `. ${u.note}` : ''}
                  </span>
                </span>
                <span className={`forage-gain tabular ${metric === 'sweep' ? 'forage-green' : 'forage-gold'}`}>+{num(u.gain, 1)}</span>
                <span className="forage-cost tabular">
                  {u.cost != null ? (
                    <>
                      <span className="block">{coins(u.cost)}</span>
                      <span className="block text-xs forage-muted">{coins(u.perPoint)} per point</span>
                    </>
                  ) : (
                    <span className="forage-muted text-sm">{u.kind === 'perk' ? 'Whispers' : 'Not for sale now'}</span>
                  )}
                </span>
              </li>
            ))}
          </ol>
          {list.length > shown.length && (
            <button type="button" className="forage-more" onClick={() => setShowAll(true)}>
              Show all {list.length}
            </button>
          )}
        </>
      )}
      <p className="forage-note">
        Ranked by coins per point of {unit}, at today's bazaar and lowest BIN prices. Gear is compared on its base stats, so reforges, gems and enchantments
        carry over separately.
      </p>
    </Section>
  );
}

// --------------------------------------------------------------- shards

/** The effect text of a shard: its lore after the name, up to the first blank line. */
function shardEffect(lore) {
  const out = [];
  for (const l of (lore ?? []).slice(1)) {
    if (!String(l).replace(/§./g, '').trim()) break;
    out.push(l);
  }
  return out;
}

function Shards({ db, prices, report }) {
  const [filter, setFilter] = useState('all');
  const rows = useMemo(() => {
    if (!db) return [];
    const mine = new Map((report.stats.shards?.list ?? []).map((r) => [r.id, r]));
    return db.shards.map((s) => {
      const r = mine.get(s.id);
      const table = db.levelling?.[s.rarity] ?? [];
      const level = r?.level ?? 0;
      const syphoned = r?.syphoned ?? 0;
      const upTo = (n) => table.slice(0, n).reduce((a, b) => a + b, 0);
      const need = level < table.length ? Math.max(0, upTo(level + 1) - syphoned) : 0;
      const each = prices?.(s.id)?.unit ?? null;
      return { ...s, level, max: table.length, owned: r?.owned ?? 0, need, cost: need && each ? need * each : null, each };
    });
  }, [db, prices, report]);
  if (db === null) return <p className="forage-muted">The foraging shard data couldn't be loaded. It comes with the next site update.</p>;
  if (!db) return <div className="forage-skeleton h-80" aria-label="Loading shards" />;
  const shown = rows
    .filter((r) => (filter === 'mine' ? r.level > 0 || r.owned > 0 : filter === 'open' ? r.level < r.max : true))
    .sort((a, b) => (a.cost ?? Infinity) - (b.cost ?? Infinity) || a.name.localeCompare(b.name));
  return (
    <Section
      title="Foraging shards"
      aside={
        <Chips
          label="Show"
          value={filter}
          onChange={setFilter}
          options={[
            ['all', 'All'],
            ['mine', 'Yours'],
            ['open', 'Not maxed'],
          ]}
        />
      }
    >
      <p className="forage-muted mb-4 text-sm">Attribute shards whose effect is about foraging or the foraging islands, cheapest next level first.</p>
      <ul className="forage-shards">
        {shown.map((s) => (
          <li key={s.id}>
            <ItemSlot id={s.id} rarity={s.rarity} count={s.owned} tooltip={itemCard({ id: s.id, name: `${s.name} Shard`, rarity: s.rarity, lore: s.lore })} />
            <span className="min-w-0">
              <span className="block font-medium">
                {s.ability}
                <span className="forage-muted text-xs font-normal"> {s.name} Shard</span>
              </span>
              <span className="block text-xs leading-relaxed">{shardEffect(s.lore).map((l, i) => <span key={i}>{mcText(l)} </span>)}</span>
            </span>
            <span className="forage-shard-level tabular text-right">
              <span className="block font-semibold">
                {s.level}/{s.max}
              </span>
              <span className="block text-xs forage-muted">
                {s.level >= s.max ? 'Maxed' : s.cost != null ? `${s.need} for ${coins(s.cost)}` : `${s.need} to next`}
              </span>
            </span>
          </li>
        ))}
      </ul>
      <p className="forage-note">Effects are shown at level 1. Prices are bazaar instant-buy per shard.</p>
    </Section>
  );
}

// --------------------------------------------------------------- HOTF builds

function Trees({ f, hotf }) {
  const [pick, setPick] = useState(BUILDS[0].id);
  const build = BUILDS.find((b) => b.id === pick);
  const progress = useMemo(() => (hotf ? buildProgress(build, f.perks, hotf) : null), [build, f, hotf]);
  return (
    <Section title="Tier 8 Heart of the Forest builds">
      <p className="forage-muted mb-4 max-w-[65ch] text-sm">
        One build per goal, worked out from what each perk does. No community guide was available to copy from, so treat these as a starting point. Perks are
        listed in the order to level them.
      </p>
      <Chips label="Build" value={pick} onChange={setPick} options={BUILDS.map((b) => [b.id, b.name])} />
      <div className="forage-build">
        <div>
          <p className="mt-4 font-medium">{build.goal}</p>
          {progress && (
            <p className="forage-muted mt-1 text-sm">
              You're <span className="font-semibold forage-green">{Math.round(progress.done * 100)}%</span> of the way there.
            </p>
          )}
          <ol className="forage-build-list">
            {build.perks.map(([id]) => {
              const perk = hotf?.perks?.[id];
              if (!perk) return null;
              const have = f.perks[id] ?? 0;
              const target = progress?.targets?.[id] ?? perk.maxLevel;
              return (
                <li key={id} className={have >= target ? 'is-done' : ''}>
                  <span>{perk.name}</span>
                  <span className="tabular text-sm">{perk.maxLevel === 1 ? (have ? 'Done' : 'Unlock') : `${have}/${target}`}</span>
                </li>
              );
            })}
          </ol>
        </div>
        <PerkTree f={f} hotf={hotf} targets={progress?.targets} />
      </div>
    </Section>
  );
}

// --------------------------------------------------------------- page

const TABS = [
  ['overview', 'Overview'],
  ['optimiser', 'Fortune optimiser'],
  ['shards', 'Shards'],
  ['trees', 'HOTF builds'],
];

export default function Foraging({ route, onRoute }) {
  const player = route?.player ?? '';
  const tab = TABS.some(([id]) => id === route?.tab) ? route.tab : 'overview';
  const [retry, setRetry] = useState(0);
  const { status, report, error } = useReport(player, route?.profile, retry);
  const hotf = useData(loadHotf);
  const db = useData(loadForaging);
  const prices = useData(loadPrices);

  // Only this page uses the Galatea background.
  useEffect(() => {
    document.body.classList.add('forage-bg');
    return () => document.body.classList.remove('forage-bg');
  }, []);

  const f = report?.stats?.foraging;
  const pet = useMemo(() => (report ? activePet(report, db) : null), [report, db]);
  const totals = useMemo(() => (f?.gear ? totalsOf(f, pet) : null), [f, pet]);
  const go = (next) => onRoute({ player, profile: route?.profile, tab, ...next });

  return (
    <div className="forage">
      <div className="forage-layout">
        <aside className="forage-player" aria-label="Player skin">
          {report ? <SkinModel uuid={report.player.uuid} name={report.player.name} /> : <div className="forage-player-empty" aria-hidden="true" />}
        </aside>

        <main className="forage-card">
          <header className="forage-head">
            <div className="min-w-0">
              {report ? (
                <>
                  <h1 className="forage-title">{report.player.name}</h1>
                  <p className="forage-muted flex flex-wrap items-center gap-x-3 text-sm">
                    <span>{report.profile.name} profile, foraging</span>
                    <button type="button" className="forage-link" onClick={() => onRoute({ player: report.player.name, page: '', tab: '' })}>
                      Full profile
                      <ArrowRightIcon size={14} aria-hidden="true" />
                    </button>
                  </p>
                </>
              ) : (
                <>
                  <h1 className="forage-title">Foraging helper</h1>
                  <p className="forage-muted text-sm">Your Galatea setup, Fortune upgrades, shards and Heart of the Forest builds.</p>
                </>
              )}
            </div>
            <Search key={player} initial={player} onPlayer={(name) => onRoute({ player: name, tab })} />
          </header>

          {!player && <p className="forage-empty">Look up a player to see their foraging setup.</p>}
          {player && status === 'loading' && !report && <div className="forage-skeleton h-96" aria-label="Loading" />}
          {status === 'error' && <ErrorNote error={error} onRetry={() => setRetry((n) => n + 1)} />}

          {f && totals && (
            <>
              <nav className="forage-tabs" role="tablist" aria-label="Foraging sections">
                {TABS.map(([id, label]) => (
                  <button key={id} type="button" role="tab" aria-selected={tab === id} onClick={() => go({ tab: id })}>
                    {label}
                  </button>
                ))}
              </nav>
              <div role="tabpanel">
                {tab === 'overview' && <Overview report={report} f={f} hotf={hotf} totals={totals} pet={pet} />}
                {tab === 'optimiser' && <Optimiser f={f} db={db} prices={prices} hotf={hotf} report={report} />}
                {tab === 'shards' && <Shards db={db} prices={prices} report={report} />}
                {tab === 'trees' && <Trees f={f} hotf={hotf} />}
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
