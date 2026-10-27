// The site frame in the new design: a floating top bar with the site's
// pages, player search, icon pack and light/dark switch, around every page.
import { ChartBarIcon, CircleHalfIcon, MagnifyingGlassIcon } from '@phosphor-icons/react';
import { useEffect, useState } from 'react';
import { setIconPack, useIcons } from '../lib/icons.js';
import { ICON_PACKS } from '../theme.js';

const NAV = [
  { id: 'profile', label: 'Profile' },
  { id: 'bazaar', label: 'Bazaar' },
  { id: 'auctions', label: 'Auctions' },
  { id: 'calendar', label: 'Mayor & events' },
  { id: 'tools', label: 'Tools' },
];

function useTheme() {
  const [theme, setTheme] = useState(() => document.documentElement.dataset.theme || 'dark');
  const toggle = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem('theme', next);
    } catch {
      // private mode: the switch still works for this visit
    }
    setTheme(next);
  };
  return [theme, toggle];
}

function PlayerSearch({ onSearch, current }) {
  const [value, setValue] = useState(current ?? '');
  useEffect(() => setValue(current ?? ''), [current]);
  return (
    <form
      className="nx-search"
      role="search"
      onSubmit={(e) => {
        e.preventDefault();
        if (value.trim()) onSearch(value.trim());
      }}
    >
      <MagnifyingGlassIcon size={15} aria-hidden="true" />
      <label htmlFor="nx-player" className="sr-only">
        Look up a player
      </label>
      <input
        id="nx-player"
        className="nx-plain"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Look up a player"
        autoComplete="off"
        spellCheck="false"
      />
    </form>
  );
}

function NavLinks({ page, onNav, className = '' }) {
  return (
    <nav aria-label="Site" className={`flex gap-1 ${className}`}>
      {NAV.map(({ id, label }) => (
        <button key={id} type="button" className="nx-tab !h-8 !px-3 !text-[13px]" aria-selected={page === id} onClick={() => onNav(id)}>
          {label}
        </button>
      ))}
    </nav>
  );
}

export default function Shell({ page, current, lastPlayer, onHome, onPage, onProfile, onSearch, onClassic, children }) {
  const [theme, toggleTheme] = useTheme();
  const { pack } = useIcons();
  const nav = (id) => {
    if (id !== 'profile') return onPage(id);
    if (lastPlayer) return onProfile();
    return onPage('');
  };
  return (
    <>
      <a href="#nx-main" className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 nx-btn">
        Skip to content
      </a>
      <header className="nx-topbar">
        <button type="button" className="nx-brand" onClick={onHome}>
          <span className="nx-brand-mark">
            <ChartBarIcon size={15} weight="fill" />
          </span>
          <span className="hidden lg:inline">SkyBlock Advisor</span>
        </button>
        <NavLinks page={page} onNav={nav} className="hidden md:flex" />
        <PlayerSearch onSearch={onSearch} current={current} />
        <label htmlFor="nx-pack" className="sr-only">
          Item icons
        </label>
        <select id="nx-pack" value={pack} onChange={(e) => setIconPack(e.target.value)} className="nx-select !h-8 !text-[13px] hidden xl:block" title="Item icons">
          {Object.entries(ICON_PACKS).map(([id, p]) => (
            <option key={id} value={id}>
              {p.label}
            </option>
          ))}
        </select>
        <button
          type="button"
          className="nx-btn nx-btn-ghost nx-btn-sm shrink-0 !px-2.5"
          onClick={toggleTheme}
          aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
        >
          <CircleHalfIcon size={16} />
        </button>
      </header>
      <div className="nx-subnav md:hidden">
        <NavLinks page={page} onNav={nav} />
      </div>

      <main id="nx-main" className="mx-auto w-full max-w-[1240px] px-4 pb-32 sm:px-6">
        {children}
      </main>

      <footer className="mx-auto flex w-full max-w-[1240px] flex-wrap items-center justify-between gap-4 border-t border-[var(--nx-line)] px-4 py-8 text-[13px] sm:px-6">
        <p className="nx-faint max-w-[72ch]">
          Not affiliated with Hypixel or Mojang. Data from the Hypixel API and the community SkyBlock wiki; prices are bazaar instant-buy and lowest BIN.
        </p>
        <div className="flex items-center gap-2">
          <select value={pack} onChange={(e) => setIconPack(e.target.value)} className="nx-select !h-8 !text-[13px] xl:hidden" aria-label="Item icons">
            {Object.entries(ICON_PACKS).map(([id, p]) => (
              <option key={id} value={id}>
                {p.label} icons
              </option>
            ))}
          </select>
          <button type="button" className="nx-btn nx-btn-ghost nx-btn-sm" onClick={onClassic}>
            Classic Minecraft design
          </button>
        </div>
      </footer>
    </>
  );
}
