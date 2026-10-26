import { ChartBarIcon, MoonIcon, SunIcon } from '@phosphor-icons/react';
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

export default function Header({ onHome, onSearch, compact, current }) {
  const [theme, toggleTheme] = useTheme();
  return (
    <header className="sticky top-0 z-20 border-b border-line bg-bg/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 w-full max-w-[1240px] items-center gap-4 px-4 sm:px-6">
        <button
          type="button"
          onClick={onHome}
          className="flex shrink-0 items-center gap-2 rounded-lg py-1 pr-2 text-left font-semibold tracking-tight"
        >
          <span className="grid size-8 place-items-center rounded-lg bg-accent text-accent-ink">
            <ChartBarIcon weight="bold" size={17} />
          </span>
          <span className="hidden sm:inline">Upgrade Advisor</span>
        </button>
        <div className="ml-auto flex min-w-0 flex-1 items-center justify-end gap-2">
          {compact && (
            <div className="w-full max-w-sm">
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
    </header>
  );
}
