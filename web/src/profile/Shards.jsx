// Every hunting shard on the profile: what is in the Hunting Box, what has
// been syphoned into attributes, and what the held shards would sell for.
import { useMemo, useState } from 'react';
import { coins, date, int, num } from '../lib/format.js';
import { ItemSlot } from '../mc.jsx';
import { Bar, Chip, Empty, Panel, SearchInput, SortTh, Stat, StatGrid, rarityClass, rarityLabel } from '../ui.jsx';

const VIEWS = [
  ['owned', 'In your Hunting Box', (r) => r.owned > 0],
  ['attributes', 'Syphoned into attributes', (r) => r.syphoned > 0],
  ['all', 'Both', () => true],
];
const RARITIES = ['COMMON', 'UNCOMMON', 'RARE', 'EPIC', 'LEGENDARY'];

const SORTS = {
  name: (r) => r.name,
  attribute: (r) => r.level + r.syphoned / 1000,
  owned: (r) => r.owned,
  sell: (r) => r.sell ?? -1,
  value: (r) => r.value,
  rarity: (r) => r.rarityIndex,
};

export default function Shards({ stats }) {
  const s = stats.shards;
  const [view, setView] = useState('owned');
  const [rarity, setRarity] = useState(null);
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState({ key: 'value', dir: -1 });

  const shown = useMemo(() => {
    const test = VIEWS.find(([id]) => id === view)[2];
    const q = query.trim().toLowerCase();
    const key = SORTS[sort.key];
    return s.list
      .filter(test)
      .filter((r) => !rarity || r.rarity === rarity)
      .filter((r) => !q || `${r.name} ${r.attribute ?? ''} ${r.code ?? ''} ${r.family.join(' ')}`.toLowerCase().includes(q))
      .sort((a, b) => {
        const x = key(a);
        const y = key(b);
        return (typeof x === 'string' ? x.localeCompare(y) : x - y) * sort.dir;
      });
  }, [s.list, view, rarity, query, sort]);

  if (!s.list.length) return <Empty>No hunting shards on this profile yet. Shards come from hunting on Galatea and from fusing.</Empty>;

  const top = s.list.find((r) => r.owned > 0);
  return (
    <div className="fade-in flex flex-col gap-6">
      <StatGrid>
        <Stat label="Estimated value" value={coins(s.value)} sub={`${coins(s.buyValue)} to buy them all`} tone="gold" />
        <Stat label="Shards held" value={int(s.owned)} sub={`${s.typesOwned} of ${s.typesTotal} types`} accent />
        <Stat label="Attributes" value={s.attributes} sub={`${s.maxedAttributes} at max level`} />
        <Stat label="Shards fused" value={int(s.fused)} sub={top ? `Most valuable: ${top.name}` : null} />
      </StatGrid>

      <Panel
        title="Hunting shards"
        subtitle={`Held shards valued at bazaar instant-sell, which is what you would get selling them now.${s.unpriced ? ` ${s.unpriced} type${s.unpriced === 1 ? ' has' : 's have'} no bazaar price.` : ''} Syphoned shards are spent, so they only count toward the attribute level.`}
        pad={false}
      >
        <div className="flex flex-col gap-3 px-5 py-4 sm:px-6">
          <div className="flex flex-wrap items-center gap-2">
            {VIEWS.map(([id, label]) => (
              <Chip key={id} active={view === id} onClick={() => setView(id)}>
                {label}
              </Chip>
            ))}
            <SearchInput value={query} onChange={setQuery} placeholder="Find a shard or attribute" className="ml-auto w-full sm:w-64" />
          </div>
          <div className="scroll-x -mx-1 flex gap-1.5 px-1">
            <Chip active={!rarity} onClick={() => setRarity(null)}>
              Any rarity
            </Chip>
            {RARITIES.map((r) => (
              <Chip key={r} active={rarity === r} onClick={() => setRarity(rarity === r ? null : r)}>
                <span className={rarityClass(r)}>{rarityLabel(r)}</span>
              </Chip>
            ))}
          </div>
        </div>

        {shown.length === 0 ? (
          <p className="px-5 pb-6 text-sm text-muted sm:px-6">No shards match. Try another filter.</p>
        ) : (
          <div className="scroll-x px-2 pb-2">
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr>
                  <SortTh id="name" sort={sort} setSort={setSort}>
                    Shard
                  </SortTh>
                  <SortTh id="attribute" sort={sort} setSort={setSort}>
                    Attribute
                  </SortTh>
                  <SortTh id="owned" sort={sort} setSort={setSort} align="right">
                    Held
                  </SortTh>
                  <SortTh id="sell" sort={sort} setSort={setSort} align="right">
                    Each
                  </SortTh>
                  <SortTh id="value" sort={sort} setSort={setSort} align="right">
                    Value
                  </SortTh>
                </tr>
              </thead>
              <tbody>
                {shown.map((r) => (
                  <tr key={r.id}>
                    <td className="px-3 py-2">
                      <span className="flex items-center gap-3">
                        <ItemSlot
                          id={r.id}
                          rarity={r.rarity ?? undefined}
                          count={r.owned}
                          tooltip={{
                            name: r.name,
                            rarity: r.rarity ?? undefined,
                            lines: [
                              r.attribute ? `Attribute: ${r.attribute}` : null,
                              r.family.length ? `Family: ${r.family.join(', ')}` : null,
                              r.alignment ? `Alignment: ${r.alignment}` : null,
                              r.captured ? `Last caught ${date(r.captured)}` : null,
                              r.sell != null ? { text: `Sells for ${num(r.sell, 1)} each`, color: 'var(--code-gold)' } : 'No bazaar price',
                            ],
                            label: r.code ? `${rarityLabel(r.rarity).toUpperCase()} · ${r.code}` : undefined,
                          }}
                        />
                        <span className="min-w-0">
                          <span className={`block font-semibold ${rarityClass(r.rarity)}`}>{r.name}</span>
                          <span className="block text-xs text-muted">
                            {[r.code, r.family.join(', ')].filter(Boolean).join(' · ')}
                          </span>
                        </span>
                      </span>
                    </td>
                    <td className="min-w-48 px-3 py-2">
                      {r.attribute && (
                        <>
                          <div className="flex items-baseline justify-between gap-3">
                            <span>{r.attribute}</span>
                            <span className="text-xs tabular text-muted">
                              {r.maxLevel ? `${r.level}/${r.maxLevel}` : '-'}
                              {r.syphoned ? ` · ${r.syphoned} syphoned` : ''}
                            </span>
                          </div>
                          {r.maxLevel > 0 && <Bar value={r.level / r.maxLevel} gold={r.level >= r.maxLevel} className="mt-1.5" />}
                        </>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right tabular">{r.owned ? int(r.owned) : '-'}</td>
                    <td className="px-3 py-2 text-right text-warn tabular">{r.sell != null ? coins(r.sell) : '-'}</td>
                    <td className="px-3 py-2 text-right font-semibold text-warn tabular">{r.owned && r.sell != null ? coins(r.value) : '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="border-t border-line px-5 py-3 text-sm text-muted sm:px-6">
          {shown.length} of {s.list.length} shard types · {int(s.syphoned)} shards syphoned in total
        </p>
      </Panel>
    </div>
  );
}
