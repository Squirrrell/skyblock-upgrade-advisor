import { useMemo, useState } from 'react';
import { coins, int } from '../lib/format.js';
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
            <tr className="border-b border-line text-xs text-muted">
              <th className="px-5 py-2.5 text-left font-medium">Accessory</th>
              <th className="px-3 py-2.5 text-right font-medium">MP</th>
              <th className="px-3 py-2.5 text-right font-medium">Price</th>
              <th className="px-5 py-2.5 text-right font-medium">Coins / MP</th>
            </tr>
          </thead>
          <tbody>
            {rows.slice(0, limit).map((r) => (
              <tr key={r.id} className="border-b border-line/60 last:border-0">
                <td className="px-5 py-2">
                  <span className={`font-medium ${rarityClass(r.tier)}`}>{r.name}</span>
                  {r.upgradeFrom && <span className="ml-2 text-xs text-muted">upgrade from {r.upgradeFrom}</span>}
                </td>
                <td className="px-3 py-2 text-right font-mono tabular">+{r.mp}</td>
                <td className="px-3 py-2 text-right font-mono tabular">{r.price ? coins(r.price) : <span className="text-muted">not sold</span>}</td>
                <td className="px-5 py-2 text-right font-mono text-accent tabular">{r.perMp ? coins(r.perMp) : '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {rows.length > limit && (
        <div className="border-t border-line px-5 py-3">
          <button type="button" onClick={() => setLimit((l) => l + 60)} className="text-sm font-medium text-accent hover:underline">
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

      {a.missing ? <Missing missing={a.missing} /> : <Empty>The missing-accessory list needs the accessory index, which comes with the next site deploy.</Empty>}

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <Panel title="Accessory bag">
          {byRarity.map(([r, list]) => (
            <div key={r} className="mb-4 last:mb-0">
              <h3 className={`mb-1.5 text-xs font-semibold tracking-wide uppercase ${rarityClass(r)}`}>
                {rarityLabel(r)} <span className="font-mono text-muted">{list.length}</span>
              </h3>
              <p className="text-sm leading-relaxed">
                {list.map((x, i) => (
                  <span key={`${x.id}-${i}`}>
                    {x.name}
                    {x.recombobulated && <span className="text-xs text-muted"> (recomb)</span>}
                    {i < list.length - 1 && <span className="text-muted">, </span>}
                  </span>
                ))}
              </p>
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
