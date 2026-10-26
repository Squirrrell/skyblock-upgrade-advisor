import { WarningIcon } from '@phosphor-icons/react';
import { lazy, Suspense, useRef } from 'react';
import { load, save } from '../lib/storage.js';
import { Loading } from '../ui.jsx';
import ProfileBar from './ProfileBar.jsx';

// Each tab is its own chunk, fetched the first time it opens.
const Overview = lazy(() => import('../profile/Overview.jsx'));
const Skills = lazy(() => import('../profile/Skills.jsx'));
const Slayers = lazy(() => import('../profile/Slayers.jsx'));
const Dungeons = lazy(() => import('../profile/Dungeons.jsx'));
const Mining = lazy(() => import('../profile/Mining.jsx'));
const Collections = lazy(() => import('../profile/Collections.jsx'));
const Inventory = lazy(() => import('../profile/Inventory.jsx'));
const Accessories = lazy(() => import('../profile/Accessories.jsx'));
const Pets = lazy(() => import('../profile/Pets.jsx'));
const Advisor = lazy(() => import('../profile/Advisor.jsx'));
const Crimson = lazy(() => import('../profile/Crimson.jsx'));
const Misc = lazy(() => import('../profile/Misc.jsx'));

function openCount(section) {
  return section.groups.reduce((n, g) => n + g.items.filter((s) => s.status === 'missing' || s.status === 'partial').length, 0);
}

const TABS = [
  { id: 'overview', label: 'Overview', view: Overview },
  { id: 'skills', label: 'Skills', view: Skills },
  { id: 'slayers', label: 'Slayers', view: Slayers },
  { id: 'dungeons', label: 'Dungeons', view: Dungeons },
  { id: 'mining', label: 'Mining & Foraging', view: Mining },
  { id: 'farming', label: 'Farming', view: Advisor, section: 'farming' },
  { id: 'hunting', label: 'Hunting', view: Advisor, section: 'hunting' },
  { id: 'consumables', label: 'Consumables', view: Advisor, section: 'consumables' },
  { id: 'collections', label: 'Collections & Minions', view: Collections },
  { id: 'inventory', label: 'Inventory', view: Inventory },
  { id: 'accessories', label: 'Accessories', view: Accessories },
  { id: 'pets', label: 'Pets', view: Pets },
  { id: 'crimson', label: 'Crimson & Rift', view: Crimson },
  { id: 'misc', label: 'Events & Misc', view: Misc },
];

export default function Report({ report, tab: urlTab, onTab, refreshing, onRefresh, onPickProfile }) {
  const tabsRef = useRef(null);
  const panelRef = useRef(null);
  const tab = TABS.find((t) => t.id === (urlTab || load('profileTab', 'overview'))) ?? TABS[0];

  const changeTab = (id) => {
    save('profileTab', id);
    onTab(id);
    // If the user is deep in the old tab, start the new one from its top.
    const top = panelRef.current?.getBoundingClientRect().top;
    if (top != null && top < 0) window.scrollTo({ top: window.scrollY + top - 170, behavior: 'instant' });
  };

  const View = tab.view;
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

      <div className="sticky top-[105px] z-20 -mx-4 mt-6 border-b border-line bg-bg/90 px-4 backdrop-blur-md sm:-mx-6 sm:px-6 md:top-16">
        <div ref={tabsRef} role="tablist" aria-label="Profile sections" className="scroll-x -mb-px flex gap-1 py-2">
          {TABS.map((t) => {
            const active = t.id === tab.id;
            const open = t.section ? openCount(report.sections[t.section]) : 0;
            return (
              <button
                key={t.id}
                role="tab"
                type="button"
                aria-selected={active}
                onClick={() => changeTab(t.id)}
                className={`inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md px-3 text-sm font-medium whitespace-nowrap transition-colors ${
                  active ? 'bg-surface-2 text-text' : 'text-muted hover:text-text'
                }`}
              >
                {t.label}
                {open > 0 && <span className="font-mono text-xs text-muted tabular">{open}</span>}
              </button>
            );
          })}
        </div>
      </div>

      <div ref={panelRef} className="mt-6" role="tabpanel" aria-label={tab.label}>
        <Suspense fallback={<Loading />}>
          <View report={report} stats={report.stats} sectionId={tab.section} onTab={changeTab} />
        </Suspense>
      </div>

      <footer className="mt-16 max-w-[75ch] text-sm leading-relaxed text-muted">
        Numbers come from the Hypixel API and the community SkyBlock wiki, and can lag behind game patches. Networth is an
        estimate from bazaar and lowest-BIN prices of base items plus recombobulators, potato books, gems and pet items;
        enchantments, reforges and stars are not counted.
      </footer>
    </div>
  );
}
