import { coins, num } from '../lib/format.js';
import { ItemSlot } from '../mc.jsx';

const LABEL = { farming: 'farming fortune', hunting: 'hunting fortune' };

export default function BestValue({ sectionId, picks, onJump }) {
  if (!picks?.length) return null;
  const titleId = `best-value-${sectionId}`;
  return (
    <section className="mb-6 border border-line bg-surface p-4 shadow-panel sm:p-5" aria-labelledby={titleId}>
      <h2 id={titleId} className="text-lg font-bold">
        Cheapest {LABEL[sectionId]} per coin
      </h2>
      <p className="mt-1 max-w-[65ch] text-sm text-muted">Always-on {LABEL[sectionId]} you can buy right now, sorted by coins per point.</p>
      <ol className="mc-well mt-4 grid gap-x-4 p-1 md:grid-cols-2">
        {picks.map((p, i) => (
          <li key={p.id}>
            <button
              type="button"
              onClick={() => onJump(p.id)}
              className="grid w-full grid-cols-[1.75rem_auto_minmax(0,1fr)_auto] items-center gap-3 px-2 py-1.5 text-left hover:bg-white/10"
            >
              <span className="text-muted tabular">{i + 1}</span>
              <ItemSlot
                id={p.icon}
                tooltip={{
                  name: p.name,
                  lines: [
                    { text: `+${num(p.gain)} ${LABEL[sectionId]}`, color: 'var(--code-green)' },
                    { text: `Cost: ${coins(p.total)}`, color: 'var(--code-gold)' },
                    `${coins(p.perPoint)} per point`,
                    p.action,
                  ],
                  label: p.group.toUpperCase(),
                }}
              />
              <span className="min-w-0">
                <span className="block truncate text-[var(--code-yellow)]">{p.name}</span>
                <span className="block truncate text-sm text-muted">{p.group}</span>
              </span>
              <span className="text-right text-sm tabular">
                <span className="block text-accent">+{num(p.gain)}</span>
                <span className="block text-warn">
                  {coins(p.total)} <span className="text-muted">({coins(p.perPoint)}/pt)</span>
                </span>
              </span>
            </button>
          </li>
        ))}
      </ol>
    </section>
  );
}
