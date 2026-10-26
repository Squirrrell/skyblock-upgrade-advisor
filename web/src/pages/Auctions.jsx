import { useMemo, useState } from 'react';
import { prettyId } from '../../../shared/analyze/helpers.js';
import { ago, coins } from '../lib/format.js';
import { loadAuctions, loadItems } from '../lib/data.js';
import { useLoad } from '../lib/useLoad.js';
import { Chip, ErrorNote, Loading, SearchInput, rarityClass, rarityLabel } from '../ui.jsx';

const PET = /^PET_(.+)_(COMMON|UNCOMMON|RARE|EPIC|LEGENDARY|MYTHIC)(@MAX)?$/;

async function loadAll() {
  const [snap, items] = await Promise.all([loadAuctions(), loadItems().catch(() => new Map())]);
  const rows = Object.entries(snap.lowest ?? {}).map(([key, price]) => {
    const pet = key.match(PET);
    if (pet) {
      return { key, price, pet: true, rarity: pet[2], name: `${prettyId(pet[1])}${pet[3] ? ' (level 100)' : ''}`, search: `${pet[1]} pet ${pet[2]}`.toLowerCase() };
    }
    const name = items.get(key)?.name ?? prettyId(key);
    return { key, price, pet: false, rarity: null, name, search: `${name} ${key}`.toLowerCase() };
  });
  return { rows, updatedAt: snap.updatedAt, pages: snap.pages };
}

export default function Auctions() {
  const { data, error, loading, reload } = useLoad(loadAll);
  const [q, setQ] = useState('');
  const [kind, setKind] = useState('all');
  const [order, setOrder] = useState('desc');

  const shown = useMemo(() => {
    if (!data) return [];
    const words = q.trim().toLowerCase().split(/\s+/).filter(Boolean);
    return data.rows
      .filter((r) => (kind === 'all' || (kind === 'pets') === r.pet) && words.every((w) => r.search.includes(w)))
      .sort((a, b) => (order === 'desc' ? b.price - a.price : a.price - b.price))
      .slice(0, 120);
  }, [data, q, kind, order]);

  return (
    <div className="fade-in pt-8">
      <h1 className="text-2xl font-semibold tracking-tight">Auction prices</h1>
      <p className="mt-1 max-w-[70ch] text-sm text-muted">
        Lowest buy-it-now price for every item and pet on the auction house.
        {data && ` From a scan of ${data.pages} pages ${ago(data.updatedAt)}.`} Pets list the cheapest at any level, and separately at level 100.
      </p>
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <SearchInput value={q} onChange={setQ} placeholder="Search, e.g. hyperion or golden dragon" className="w-full sm:w-80" />
        <div className="flex gap-1.5">
          {[
            ['all', 'Everything'],
            ['items', 'Items'],
            ['pets', 'Pets'],
          ].map(([id, label]) => (
            <Chip key={id} active={kind === id} onClick={() => setKind(id)}>
              {label}
            </Chip>
          ))}
        </div>
        <select value={order} onChange={(e) => setOrder(e.target.value)} className="h-9 rounded-lg border border-line bg-surface px-2 text-sm" aria-label="Sort by price">
          <option value="desc">Most expensive</option>
          <option value="asc">Cheapest</option>
        </select>
      </div>
      <div className="mt-5">
        {loading && <Loading />}
        {error && <ErrorNote error={error} onRetry={reload} />}
        {data && (
          <ul className="grid gap-x-6 rounded-xl border border-line bg-surface px-4 shadow-panel sm:grid-cols-2 lg:grid-cols-3">
            {shown.map((r) => (
              <li key={r.key} className="flex items-baseline justify-between gap-3 border-b border-line/60 py-2.5 text-sm">
                <span className="min-w-0 truncate">
                  <span className={`font-medium ${r.pet ? rarityClass(r.rarity) : ''}`}>{r.name}</span>
                  {r.pet && <span className="ml-2 text-xs text-muted">{rarityLabel(r.rarity)} pet</span>}
                </span>
                <span className="shrink-0 font-mono tabular">{coins(r.price)}</span>
              </li>
            ))}
            {!shown.length && <li className="col-span-full py-8 text-center text-sm text-muted">Nothing on the auction house matches.</li>}
          </ul>
        )}
      </div>
    </div>
  );
}
