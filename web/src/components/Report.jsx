import { WarningIcon } from '@phosphor-icons/react';
import { useRef, useState } from 'react';
import { load, save } from '../lib/storage.js';
import BestValue from './BestValue.jsx';
import ProfileBar from './ProfileBar.jsx';
import SectionView from './SectionView.jsx';
import Summary from './Summary.jsx';

const TABS = [
  { id: 'farming', label: 'Farming' },
  { id: 'hunting', label: 'Hunting' },
  { id: 'consumables', label: 'Consumables' },
];

function openCount(section) {
  return section.groups.reduce((n, g) => n + g.items.filter((s) => s.status === 'missing' || s.status === 'partial').length, 0);
}

export default function Report({ report, refreshing, onRefresh, onPickProfile }) {
  const [tab, setTab] = useState(() => load('tab', 'farming'));
  const [hideDone, setHideDone] = useState(() => load('hideDone', false));
  const [sort, setSort] = useState('default');

  const panelRef = useRef(null);

  const changeTab = (id, { keepScroll = false } = {}) => {
    setTab(id);
    save('tab', id);
    // If the user is deep in the old list, start the new one from its top.
    const top = panelRef.current?.getBoundingClientRect().top;
    if (!keepScroll && top != null && top < 0) {
      window.scrollTo({ top: window.scrollY + top - 140, behavior: 'instant' });
    }
  };

  const jumpTo = (sectionId, rowId) => {
    changeTab(sectionId, { keepScroll: true });
    // Wait a frame for the tab to render, then scroll to the row's group.
    requestAnimationFrame(() => {
      const group = report.sections[sectionId].groups.find((g) => g.items.some((s) => s.id === rowId));
      document.getElementById(`group-${sectionId}-${group?.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  };

  const section = report.sections[tab] ?? report.sections.farming;

  return (
    <div className={refreshing ? 'opacity-70 transition-opacity' : 'transition-opacity'}>
      <ProfileBar report={report} refreshing={refreshing} onRefresh={onRefresh} onPickProfile={onPickProfile} />

      {report.warnings.length > 0 && (
        <div className="mt-6 flex gap-3 rounded-xl border border-warn/40 bg-surface p-4 text-sm leading-relaxed" role="status">
          <WarningIcon className="mt-0.5 shrink-0 text-warn" size={18} />
          <div>
            {report.warnings.map((w) => (
              <p key={w}>{w}</p>
            ))}
          </div>
        </div>
      )}

      <Summary sections={report.sections} />
      <BestValue picks={report.bestValue} onJump={jumpTo} />

      <div className="sticky top-16 z-10 -mx-4 mt-10 border-b border-line bg-bg/90 px-4 backdrop-blur-md sm:-mx-6 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3 py-3">
          <div role="tablist" aria-label="Report sections" className="flex gap-1 rounded-lg bg-surface-2 p-1">
            {TABS.map((t) => {
              const open = openCount(report.sections[t.id]);
              const active = t.id === section.id;
              return (
                <button
                  key={t.id}
                  role="tab"
                  type="button"
                  aria-selected={active}
                  onClick={() => changeTab(t.id)}
                  className={`inline-flex h-8 items-center gap-2 rounded-md px-3 text-sm font-medium transition-colors ${
                    active ? 'bg-surface text-text shadow-panel' : 'text-muted hover:text-text'
                  }`}
                >
                  {t.label}
                  {open > 0 && <span className="font-mono text-xs text-muted tabular">{open}</span>}
                </button>
              );
            })}
          </div>
          <div className="flex items-center gap-4 text-sm">
            <label className="inline-flex cursor-pointer items-center gap-2 text-muted">
              <input
                type="checkbox"
                checked={hideDone}
                onChange={(e) => {
                  setHideDone(e.target.checked);
                  save('hideDone', e.target.checked);
                }}
                className="size-4 accent-[var(--accent)]"
              />
              Hide finished
            </label>
            <label className="inline-flex items-center gap-2 text-muted">
              Sort
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value)}
                className="h-8 rounded-md border border-line bg-surface px-2 text-text focus:border-accent focus:outline-none"
              >
                <option value="default">By category</option>
                <option value="gain">Biggest gain</option>
                <option value="cost">Cheapest first</option>
              </select>
            </label>
          </div>
        </div>
      </div>

      <div ref={panelRef} className="mt-6" role="tabpanel" aria-label={section.title}>
        <SectionView section={section} hideDone={hideDone} sort={sort} />
      </div>

      <footer className="mt-16 max-w-[75ch] text-sm leading-relaxed text-muted">
        Fortune values follow the community SkyBlock wiki and can lag behind game patches. Rows marked with a question
        mark depend on data Hypixel does not share, so check them in game. Auction prices are the lowest BIN at the last
        scan, and items that are usually upgraded in game are shown at their auction price.
      </footer>
    </div>
  );
}
