import { useMemo } from 'react';
import SourceRow from './SourceRow.jsx';

const ORDER = { missing: 0, partial: 1, unknown: 2, tip: 3, info: 4, done: 5 };

function sortItems(items, sort) {
  if (sort === 'gain') return [...items].sort((a, b) => b.gain - a.gain || ORDER[a.status] - ORDER[b.status]);
  if (sort === 'cost') {
    const c = (s) => (s.cost?.total ? s.cost.total : Infinity);
    return [...items].sort((a, b) => c(a) - c(b));
  }
  return items;
}

export default function SectionView({ section, hideDone, sort }) {
  const groups = useMemo(
    () =>
      section.groups
        .map((g) => ({ ...g, items: sortItems(hideDone ? g.items.filter((s) => s.status !== 'done') : g.items, sort) }))
        .filter((g) => g.items.length > 0),
    [section, hideDone, sort],
  );

  if (!groups.length) {
    return (
      <div className="rounded-xl border border-dashed border-line p-10 text-center text-muted">
        Everything here is finished. Turn off "Hide finished" to see it all.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {groups.map((g, i) => (
        <section
          key={g.id}
          id={`group-${section.id}-${g.id}`}
          style={{ animationDelay: `${Math.min(i, 6) * 40}ms` }}
          className="fade-in rounded-xl border border-line bg-surface px-5 shadow-panel sm:px-6"
          aria-labelledby={`title-${section.id}-${g.id}`}
        >
          <header className="border-b border-line py-4">
            <h3 id={`title-${section.id}-${g.id}`} className="font-semibold tracking-tight">
              {g.title}
            </h3>
            {g.blurb && <p className="mt-1 max-w-[70ch] text-sm text-muted">{g.blurb}</p>}
          </header>
          <ul>
            {g.items.map((item) => (
              <SourceRow key={item.id} item={item} />
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
