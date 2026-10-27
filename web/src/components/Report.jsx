import { WarningIcon } from '@phosphor-icons/react';
import { lazy, Suspense, useRef } from 'react';
import { load, save } from '../lib/storage.js';
import { Loading } from '../ui.jsx';
import { ItemSlot } from '../mc.jsx';
import CoopMembers from './CoopMembers.jsx';
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
const Shards = lazy(() => import('../profile/Shards.jsx'));

export function openCount(section) {
  return section.groups.reduce((n, g) => n + g.items.filter((s) => s.status === 'missing' || s.status === 'partial').length, 0);
}

export const TABS = [
  { id: 'overview', label: 'Overview', icon: 'BOOK_AND_QUILL', view: Overview },
  { id: 'skills', label: 'Skills', icon: 'EXP_BOTTLE', view: Skills },
  { id: 'slayers', label: 'Slayers', icon: 'GOLD_SWORD', view: Slayers },
  { id: 'dungeons', label: 'Dungeons', icon: 'SKULL_ITEM', view: Dungeons },
  { id: 'mining', label: 'Mining & Foraging', icon: 'DIAMOND_PICKAXE', view: Mining },
  { id: 'farming', label: 'Farming', icon: 'WHEAT', view: Advisor, section: 'farming' },
  { id: 'hunting', label: 'Hunting', icon: 'BOW', view: Advisor, section: 'hunting' },
  { id: 'shards', label: 'Shards', icon: 'PRISMARINE_SHARD', view: Shards },
  { id: 'consumables', label: 'Consumables', icon: 'POTION', view: Advisor, section: 'consumables' },
  { id: 'collections', label: 'Collections & Minions', icon: 'PAINTING', view: Collections },
  { id: 'inventory', label: 'Inventory', icon: 'CHEST', view: Inventory },
  { id: 'accessories', label: 'Accessories', icon: 'GOLD_INGOT', view: Accessories },
  { id: 'pets', label: 'Pets', icon: 'BONE', view: Pets },
  { id: 'crimson', label: 'Crimson & Rift', icon: 'BLAZE_POWDER', view: Crimson },
  { id: 'misc', label: 'Events & Misc', icon: 'CAKE', view: Misc },
];

export default function Report({ report, tab: urlTab, onTab, refreshing, onRefresh, onPickProfile, onViewMember }) {
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
      <div className="mt-4">
        <CoopMembers report={report} onView={onViewMember} design="classic" />
      </div>

      {report.warnings.length > 0 && (
        <div className="mc-panel mt-6 flex gap-3 p-4 text-sm leading-relaxed" role="status">
          <WarningIcon className="mt-0.5 shrink-0 text-warn" size={18} />
          <div>
            {report.warnings.map((w) => (
              <p key={w}>{w}</p>
            ))}
          </div>
        </div>
      )}

      <div className="sticky top-[var(--header-h,64px)] z-20 mt-6 bg-[var(--mc-well)] px-1">
        <div ref={tabsRef} role="tablist" aria-label="Profile sections" className="mc-tabs">
          {TABS.map((t) => {
            const active = t.id === tab.id;
            const open = t.section ? openCount(report.sections[t.section]) : 0;
            return (
              <button key={t.id} role="tab" type="button" aria-selected={active} onClick={() => changeTab(t.id)} className="mc-tab text-sm">
                <ItemSlot id={t.icon} tooltip={false} />
                {t.label}
                {open > 0 && <span className="text-[var(--panel-red)] tabular">{open}</span>}
              </button>
            );
          })}
        </div>
      </div>

      <div ref={panelRef} className="mc-window" role="tabpanel" aria-label={tab.label}>
        <Suspense fallback={<Loading />}>
          <View report={report} stats={report.stats} sectionId={tab.section} onTab={changeTab} />
        </Suspense>
      </div>

      <footer className="mt-10 max-w-[75ch] text-sm leading-relaxed text-muted">
        Numbers come from the Hypixel API and the community SkyBlock wiki, and can lag behind game patches. Networth is an estimate from bazaar and lowest-BIN
        prices of base items plus recombobulators, potato books, gems and pet items; enchantments, reforges and stars are not counted.
      </footer>
    </div>
  );
}
