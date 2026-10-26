import { coins, num } from '../lib/format.js';

const LABEL = { farming: 'farming fortune', hunting: 'hunting fortune' };

export default function BestValue({ sectionId, picks, onJump }) {
  if (!picks?.length) return null;
  const titleId = `best-value-${sectionId}`;
  return (
    <section className="mb-6 rounded-xl border border-line bg-surface p-5 shadow-panel sm:p-6" aria-labelledby={titleId}>
      <h2 id={titleId} className="text-lg font-semibold tracking-tight">
        Cheapest {LABEL[sectionId]} per coin
      </h2>
      <p className="mt-1 max-w-[65ch] text-sm text-muted">
        Always-on {LABEL[sectionId]} you can buy right now, sorted by coins per point.
      </p>
      <ol className="mt-4 grid gap-x-8 md:grid-cols-2">
        {picks.map((p, i) => (
          <li key={p.id}>
            <button
              type="button"
              onClick={() => onJump(p.id)}
              className="grid w-full grid-cols-[1.5rem_minmax(0,1fr)_auto] items-baseline gap-3 rounded-lg py-2.5 text-left transition-colors hover:bg-surface-2 md:px-2"
            >
              <span className="font-mono text-sm text-muted tabular">{i + 1}</span>
              <span className="min-w-0">
                <span className="block truncate font-medium">{p.name}</span>
                <span className="block truncate text-xs text-muted">{p.group}</span>
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
