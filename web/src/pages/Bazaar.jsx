import { ArrowClockwiseIcon } from '@phosphor-icons/react';
import { useMemo, useState } from 'react';
import { prettyId } from '../../../shared/analyze/helpers.js';
import { ago, coins, int, num } from '../lib/format.js';
import { invalidate, loadBazaar, loadItems } from '../lib/data.js';
import { useLoad } from '../lib/useLoad.js';
import { ItemSlot, itemCard } from '../mc.jsx';
import { Chip, ErrorNote, Loading, SearchInput, SortTh, rarityClass } from '../ui.jsx';

const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];
const CATS = [
  ['all', 'All', () => true],
  ['ench', 'Enchantments', (id) => id.startsWith('ENCHANTMENT_')],
  ['ess', 'Essence', (id) => id.startsWith('ESSENCE_')],
  ['shard', 'Shards', (id) => id.startsWith('SHARD_')],
  ['gem', 'Gemstones', (id) => /_GEM$/.test(id)],
  ['ench_item', 'Enchanted items', (id) => id.startsWith('ENCHANTED_')],
  ['other', 'Other', (id) => !/^(ENCHANTMENT_|ESSENCE_|SHARD_|ENCHANTED_)|_GEM$/.test(id)],
];

function nameFor(id, items) {
  const known = items.get(id)?.name;
  if (known) return known;
  const ench = id.match(/^ENCHANTMENT_(ULTIMATE_)?(.+)_(\d+)$/);
  if (ench) return `${prettyId(ench[2])} ${ROMAN[ench[3]] ?? ench[3]}`;
  return prettyId(id.replace(/^SHARD_/, '').replace(/^ESSENCE_/, '')) + (id.startsWith('ESSENCE_') ? ' Essence' : id.startsWith('SHARD_') ? ' Shard' : '');
}

async function loadAll() {
  const [bz, items] = await Promise.all([loadBazaar(), loadItems().catch(() => new Map())]);
  return { bz, items };
}

export default function Bazaar() {
  const { data, error, loading, reload } = useLoad(loadAll);
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('all');
  const [tax, setTax] = useState(1.25);
  const [minVol, setMinVol] = useState(1000);
  const [sort, setSort] = useState({ key: 'hourlyProfit', dir: -1 });
  const [limit, setLimit] = useState(100);

  const rows = useMemo(() => {
    if (!data) return [];
    return Object.values(data.bz.products ?? {}).map((p) => {
      const qs = p.quick_status ?? {};
      const buy = qs.buyPrice ?? 0;
      const sell = qs.sellPrice ?? 0;
      // Flip: buy order just above the top bid, sell offer just below the lowest ask.
      const margin = buy > 0 && sell > 0 ? buy - sell - buy * (tax / 100) : 0;
      const hourly = Math.min(qs.buyMovingWeek ?? 0, qs.sellMovingWeek ?? 0) / 168;
      return {
        id: p.product_id,
        name: nameFor(p.product_id, data.items),
        buy,
        sell,
        margin,
        marginPct: sell > 0 ? (margin / sell) * 100 : 0,
        buyWeek: qs.buyMovingWeek ?? 0,
        sellWeek: qs.sellMovingWeek ?? 0,
        hourly,
        hourlyProfit: margin > 0 ? margin * hourly : 0,
      };
    });
  }, [data, tax]);

  const shown = useMemo(() => {
    const test = CATS.find((c) => c[0] === cat)[2];
    const needle = q.trim().toLowerCase();
    return rows
      .filter(
        (r) =>
          test(r.id) && (!needle || r.name.toLowerCase().includes(needle) || r.id.toLowerCase().includes(needle)) && Math.min(r.buyWeek, r.sellWeek) >= minVol,
      )
      .sort((a, b) => {
        const k = sort.key;
        const av = a[k];
        const bv = b[k];
        return typeof av === 'string' ? sort.dir * av.localeCompare(bv) : sort.dir * (av - bv);
      });
  }, [rows, cat, q, minVol, sort]);

  const refresh = () => {
    invalidate('bazaar');
    reload();
  };

  return (
    <div className="fade-in pt-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-3 text-2xl font-bold text-[var(--code-yellow)]">
            <ItemSlot id="BAZAAR" tooltip={false} />
            Bazaar
          </h1>
          <p className="mt-1 max-w-[70ch] text-sm text-muted">
            Live instant-buy and instant-sell prices for every product. Flip margin assumes a buy order at the top bid and a sell offer at the lowest ask, minus
            bazaar tax.
            {data && ` Updated ${ago(data.bz.lastUpdated)}.`}
          </p>
        </div>
        <button type="button" onClick={refresh} className="mc-btn mc-btn-sm">
          <ArrowClockwiseIcon size={16} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <SearchInput value={q} onChange={setQ} placeholder="Search products" className="w-full sm:w-64" />
        <label className="flex items-center gap-2 text-sm text-muted">
          Tax
          <select value={tax} onChange={(e) => setTax(Number(e.target.value))} className="h-9 px-2">
            <option value={1.25}>1.25%</option>
            <option value={1.125}>1.125%</option>
            <option value={1}>1%</option>
          </select>
        </label>
        <label className="flex items-center gap-2 text-sm text-muted">
          Min weekly volume
          <select value={minVol} onChange={(e) => setMinVol(Number(e.target.value))} className="h-9 px-2">
            {[0, 1000, 10000, 100000, 1000000].map((v) => (
              <option key={v} value={v}>
                {v ? int(v) : 'Any'}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="scroll-x -mx-1 mt-3 flex gap-1.5 px-1">
        {CATS.map(([id, label]) => (
          <Chip key={id} active={cat === id} onClick={() => setCat(id)}>
            {label}
          </Chip>
        ))}
      </div>

      <div className="mt-5">
        {loading && !data && <Loading />}
        {error && <ErrorNote error={error} onRetry={refresh} />}
        {data && (
          <div className="border border-line bg-surface p-2 shadow-panel">
            <div className="scroll-x">
              <table className="w-full min-w-[820px] text-sm">
                <thead>
                  <tr className="text-sm">
                    <SortTh id="name" sort={sort} setSort={setSort}>
                      Product
                    </SortTh>
                    <SortTh id="buy" sort={sort} setSort={setSort} align="right">
                      Instant buy
                    </SortTh>
                    <SortTh id="sell" sort={sort} setSort={setSort} align="right">
                      Instant sell
                    </SortTh>
                    <SortTh id="margin" sort={sort} setSort={setSort} align="right">
                      Flip margin
                    </SortTh>
                    <SortTh id="marginPct" sort={sort} setSort={setSort} align="right">
                      Margin %
                    </SortTh>
                    <SortTh id="hourly" sort={sort} setSort={setSort} align="right">
                      Sold / hour
                    </SortTh>
                    <SortTh id="hourlyProfit" sort={sort} setSort={setSort} align="right">
                      Margin × volume / h
                    </SortTh>
                  </tr>
                </thead>
                <tbody>
                  {shown.slice(0, limit).map((r) => (
                    <tr key={r.id}>
                      <td className="px-2 py-1">
                        <span className="flex items-center gap-3">
                          <ItemSlot
                            id={r.id}
                            tooltip={itemCard({
                              id: r.id,
                              name: r.name,
                              rarity: data.items.get(r.id)?.tier,
                              lines: [
                                { text: `Instant buy: ${num(r.buy, 1)}`, color: 'var(--code-gold)' },
                                { text: `Instant sell: ${num(r.sell, 1)}`, color: 'var(--code-gold)' },
                                {
                                  text: `Flip margin: ${num(r.margin, 1)} (${num(r.marginPct, 1)}%)`,
                                  color: r.margin > 0 ? 'var(--code-green)' : 'var(--code-red)',
                                },
                                `Sold per hour: ${int(r.hourly)}`,
                              ],
                            })}
                          />
                          <span className={`font-semibold ${rarityClass(data.items.get(r.id)?.tier)}`}>{r.name}</span>
                        </span>
                      </td>
                      <td className="px-3 py-1 text-right text-warn tabular">{num(r.buy, 1)}</td>
                      <td className="px-3 py-1 text-right text-warn tabular">{num(r.sell, 1)}</td>
                      <td className={`px-3 py-1 text-right tabular ${r.margin > 0 ? 'text-accent' : 'text-danger'}`}>{num(r.margin, 1)}</td>
                      <td className={`px-3 py-1 text-right tabular ${r.marginPct > 0 ? 'text-accent' : 'text-danger'}`}>{num(r.marginPct, 1)}%</td>
                      <td className="px-3 py-1 text-right tabular">{int(r.hourly)}</td>
                      <td className="px-3 py-1 text-right text-warn tabular">{coins(r.hourlyProfit)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 px-2 pt-3 pb-1 text-sm text-muted">
              <span>
                {shown.length} of {rows.length} products
              </span>
              {shown.length > limit && (
                <button type="button" onClick={() => setLimit((l) => l + 150)} className="mc-btn mc-btn-sm">
                  Show more
                </button>
              )}
            </div>
          </div>
        )}
        <p className="mt-4 max-w-[75ch] text-xs leading-relaxed text-muted">
          "Margin × volume" is the margin times the slower side of the hourly volume. It shows where money moves, not what one player will make: you compete
          with every other flipper for those orders.
        </p>
      </div>
    </div>
  );
}
