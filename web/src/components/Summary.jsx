import { coins, num } from '../lib/format.js';
import { ItemSlot } from '../mc.jsx';
import { Bar } from '../ui.jsx';

function countRows(section, test) {
  return section.groups.reduce((n, g) => n + g.items.filter(test).length, 0);
}

export function remainingCost(section) {
  let total = 0;
  for (const g of section.groups) {
    for (const s of g.items) {
      if (s.status === 'done' || s.tags.includes('alternative')) continue;
      total += s.cost?.total ?? 0;
    }
  }
  return total;
}

function FortuneMetric({ icon, label, totals, cost, big }) {
  const pct = totals.max ? Math.min(1, totals.current / totals.max) : 0;
  return (
    <div className="border border-line bg-surface p-4 shadow-panel">
      <div className="flex items-center gap-3 text-sm text-muted">
        <ItemSlot id={icon} tooltip={false} />
        {label}
      </div>
      <div className="mt-3 flex items-baseline gap-2 tabular">
        <span className={`mc-readout text-accent ${big ? 'text-3xl' : 'text-2xl'}`}>{num(totals.current)}</span>
        <span className="text-muted">/ {num(totals.max)}</span>
      </div>
      <Bar value={pct} className="mt-3" gold={pct >= 1} />
      <p className="mt-3 text-sm text-muted">
        {totals.note}
        {totals.unreadable > 0 && ` ${num(totals.unreadable)} of the max is in sources Hypixel does not share.`}
        {cost > 0 && <span className="text-warn">{` About ${coins(cost)} coins to buy the rest.`}</span>}
      </p>
    </div>
  );
}

export default function Summary({ sections }) {
  const { farming, hunting, consumables } = sections;
  const used = countRows(consumables, (s) => s.unit === 'used' && s.status === 'done');
  const trackable = countRows(consumables, (s) => s.unit === 'used' && s.status !== 'unknown');
  const consumablesCost = remainingCost(consumables);

  return (
    <section className="mt-8 grid gap-4 md:grid-cols-[1.4fr_1fr_1fr]" aria-label="Summary">
      <FortuneMetric icon="WHEAT" label="Farming fortune" totals={farming.totals} cost={remainingCost(farming)} big />
      <FortuneMetric icon="BOW" label="Hunting fortune" totals={hunting.totals} cost={remainingCost(hunting)} />
      <div className="border border-line bg-surface p-4 shadow-panel">
        <div className="flex items-center gap-3 text-sm text-muted">
          <ItemSlot id="POTION" tooltip={false} />
          Consumables
        </div>
        <div className="mt-3 flex items-baseline gap-2 tabular">
          <span className="mc-readout text-2xl text-accent">{used}</span>
          <span className="text-muted">/ {trackable} maxed</span>
        </div>
        <p className="mt-4 text-sm text-muted">
          {trackable - used === 0 ? 'Every tracked consumable is used up.' : `${trackable - used} still to use.`}
          {consumablesCost > 0 && <span className="text-warn">{` About ${coins(consumablesCost)} coins for the rest.`}</span>}
        </p>
      </div>
    </section>
  );
}
