import { useMemo, useState } from 'react';
import { coins, int } from '../lib/format.js';
import { ItemSlot } from '../mc.jsx';
import { Chip, Empty, Facts, Panel, SearchInput, Stat, StatGrid, rarityClass, rarityLabel } from '../ui.jsx';

const ORDER = ['MYTHIC', 'LEGENDARY', 'EPIC', 'RARE', 'UNCOMMON', 'COMMON', 'SPECIAL', 'VERY_SPECIAL'];

function Missing({ missing }) {
  const [q, setQ] = useState('');
  const [onlyPriced, setOnlyPriced] = useState(true);
  const [limit, setLimit] = useState(40);
  const rows = useMemo(
    () => missing.rows.filter((r) => (!onlyPriced || r.price) && (!q || r.name.toLowerCase().includes(q.toLowerCase()))),
    [missing, q, onlyPriced],
  );
  return (
    <Panel
      title="Missing accessories"
      subtitle={`${missing.total} accessories or upgrades you don't own, worth ${int(missing.totalMp)} magical power. Sorted by coins per magical power, cheapest first.`}
      actions={
        <div className="flex flex-wrap gap-2">
          <SearchInput value={q} onChange={setQ} placeholder="Filter" className="w-40" />
          <Chip active={onlyPriced} onClick={() => setOnlyPriced((v) => !v)}>
            Buyable only
          </Chip>
        </div>
      }
      pad={false}
    >
      <div className="scroll-x">
        <table className="w-full min-w-[560px] text-sm">
          <thead>
            <tr className="text-sm">
              <th className="px-3 py-2 text-left">Accessory</th>
              <th className="px-3 py-2 text-right">MP</th>
              <th className="px-3 py-2 text-right">Price</th>
              <th className="px-3 py-2 text-right">Coins / MP</th>
            </tr>
          </thead>
          <tbody>
            {rows.slice(0, limit).map((r) => (
              <tr key={r.id}>
                <td className="px-2 py-1">
                  <span className="flex items-center gap-3">
                    <ItemSlot
                      id={r.id}
                      rarity={r.tier}
                      tooltip={{
                        name: r.name,
                        rarity: r.tier,
                        lines: [
                          { text: `+${r.mp} magical power`, color: 'var(--code-green)' },
                          r.price ? { text: `Price: ${coins(r.price)}`, color: 'var(--code-gold)' } : 'Not for sale',
                          r.upgradeFrom ? `Upgrade from ${r.upgradeFrom}` : null,
                        ],
                        label: `${rarityLabel(r.tier).toUpperCase()} ACCESSORY`,
                      }}
                    />
                    <span className="min-w-0">
                      <span className={`font-bold ${rarityClass(r.tier)}`}>{r.name}</span>
                      {r.upgradeFrom && <span className="ml-2 text-sm text-muted">upgrade from {r.upgradeFrom}</span>}
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

export default function Accessories({ stats }) {
  const a = stats.accessories;
  if (a.apiOff) return <Empty>The inventory API is off for this profile, so accessories can't be read.</Empty>;
  const byRarity = ORDER.map((r) => [r, a.owned.filter((x) => x.rarity === r)]).filter(([, l]) => l.length);
  const recombs = a.owned.filter((x) => x.recombobulated).length;
  const enriched = a.owned.filter((x) => x.enrichment).length;
  return (
    <div className="fade-in flex flex-col gap-6">
      <StatGrid>
        <Stat label="Magical power" value={int(a.magicalPower)} accent />
        <Stat label="Accessories in bag" value={a.owned.length} sub={`${recombs} recombobulated`} />
        <Stat label="Selected power" value={a.selectedPower ?? '-'} sub={`${a.unlockedPowers.length} powers unlocked`} />
        <Stat label="Enrichments" value={enriched} sub={`${a.bagUpgrades} bag upgrades bought`} />
      </StatGrid>

      {a.missing ? (
        <Missing missing={a.missing} />
      ) : (
        <Empty>The missing-accessory list needs the accessory index, which comes with the next site deploy.</Empty>
      )}

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <Panel title="Accessory bag">
          {byRarity.map(([r, list]) => (
            <div key={r} className="mb-4 last:mb-0">
              <h3 className={`mb-1.5 text-sm font-bold uppercase ${rarityClass(r)}`}>
                {rarityLabel(r)} <span className="text-muted">{list.length}</span>
              </h3>
              <div className="flex flex-wrap">
                {list.map((x, i) => (
                  <ItemSlot
                    key={`${x.id}-${i}`}
                    id={x.id}
                    rarity={x.rarity}
                    glint={x.recombobulated}
                    tooltip={{
                      name: x.name,
                      rarity: x.rarity,
                      lines: [
                        x.recombobulated ? { text: 'Recombobulated', color: 'var(--code-gold)' } : null,
                        x.enrichment ? `Enrichment: ${x.enrichment}` : null,
                      ],
                      label: `${rarityLabel(x.rarity).toUpperCase()} ACCESSORY`,
                    }}
                  />
                ))}
              </div>
            </div>
          ))}
        </Panel>
        <Panel title="Power and tuning">
          <Facts rows={[['Unlocked powers', a.unlockedPowers.join(', ') || '-'], ...a.tuning.map((t) => [`Tuning: ${t.stat}`, t.points])]} />
        </Panel>
      </div>
    </div>
  );
}
