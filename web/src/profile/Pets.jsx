import { useState } from 'react';
import { coins, int } from '../lib/format.js';
import { prettyId } from '../../../shared/analyze/helpers.js';
import { ItemSlot } from '../mc.jsx';
import { Bar, Chip, Empty, Stat, StatGrid, rarityClass, rarityLabel } from '../ui.jsx';

export default function Pets({ stats }) {
  const p = stats.pets;
  const [maxedOnly, setMaxedOnly] = useState(false);
  if (!p.list.length) return <Empty>No pets on this profile.</Empty>;
  const list = maxedOnly ? p.list.filter((x) => x.level >= x.maxLevel) : p.list;
  return (
    <div className="fade-in flex flex-col gap-6">
      <StatGrid>
        <Stat label="Pets" value={p.list.length} sub={`${p.unique} unique`} accent />
        <Stat label="Max level" value={p.maxed} />
        <Stat label="Pet score" value={p.score ?? '-'} sub="Highest reached" />
        <Stat label="Pet XP gained" value={p.totalXp ? coins(p.totalXp) : '-'} />
      </StatGrid>
      <div>
        <Chip active={maxedOnly} onClick={() => setMaxedOnly((v) => !v)}>
          Max level only
        </Chip>
      </div>
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {list.map((pet, i) => (
          <li
            key={`${pet.type}-${pet.tier}-${i}`}
            className={`border bg-surface p-3 shadow-panel ${pet.active ? 'outline outline-[var(--px)] outline-[var(--code-yellow)]' : ''}`}
          >
            <div className="flex items-center gap-3">
              <ItemSlot
                id={`PET_${pet.type}_${pet.tier}`}
                rarity={pet.tier}
                tooltip={{
                  name: `[Lvl ${pet.level ?? '?'}] ${pet.name}`,
                  rarity: pet.tier,
                  lines: [
                    `${int(pet.exp)} XP`,
                    pet.heldItem ? `Held item: ${prettyId(pet.heldItem.replace(/^PET_ITEM_/, ''))}` : null,
                    pet.skin ? `Skin: ${prettyId(pet.skin)}` : null,
                    pet.active ? { text: 'Active pet', color: 'var(--code-green)' } : null,
                  ],
                  label: `${rarityLabel(pet.tier).toUpperCase()} PET`,
                }}
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <span className={`truncate font-semibold ${rarityClass(pet.tier)}`}>{pet.name}</span>
                  <span className="shrink-0 font-mono text-sm tabular">
                    {pet.level != null ? `Lvl ${pet.level}` : '?'}
                    <span className="text-muted">/{pet.maxLevel}</span>
                  </span>
                </div>
                <div className="mt-0.5 text-sm text-muted">
                  {rarityLabel(pet.tier)}
                  {pet.active && <span className="ml-2 text-accent">Active</span>}
                  {pet.skin && <span className="ml-2">Skin: {prettyId(pet.skin)}</span>}
                </div>
              </div>
              {pet.heldItem && <ItemSlot id={pet.heldItem} />}
            </div>
            <Bar value={pet.level != null ? pet.level / pet.maxLevel : 0} gold={pet.level >= pet.maxLevel} className="mt-3" />
            <div className="mt-2 flex justify-between gap-2 text-sm text-muted">
              <span className="truncate">{pet.heldItem ? prettyId(pet.heldItem.replace(/^PET_ITEM_/, '')) : 'No item'}</span>
              <span className="font-mono tabular">{int(pet.exp)} XP</span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
