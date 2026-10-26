import { coins, num } from '../lib/format.js';

const SECTION_LABEL = { farming: 'Farming', hunting: 'Hunting' };

export default function BestValue({ picks, onJump }) {
  if (!picks.length) return null;
  return (
    <section className="mt-6 rounded-xl border border-line bg-surface p-5 shadow-panel sm:p-6" aria-labelledby="best-value-title">
      <h2 id="best-value-title" className="text-lg font-semibold tracking-tight">
        Cheapest fortune per coin
      </h2>
      <p className="mt-1 max-w-[65ch] text-sm text-muted">Always-on upgrades you can buy right now, sorted by coins per point of fortune.</p>
      <ol className="mt-4 grid gap-x-8 md:grid-cols-2">
        {picks.map((p, i) => (
          <li key={`${p.section}-${p.id}`}>
            <button
              type="button"
              onClick={() => onJump(p.section, p.id)}
              className="grid w-full grid-cols-[1.5rem_minmax(0,1fr)_auto] items-baseline gap-3 rounded-lg py-2.5 text-left transition-colors hover:bg-surface-2 md:px-2"
            >
              <span className="font-mono text-sm text-muted tabular">{i + 1}</span>
              <span className="min-w-0">
                <span className="block truncate font-medium">{p.name}</span>
                <span className="block truncate text-xs text-muted">
                  {SECTION_LABEL[p.section]}, {p.group}
                </span>
              </span>
              <span className="text-right font-mono text-sm tabular">
                <span className="block text-accent">+{num(p.gain)}</span>
                <span className="block text-xs text-muted">
                  {coins(p.total)} ({coins(p.perPoint)}/pt)
                </span>
              </span>
            </button>
          </li>
        ))}
      </ol>
    </section>
  );
}
