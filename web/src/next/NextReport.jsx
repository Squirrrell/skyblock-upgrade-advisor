// A profile in the new design: the player header, sticky section tabs and
// the selected tab. Farming, hunting and consumables use the new advisor
// layout; the other tabs reuse their views, restyled by bridge.css.
import { ArrowClockwiseIcon, ArrowUpRightIcon, WarningIcon } from '@phosphor-icons/react';
import { lazy, Suspense, useEffect, useRef } from 'react';
import CoopMembers from '../components/CoopMembers.jsx';
import { openCount, TABS } from '../components/Report.jsx';
import { ago } from '../lib/format.js';
import { load, save } from '../lib/storage.js';
import { Loading } from '../ui.jsx';
import { ItemIcon } from './parts.jsx';

const Advisor = lazy(() => import('./Advisor.jsx'));
const MODE_LABEL = { ironman: 'Ironman', island: 'Stranded', bingo: 'Bingo' };

function ProfileHeader({ report, refreshing, onRefresh, onPickProfile }) {
  const { player, profile, profiles, prices } = report;
  const mode = MODE_LABEL[profile.gameMode];
  return (
    <section className="nx-rise flex flex-col gap-6 pt-10 sm:flex-row sm:items-end sm:justify-between">
      <div className="flex min-w-0 items-center gap-5">
        <img
          src={`https://mc-heads.net/avatar/${player.uuid}/128`}
          alt={`${player.name}'s Minecraft head`}
          width="64"
          height="64"
          className="size-16 shrink-0 rounded-[18px] shadow-[0_0_0_1px_var(--nx-line-strong),0_12px_24px_-12px_rgb(0_0_0/0.6)]"
          style={{ imageRendering: 'pixelated' }}
        />
        <div className="min-w-0">
          <div className="nx-eyebrow">
            {profile.name}
            {mode ? ` · ${mode}` : ''}
            {report.stats ? ` · SkyBlock level ${report.stats.overview.sbLevel}` : ''}
          </div>
          <h1 className="nx-h1 mt-1.5 truncate">{player.name}</h1>
          <p className="nx-faint mt-2 text-[13px]">
            Prices from the bazaar {ago(prices.bazaarUpdatedAt)} and the auction house {ago(prices.auctionsUpdatedAt)}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <label htmlFor="nx-profile" className="sr-only">
          Profile
        </label>
        <select id="nx-profile" value={profile.name} onChange={(e) => onPickProfile(e.target.value)} className="nx-select min-w-44">
          {profiles.map((p) => (
            <option key={p.id} value={p.name}>
              {p.name}
              {p.gameMode !== 'normal' ? ` (${MODE_LABEL[p.gameMode] ?? p.gameMode})` : ''}
              {p.selected ? ' · active' : ''}
            </option>
          ))}
        </select>
        <button type="button" onClick={onRefresh} disabled={refreshing} className="nx-btn">
          <ArrowClockwiseIcon size={15} className={refreshing ? 'animate-spin' : ''} />
          {refreshing ? 'Refreshing' : 'Refresh'}
        </button>
        {[
          ['SkyCrypt', `https://sky.shiiyu.moe/stats/${player.name}/${profile.name}`],
          ['Elite', `https://elitebot.dev/@${player.name}/${profile.name}`],
        ].map(([label, href]) => (
          <a key={label} href={href} target="_blank" rel="noreferrer" className="nx-btn nx-btn-ghost">
            {label}
            <ArrowUpRightIcon size={14} />
          </a>
        ))}
      </div>
    </section>
  );
}

function SectionTabs({ report, tab, onTab }) {
  const listRef = useRef(null);
  // Keep the selected tab visible in the scrolling row (it starts off-screen on phones).
  useEffect(() => {
    const list = listRef.current;
    const el = list?.querySelector('[aria-selected="true"]');
    if (el) list.scrollTo({ left: el.offsetLeft - (list.clientWidth - el.offsetWidth) / 2, behavior: 'smooth' });
  }, [tab.id]);
  return (
    <nav className="nx-tabbar nx-rise" style={{ '--i': 1 }} aria-label="Profile sections">
      <div ref={listRef} className="nx-tabs" role="tablist">
        {TABS.map((t) => {
          const open = t.section ? openCount(report.sections[t.section]) : 0;
          return (
            <button key={t.id} type="button" role="tab" aria-selected={t.id === tab.id} className="nx-tab" onClick={() => onTab(t.id)}>
              <ItemIcon id={t.icon} size={22} />
              {t.label}
              {open > 0 && <span className="nx-tab-count nx-num">{open}</span>}
            </button>
          );
        })}
      </div>
    </nav>
  );
}

export function NextSkeleton() {
  return (
    <div className="pt-10" aria-busy="true" aria-label="Loading profile">
      <div className="flex items-center gap-5">
        <div className="nx-skeleton size-16 rounded-[18px]" />
        <div className="flex flex-col gap-2">
          <div className="nx-skeleton h-3 w-40" />
          <div className="nx-skeleton h-8 w-56" />
        </div>
      </div>
      <div className="nx-skeleton mt-8 h-11 w-full" />
      <div className="mt-6 grid gap-4 lg:grid-cols-12">
        <div className="nx-skeleton h-72 lg:col-span-7" />
        <div className="nx-skeleton h-72 lg:col-span-5" />
      </div>
    </div>
  );
}

export default function NextReport({ report, tab: urlTab, onTab, refreshing, onRefresh, onPickProfile, onViewMember }) {
  const tab = TABS.find((t) => t.id === (urlTab || load('profileTab', 'overview'))) ?? TABS[0];
  const changeTab = (id) => {
    save('profileTab', id);
    onTab(id);
    const top = document.getElementById('nx-tab-panel')?.getBoundingClientRect().top;
    if (top != null && top < 0) window.scrollTo({ top: window.scrollY + top - 150, behavior: 'instant' });
  };
  const View = tab.section ? Advisor : tab.view;

  return (
    <div className={`transition-opacity duration-300 ${refreshing ? 'opacity-70' : ''}`}>
      <ProfileHeader report={report} refreshing={refreshing} onRefresh={onRefresh} onPickProfile={onPickProfile} />
      <div className="nx-rise mt-5" style={{ '--i': 1 }}>
        <CoopMembers report={report} onView={onViewMember} />
      </div>

      {report.warnings.length > 0 && (
        <div className="nx-inset mt-6 flex gap-3 p-4 text-[14px]" role="status">
          <WarningIcon className="nx-coin mt-0.5 shrink-0" size={18} />
          <div className="nx-muted">
            {report.warnings.map((w) => (
              <p key={w}>{w}</p>
            ))}
          </div>
        </div>
      )}

      <SectionTabs report={report} tab={tab} onTab={changeTab} />

      <div id="nx-tab-panel" className="mt-6" role="tabpanel" aria-label={tab.label}>
        <Suspense fallback={<Loading />}>
          <View key={tab.id} report={report} stats={report.stats} sectionId={tab.section} onTab={changeTab} />
        </Suspense>
      </div>
    </div>
  );
}
