// Accessories in two views: what is missing (ranked by coins per magical
// power, with a highest-tier-only option) and what is owned (the bag by
// rarity in one grid, with powers and tuning). Each view has its own search.
import { useMemo, useState } from 'react';
import { coins, int } from '../lib/format.js';
import { load, save } from '../lib/storage.js';
import { ItemSlot, tooltipProps } from '../mc.jsx';
import { Chip, Empty, Panel, SearchInput, SortTh, Stat, StatGrid, rarityClass, rarityLabel } from '../ui.jsx';

const ORDER = ['MYTHIC', 'LEGENDARY', 'EPIC', 'RARE', 'UNCOMMON', 'COMMON', 'SPECIAL', 'VERY_SPECIAL'];
// Missing-table columns. Rows without a value (no price) always sort last.
const SORT_KEYS = { name: (r) => r.name, mp: (r) => r.mp, price: (r) => r.price, perMp: (r) => r.perMp };
function sortRows(rows, { key, dir }) {
  const get = SORT_KEYS[key];
  return [...rows].sort((a, b) => {
    const x = get(a);
    const y = get(b);
    if (x == null || y == null) return (x == null) - (y == null);
    return (typeof x === 'string' ? x.localeCompare(y) : x - y) * dir || a.name.localeCompare(b.name);
  });
}

const matches = (q, ...fields) => !q || fields.some((f) => f?.toLowerCase().includes(q));

/** Hover card for a missing accessory: its lore (loaded from NEU), then what it would add and cost. */
function missingDetail(r) {
  return {
    name: r.name,
    rarity: r.tier,
    icon: r.id,
    loreId: r.id,
    lines: [
      { text: `+${r.mp} magical power${r.upgradeFrom ? ` over your ${r.upgradeFrom}` : ''}`, color: 'var(--code-green)' },
      r.price ? { text: `Price: ${int(r.price)} coins (${coins(r.price)})`, color: 'var(--code-gold)' } : { text: 'Not sold on the bazaar or auction house', color: 'var(--code-grey)' },
      r.perMp ? { text: `${coins(r.perMp)} coins per magical power`, color: 'var(--code-gold)' } : null,
    ],
    label: `${rarityLabel(r.tier).toUpperCase()} ACCESSORY`,
  };
}

function Missing({ missing }) {
  const [q, setQ] = useState('');
  const [onlyPriced, setOnlyPriced] = useState(true);
  const [topOnly, setTopOnly] = useState(() => load('accTopOnly', false));
  const [limit, setLimit] = useState(40);
  const source = topOnly ? missing.topRows ?? [] : missing.rows;
  const query = q.trim().toLowerCase();
  // Cheapest coins per magical power first until a column is clicked.
  const [sort, setSort] = useState({ key: 'perMp', dir: 1 });
  const rows = useMemo(
    () => sortRows(source.filter((r) => (!onlyPriced || r.price) && matches(query, r.name, r.upgradeFrom)), sort),
    [source, query, onlyPriced, sort],
  );
  const toggleTop = () => {
    setTopOnly((v) => {
      save('accTopOnly', !v);
      return !v;
    });
    setLimit(40);
  };

  return (
    <Panel
      title="Missing accessories"
      subtitle={
        topOnly
          ? `The top tier of every accessory line you haven't finished, ${source.length} in all, worth ${int(missing.topMp)} magical power over what you have. Click a column to sort by it.`
          : `${missing.total} accessories or next upgrades you don't own, worth ${int(missing.totalMp)} magical power. Click a column to sort by it.`
      }
      pad={false}
    >
      <div className="flex flex-wrap items-center gap-2 px-5 pt-4 pb-3 sm:px-6">
        <SearchInput value={q} onChange={(v) => (setQ(v), setLimit(40))} placeholder="Search missing accessories" className="w-full sm:w-64" />
        <Chip active={topOnly} onClick={toggleTop}>
          Highest tier only
        </Chip>
        <Chip active={onlyPriced} onClick={() => setOnlyPriced((v) => !v)}>
          Buyable only
        </Chip>
        <span className="ml-auto text-sm text-muted tabular">{rows.length} shown</span>
      </div>
      {rows.length === 0 ? (
        <p className="px-5 pb-5 text-sm text-muted sm:px-6">{query ? 'No missing accessory matches that search.' : 'Nothing missing here.'}</p>
      ) : (
        <div className="scroll-x">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="text-sm">
                <SortTh id="name" sort={sort} setSort={setSort}>
                  Accessory
                </SortTh>
                <SortTh id="mp" sort={sort} setSort={setSort} align="right">
                  MP
                </SortTh>
                <SortTh id="price" sort={sort} setSort={setSort} align="right">
                  Price
                </SortTh>
                <SortTh id="perMp" sort={sort} setSort={setSort} align="right">
                  Coins / MP
                </SortTh>
              </tr>
            </thead>
            <tbody>
              {rows.slice(0, limit).map((r) => (
                <tr key={r.id} {...tooltipProps(missingDetail(r))}>
                  <td className="px-2 py-1">
                    <span className="flex items-center gap-3">
                      <ItemSlot id={r.id} rarity={r.tier} tooltip={missingDetail(r)} />
                      <span className="min-w-0">
                        <span className={`font-semibold ${rarityClass(r.tier)}`}>{r.name}</span>
                        {r.upgradeFrom && <span className="ml-2 text-sm text-muted">from {r.upgradeFrom}</span>}
                      </span>
                    </span>
                  </td>
                  <td className="px-3 py-1 text-right text-accent tabular">+{r.mp}</td>
                  <td className="px-3 py-1 text-right text-warn tabular">{r.price ? coins(r.price) : <span className="text-muted">not sold</span>}</td>
                  <td className="px-3 py-1 text-right text-warn tabular">{r.perMp ? coins(r.perMp) : '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {rows.length > limit && (
        <div className="px-5 py-3">
          <button type="button" onClick={() => setLimit((l) => l + 60)} className="mc-btn mc-btn-sm">
            Show more ({rows.length - limit} left)
          </button>
        </div>
      )}
    </Panel>
  );
}

/** "Dec 04, 2024, 11:03 PM" */
const when = (ms) =>
  new Date(ms).toLocaleString('en-US', { month: 'short', day: '2-digit', year: 'numeric', hour: 'numeric', minute: '2-digit' });

/** The detailed card for an owned accessory: its in-game lore, then when it was obtained and its value. */
function detail(x) {
  const base = { name: x.name, rarity: x.rarity, icon: x.id };
  const extras = [
    x.recombobulated ? { text: '(Recombobulated)', color: 'var(--code-grey)' } : null,
    x.obtained ? { text: `Obtained: ${when(x.obtained)}`, color: 'var(--code-red)' } : null,
    x.value ? { text: `Item value: ${int(x.value)} coins (${coins(x.value)})`, color: 'var(--code-gold)' } : null,
  ];
  if (x.lore?.length) return { ...base, lore: x.lore, lines: extras };
  // Older reports without lore fall back to the short tooltip.
  return {
    ...base,
    lines: [x.recombobulated ? { text: 'Recombobulated', color: 'var(--code-gold)' } : null, x.enrichment ? `Enrichment: ${x.enrichment}` : null, ...extras],
    label: `${rarityLabel(x.rarity).toUpperCase()} ACCESSORY`,
  };
}

function Owned({ a }) {
  const [q, setQ] = useState('');
  const query = q.trim().toLowerCase();
  // One grid, highest rarity first; the slot border shows each one's rarity.
  const list = useMemo(() => {
    const rank = (r) => (ORDER.indexOf(r) < 0 ? ORDER.length : ORDER.indexOf(r));
    return a.owned.filter((x) => matches(query, x.name, x.enrichment)).sort((x, y) => rank(x.rarity) - rank(y.rarity) || x.name.localeCompare(y.name));
  }, [a.owned, query]);
  const shown = list.length;
  // Power and tuning sit with the bag they belong to, as one short line.
  const powers = a.unlockedPowers.map((p) => (p === a.selectedPower ? `${p} (selected)` : p));
  return (
    <Panel title="Accessory bag" subtitle={`${a.owned.length} accessories, highest rarity first. Hover one for its name.`} pad={false}>
      <div className="flex flex-col gap-3 px-5 pt-4 pb-3 sm:px-6">
        <div className="flex flex-wrap items-center gap-2">
          <SearchInput value={q} onChange={setQ} placeholder="Search your accessories" className="w-full sm:w-64" />
          <span className="ml-auto text-sm text-muted tabular">{shown} shown</span>
        </div>
        <dl className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
          <div className="flex gap-2">
            <dt className="text-muted">Powers unlocked</dt>
            <dd>{powers.join(', ') || '-'}</dd>
          </div>
          {a.tuning.length > 0 && (
            <div className="flex gap-2">
              <dt className="text-muted">Tuning</dt>
              <dd className="tabular">{a.tuning.map((t) => `${t.stat} ${t.points}`).join(', ')}</dd>
            </div>
          )}
        </dl>
      </div>
      <div className="border-t border-line px-5 py-4 sm:px-6">
        {shown === 0 && <p className="text-sm text-muted">None of your accessories match that search.</p>}
        <ul className="acc-grid flex flex-wrap gap-2">
          {list.map((x, i) => (
            <li key={`${x.id}-${i}`}>
              <ItemSlot
                id={x.id}
                rarity={x.rarity}
                glint={x.recombobulated}
                alt={x.name}
                tooltip={detail(x)}
              />
            </li>
          ))}
        </ul>
      </div>
    </Panel>
  );
}

export default function Accessories({ stats }) {
  const a = stats.accessories;
  const [view, setView] = useState(() => (load('accView', 'missing') === 'owned' ? 'owned' : 'missing'));
  if (a.apiOff) return <Empty>The inventory API is off for this profile, so accessories can't be read.</Empty>;
  const recombs = a.owned.filter((x) => x.recombobulated).length;
  const enriched = a.owned.filter((x) => x.enrichment).length;
  const pick = (v) => {
    setView(v);
    save('accView', v);
  };

  return (
    <div className="fade-in flex flex-col gap-6">
      <StatGrid>
        <Stat label="Magical power" value={int(a.magicalPower)} accent />
        <Stat label="Accessories in bag" value={a.owned.length} sub={`${recombs} recombobulated`} />
        <Stat label="Selected power" value={a.selectedPower ?? '-'} sub={`${a.unlockedPowers.length} powers unlocked`} />
        <Stat label="Enrichments" value={enriched} sub={`${a.bagUpgrades} bag upgrades bought`} />
      </StatGrid>

      <div className="flex flex-wrap gap-2" role="group" aria-label="Accessory view">
        <Chip active={view === 'missing'} onClick={() => pick('missing')}>
          Missing{a.missing ? ` (${a.missing.total})` : ''}
        </Chip>
        <Chip active={view === 'owned'} onClick={() => pick('owned')}>
          Owned ({a.owned.length})
        </Chip>
      </div>

      {view === 'owned' ? (
        <Owned a={a} />
      ) : a.missing ? (
        <Missing missing={a.missing} />
      ) : (
        <Empty>The missing-accessory list needs the accessory index, which comes with the next site deploy.</Empty>
      )}
    </div>
  );
}
