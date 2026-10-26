import { CalendarBlankIcon, ChartBarIcon, GavelIcon, MoonIcon, StorefrontIcon, SunIcon, UserIcon, WrenchIcon } from '@phosphor-icons/react';
import { useState } from 'react';
import SearchForm from './SearchForm.jsx';

function useTheme() {
  const [theme, setTheme] = useState(() => document.documentElement.dataset.theme || 'dark');
  const toggle = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem('theme', next);
    } catch {
      // private mode: the toggle still works for this visit
    }
    setTheme(next);
  };
  return [theme, toggle];
}

const NAV = [
  { id: 'profile', label: 'Profile', icon: UserIcon },
  { id: 'bazaar', label: 'Bazaar', icon: StorefrontIcon },
  { id: 'auctions', label: 'Auctions', icon: GavelIcon },
  { id: 'calendar', label: 'Mayor & events', icon: CalendarBlankIcon },
  { id: 'tools', label: 'Tools', icon: WrenchIcon },
];

export default function Header({ onHome, onSearch, onPage, onProfile, page, current, lastPlayer }) {
  const [theme, toggleTheme] = useTheme();
  const nav = (id) => {
    if (id !== 'profile') return onPage(id);
    if (lastPlayer) return onProfile();
    return onPage('');
  };
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-bg/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 w-full max-w-[1240px] items-center gap-3 px-4 sm:px-6">
        <button type="button" onClick={onHome} className="flex shrink-0 items-center gap-2 rounded-lg py-1 pr-2 text-left font-semibold tracking-tight">
          <span className="grid size-8 place-items-center rounded-lg bg-accent text-accent-ink">
            <ChartBarIcon weight="bold" size={17} />
          </span>
          <span className="hidden lg:inline">SkyBlock Advisor</span>
        </button>
        <nav aria-label="Site" className="hidden items-center gap-1 md:flex">
          {NAV.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => nav(id)}
              aria-current={page === id ? 'page' : undefined}
              className={`inline-flex h-9 items-center gap-1.5 rounded-lg px-2.5 text-sm transition-colors ${page === id ? 'bg-surface-2 text-text' : 'text-muted hover:text-text'}`}
            >
              <Icon size={16} />
              {label}
            </button>
          ))}
        </nav>
        <div className="ml-auto flex min-w-0 flex-1 items-center justify-end gap-2">
          {page && (
            <div className="w-full max-w-xs">
              <SearchForm onSearch={onSearch} initial={current} size="sm" />
            </div>
          )}
          <button
            type="button"
            onClick={toggleTheme}
            className="grid size-9 shrink-0 place-items-center rounded-lg border border-line text-muted transition-colors hover:text-text active:scale-[0.97]"
            aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
          >
            {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
          </button>
        </div>
      </div>
      <nav aria-label="Site" className="scroll-x flex gap-1 border-t border-line px-4 py-1.5 md:hidden">
        {NAV.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => nav(id)}
            aria-current={page === id ? 'page' : undefined}
            className={`inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg px-2.5 text-sm ${page === id ? 'bg-surface-2 text-text' : 'text-muted'}`}
          >
            <Icon size={15} />
            {label}
          </button>
        ))}
      </nav>
    </header>
  );
}
