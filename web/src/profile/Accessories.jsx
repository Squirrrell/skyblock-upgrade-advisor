// Accessories in two views: what is missing (ranked by coins per magical
// power, with a highest-tier-only option) and what is owned (the bag by
// rarity). Each view has its own search.
import { useMemo, useState } from 'react';
import { coins, int } from '../lib/format.js';
import { load, save } from '../lib/storage.js';
import { ItemSlot } from '../mc.jsx';
import { Chip, Empty, Facts, Panel, SearchInput, Stat, StatGrid, rarityClass, rarityLabel } from '../ui.jsx';

const ORDER = ['MYTHIC', 'LEGENDARY', 'EPIC', 'RARE', 'UNCOMMON', 'COMMON', 'SPECIAL', 'VERY_SPECIAL'];
const matches = (q, ...fields) => !q || fields.some((f) => f?.toLowerCase().includes(q));

function Missing({ missing }) {
  const [q, setQ] = useState('');
  const [onlyPriced, setOnlyPriced] = useState(true);
  const [topOnly, setTopOnly] = useState(() => load('accTopOnly', false));
  const [limit, setLimit] = useState(40);
  const source = topOnly ? missing.topRows ?? [] : missing.rows;
  const query = q.trim().toLowerCase();
  const rows = useMemo(
    () => source.filter((r) => (!onlyPriced || r.price) && matches(query, r.name, r.upgradeFrom)),
    [source, query, onlyPriced],
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
          ? `The top tier of every accessory line you haven't finished, ${source.length} in all, worth ${int(missing.topMp)} magical power over what you have. Sorted by coins per magical power.`
          : `${missing.total} accessories or next upgrades you don't own, worth ${int(missing.totalMp)} magical power. Sorted by coins per magical power, cheapest first.`
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
                            r.upgradeFrom ? `You have ${r.upgradeFrom}` : null,
                          ],
                          label: `${rarityLabel(r.tier).toUpperCase()} ACCESSORY`,
                        }}
                      />
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

function Owned({ a }) {
  const [q, setQ] = useState('');
  const query = q.trim().toLowerCase();
  const byRarity = useMemo(
    () =>
      ORDER.map((r) => [r, a.owned.filter((x) => x.rarity === r && matches(query, x.name, x.enrichment))]).filter(([, l]) => l.length),
    [a.owned, query],
  );
  const shown = byRarity.reduce((n, [, l]) => n + l.length, 0);
  return (
    <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
      <Panel title="Accessory bag" subtitle={`${a.owned.length} accessories, grouped by rarity.`} pad={false}>
        <div className="flex flex-wrap items-center gap-2 px-5 pt-4 pb-3 sm:px-6">
          <SearchInput value={q} onChange={setQ} placeholder="Search your accessories" className="w-full sm:w-64" />
          <span className="ml-auto text-sm text-muted tabular">{shown} shown</span>
        </div>
        <div className="px-5 pb-5 sm:px-6">
          {shown === 0 && <p className="text-sm text-muted">None of your accessories match that search.</p>}
          {byRarity.map(([r, list]) => (
            <section key={r} className="mb-5 last:mb-0">
              <h3 className={`mb-2 text-sm font-bold uppercase ${rarityClass(r)}`}>
                {rarityLabel(r)} <span className="text-muted">{list.length}</span>
              </h3>
              <ul className="grid gap-x-4 gap-y-2 sm:grid-cols-2">
                {list.map((x, i) => (
                  <li key={`${x.id}-${i}`} className="flex min-w-0 items-center gap-3">
                    <ItemSlot
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
                    <span className="min-w-0">
                      <span className={`block truncate text-sm font-semibold ${rarityClass(x.rarity)}`}>{x.name}</span>
                      {(x.recombobulated || x.enrichment) && (
                        <span className="block truncate text-xs text-muted">
                          {[x.recombobulated && 'Recombobulated', x.enrichment && `${x.enrichment} enrichment`].filter(Boolean).join(', ')}
                        </span>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </Panel>
      <Panel title="Power and tuning">
        <Facts rows={[['Unlocked powers', a.unlockedPowers.join(', ') || '-'], ...a.tuning.map((t) => [`Tuning: ${t.stat}`, t.points])]} />
      </Panel>
    </div>
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
