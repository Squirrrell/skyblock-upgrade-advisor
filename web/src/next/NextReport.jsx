// The new design's page frame: floating top bar, profile header and section
// tabs. Only Farming is redesigned so far; the other tabs open in the classic
// Minecraft design.
import { ArrowClockwiseIcon, ArrowUpRightIcon, ChartBarIcon, MagnifyingGlassIcon } from '@phosphor-icons/react';
import { IconContext } from '@phosphor-icons/react';
import { useEffect, useState } from 'react';
import { openCount, TABS } from '../components/Report.jsx';
import { ago } from '../lib/format.js';
import Farming from './Farming.jsx';
import './next.css';

const MODE_LABEL = { ironman: 'Ironman', island: 'Stranded', bingo: 'Bingo' };

function TopBar({ onHome, onSearch, onClassic }) {
  const [value, setValue] = useState('');
  return (
    <header className="nx-topbar">
      <button type="button" className="nx-brand" onClick={onHome}>
        <span className="nx-brand-mark">
          <ChartBarIcon size={15} weight="fill" />
        </span>
        <span className="hidden sm:inline">SkyBlock Advisor</span>
      </button>
      <form
        className="nx-search"
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          if (value.trim()) onSearch(value.trim());
        }}
      >
        <MagnifyingGlassIcon size={15} weight="regular" aria-hidden="true" />
        <label htmlFor="nx-player" className="sr-only">
          Look up a player
        </label>
        <input id="nx-player" value={value} onChange={(e) => setValue(e.target.value)} placeholder="Look up a player" autoComplete="off" spellCheck="false" />
      </form>
      <button type="button" className="nx-btn nx-btn-ghost nx-btn-sm shrink-0" onClick={() => onClassic()}>
        <span className="sm:hidden">Classic</span>
        <span className="hidden sm:inline">Classic design</span>
      </button>
    </header>
  );
}

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
          <ArrowClockwiseIcon size={15} weight="regular" className={refreshing ? 'animate-spin' : ''} />
          {refreshing ? 'Refreshing' : 'Refresh'}
        </button>
        <a href={`https://sky.shiiyu.moe/stats/${player.name}/${profile.name}`} target="_blank" rel="noreferrer" className="nx-btn nx-btn-ghost">
          SkyCrypt
          <ArrowUpRightIcon size={14} weight="regular" />
        </a>
      </div>
    </section>
  );
}

function SectionTabs({ report, onClassic }) {
  return (
    <nav className="nx-rise mt-8" style={{ '--i': 1 }} aria-label="Profile sections">
      <div className="nx-tabs" role="tablist">
        {TABS.map((t) => {
          const active = t.id === 'farming';
          const open = t.section ? openCount(report.sections[t.section]) : 0;
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={active}
              className="nx-tab"
              onClick={() => !active && onClassic(t.id)}
              title={active ? undefined : 'Opens in the classic design for now'}
            >
              {t.label}
              {open > 0 && <span className="nx-tab-count nx-num">{open}</span>}
            </button>
          );
        })}
      </div>
      <p className="nx-faint mt-2 px-1 text-[12px]">Preview: only Farming uses the new design so far. Other tabs open in the classic design.</p>
    </nav>
  );
}

export function NextSkeleton() {
  return (
    <div className="mx-auto w-full max-w-[1240px] px-4 pt-10 sm:px-6">
      <div className="flex items-center gap-5">
        <div className="nx-skeleton size-16 rounded-[18px]" />
        <div className="flex flex-col gap-2">
          <div className="nx-skeleton h-3 w-40" />
          <div className="nx-skeleton h-8 w-56" />
        </div>
      </div>
      <div className="mt-10 grid gap-4 lg:grid-cols-12">
        <div className="nx-skeleton h-72 lg:col-span-7" />
        <div className="nx-skeleton h-72 lg:col-span-5" />
      </div>
    </div>
  );
}

export default function NextReport({ report, loading, refreshing, onRefresh, onPickProfile, onSearch, onClassic, onHome }) {
  useEffect(() => {
    document.documentElement.classList.add('nx-root');
    return () => document.documentElement.classList.remove('nx-root');
  }, []);

  return (
    <IconContext.Provider value={{ size: 16, weight: 'regular' }}>
      <div className="nx">
        <TopBar onHome={onHome} onSearch={onSearch} onClassic={onClassic} />
        {!report && loading ? (
          <NextSkeleton />
        ) : (
          <main className={`mx-auto w-full max-w-[1240px] px-4 pb-32 sm:px-6 ${refreshing ? 'opacity-70' : ''} transition-opacity duration-300`}>
            <ProfileHeader report={report} refreshing={refreshing} onRefresh={onRefresh} onPickProfile={onPickProfile} />
            <SectionTabs report={report} onClassic={onClassic} />
            <div className="mt-6">
              <Farming report={report} stats={report.stats} />
            </div>
            <footer className="nx-faint mt-20 max-w-[72ch] text-[13px]">
              Numbers come from the Hypixel API and the community SkyBlock wiki, and can lag behind game patches. Prices are bazaar instant-buy and lowest BIN.
            </footer>
          </main>
        )}
      </div>
    </IconContext.Provider>
  );
}
