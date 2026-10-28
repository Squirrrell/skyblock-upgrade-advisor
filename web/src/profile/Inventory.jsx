import { useMemo, useState } from 'react';
import { coins, valueLines } from '../lib/format.js';
import { prettyId } from '../../../shared/analyze/helpers.js';
import { enchantName } from '../../../shared/stats/networth.js';
import { ItemSlot, mcText } from '../mc.jsx';
import { Chip, Empty, Panel, SearchInput, rarityClass, rarityLabel } from '../ui.jsx';

const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];
const enchantText = (e) =>
  Object.entries(e ?? {})
    .map(([k, v]) => `${enchantName(k)} ${ROMAN[v] ?? v}`)
    .join(', ');

function ItemRow({ item }) {
  const [open, setOpen] = useState(false);
  const enchants = enchantText(item.enchantments);
  const tags = [
    item.reforge && prettyId(item.reforge),
    item.recombobulated && 'Recombobulated',
    // Older reports have a plain star count.
    typeof item.stars === 'number' ? item.stars > 0 && `${item.stars}✪` : item.stars,
    item.hotPotato > 0 && `${item.hotPotato} potato books`,
    item.gems > 0 && `${item.gems} gem${item.gems === 1 ? '' : 's'}`,
  ].filter(Boolean);
  const hasMore = enchants || tags.length;
  return (
    <li>
      <button
        type="button"
        disabled={!hasMore}
        onClick={() => setOpen((o) => !o)}
        aria-expanded={hasMore ? open : undefined}
        className="flex w-full items-center justify-between gap-3 px-1 py-1 text-left text-sm enabled:hover:bg-white/10"
      >
        <ItemSlot
          id={item.id}
          hint={{ skull: item.skull, mat: item.mat, color: item.color }}
          rarity={item.rarity}
          count={item.count}
          glint={Boolean(enchants)}
          focusable={false}
          tooltip={{
            name: item.rawName ?? item.name,
            rarity: item.rarity,
            lines: [
              enchants ? { text: enchants, color: 'var(--code-blue)' } : null,
              ...tags,
              ...valueLines(item),
            ],
            label: item.rarity ? rarityLabel(item.rarity).toUpperCase() : undefined,
          }}
        />
        <span className="min-w-0 flex-1 truncate">
          <span className={`font-semibold ${rarityClass(item.rarity)}`}>{mcText(item.rawName ?? item.name)}</span>
          {item.count > 1 && <span className="ml-1 text-muted">x{item.count}</span>}
          {tags.length > 0 && <span className="ml-2 hidden text-xs text-muted sm:inline">{tags.slice(0, 2).join(' · ')}</span>}
        </span>
        <span className="shrink-0 text-sm text-warn tabular">{item.value ? coins(item.value) : ''}</span>
      </button>
      {open && hasMore && (
        <div className="px-1 pb-3 pl-[calc(var(--slot)+1rem)] text-sm leading-relaxed text-muted">
          {tags.length > 0 && <p>{tags.join(' · ')}</p>}
          {enchants && <p className="mt-1">{enchants}</p>}
          <p className="mt-1 font-mono">{item.id}</p>
        </div>
      )}
    </li>
  );
}

export default function Inventory({ stats }) {
  const groups = stats.inventory;
  const [where, setWhere] = useState('ALL');
  const [q, setQ] = useState('');
  const [sort, setSort] = useState('slot');

  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return groups
      .filter((g) => where === 'ALL' || g.location === where)
      .map((g) => {
        let items = needle
          ? g.items.filter(
              (i) => i.name.toLowerCase().includes(needle) || i.id.toLowerCase().includes(needle) || enchantText(i.enchantments).toLowerCase().includes(needle),
            )
          : g.items;
        if (sort === 'value') items = [...items].sort((a, b) => (b.value ?? 0) - (a.value ?? 0));
        return { ...g, items, total: g.items.reduce((n, i) => n + (i.value ?? 0), 0) };
      })
      .filter((g) => g.items.length);
  }, [groups, where, q, sort]);

  if (stats.accessories.apiOff) return <Empty>The inventory API is off for this profile. Turn it on in SkyBlock settings under API settings.</Empty>;

  return (
    <div className="fade-in flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-3">
        <SearchInput value={q} onChange={setQ} placeholder="Search items or enchants" className="w-full sm:w-72" />
        <select value={sort} onChange={(e) => setSort(e.target.value)} className="h-9 px-2 text-sm" aria-label="Sort items">
          <option value="slot">In slot order</option>
          <option value="value">Most valuable first</option>
        </select>
      </div>
      <div className="scroll-x -mx-1 flex gap-1.5 px-1">
        <Chip active={where === 'ALL'} onClick={() => setWhere('ALL')}>
          Everything
        </Chip>
        {groups.map((g) => (
          <Chip key={g.location} active={where === g.location} onClick={() => setWhere(g.location)}>
            {g.location} <span className="font-mono text-xs text-muted">{g.items.length}</span>
          </Chip>
        ))}
      </div>
      {shown.length ? (
        <div className="grid gap-6 lg:grid-cols-2">
          {shown.map((g) => (
            <Panel key={g.location} title={g.location} actions={g.total > 0 && <span className="mc-readout text-sm text-warn tabular">{coins(g.total)}</span>}>
              <ul className="mc-well p-1">
                {g.items.map((item, i) => (
                  <ItemRow key={item.uuid ?? `${item.id}-${i}`} item={item} />
                ))}
              </ul>
            </Panel>
          ))}
        </div>
      ) : (
        <Empty>No items match.</Empty>
      )}
    </div>
  );
}
