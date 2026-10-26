import { CrosshairIcon, FlaskIcon, PlantIcon } from '@phosphor-icons/react';
import { coins, num } from '../lib/format.js';

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

function FortuneMetric({ icon: Icon, label, totals, cost, big }) {
  const pct = totals.max ? Math.min(100, (totals.current / totals.max) * 100) : 0;
  return (
    <div className="rounded-xl border border-line bg-surface p-5 shadow-panel">
      <div className="flex items-center gap-2 text-sm text-muted">
        <Icon size={16} />
        {label}
      </div>
      <div className="mt-3 flex items-baseline gap-2 font-mono tabular">
        <span className={`${big ? 'text-4xl' : 'text-3xl'} font-medium tracking-tight text-text`}>{num(totals.current)}</span>
        <span className="text-muted">/ {num(totals.max)}</span>
      </div>
      <div className="mt-3 h-1 overflow-hidden rounded-full bg-line">
        <div className="h-full rounded-full bg-accent" style={{ width: `${pct}%` }} />
      </div>
      <p className="mt-3 text-sm text-muted">
        {totals.note}
        {totals.unreadable > 0 && ` ${num(totals.unreadable)} of the max is in sources Hypixel does not share.`}
        {cost > 0 && ` About ${coins(cost)} coins to buy the rest.`}
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
      <FortuneMetric icon={PlantIcon} label="Farming fortune" totals={farming.totals} cost={remainingCost(farming)} big />
      <FortuneMetric icon={CrosshairIcon} label="Hunting fortune" totals={hunting.totals} cost={remainingCost(hunting)} />
      <div className="rounded-xl border border-line bg-surface p-5 shadow-panel">
        <div className="flex items-center gap-2 text-sm text-muted">
          <FlaskIcon size={16} />
          Consumables
        </div>
        <div className="mt-3 flex items-baseline gap-2 font-mono tabular">
          <span className="text-3xl font-medium tracking-tight text-text">{used}</span>
          <span className="text-muted">/ {trackable} maxed</span>
        </div>
        <p className="mt-4 text-sm text-muted">
          {trackable - used === 0 ? 'Every tracked consumable is used up.' : `${trackable - used} still to use.`}
          {consumablesCost > 0 && ` About ${coins(consumablesCost)} coins for the rest.`}
        </p>
      </div>
    </section>
  );
}
