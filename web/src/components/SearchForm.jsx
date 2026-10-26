import { MagnifyingGlassIcon } from '@phosphor-icons/react';
import { useEffect, useId, useState } from 'react';

export default function SearchForm({ onSearch, initial = '', size = 'lg' }) {
  const [value, setValue] = useState(initial);
  const id = useId();
  useEffect(() => setValue(initial), [initial]);

  const submit = (e) => {
    e.preventDefault();
    if (value.trim()) onSearch(value.trim());
  };

  if (size === 'sm') {
    return (
      <form onSubmit={submit} role="search" className="relative">
        <label htmlFor={id} className="sr-only">
          Minecraft username
        </label>
        <MagnifyingGlassIcon className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted" size={16} />
        <input
          id={id}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Look up another player"
          autoComplete="off"
          spellCheck="false"
          className="h-9 w-full rounded-lg border border-line bg-surface pr-3 pl-9 text-sm text-text placeholder:text-muted focus:border-accent focus:outline-none"
        />
      </form>
    );
  }

  return (
    <form onSubmit={submit} role="search" className="flex flex-col gap-2">
      <label htmlFor={id} className="text-sm font-medium text-text">
        Minecraft username
      </label>
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          id={id}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Username or UUID"
          autoComplete="off"
          spellCheck="false"
          autoFocus
          className="h-12 min-w-0 flex-1 rounded-lg border border-line bg-surface px-4 text-base text-text placeholder:text-muted focus:border-accent focus:outline-none"
        />
        <button
          type="submit"
          className="inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-lg bg-accent px-5 font-medium whitespace-nowrap text-accent-ink transition-transform active:scale-[0.98] disabled:opacity-50"
          disabled={!value.trim()}
        >
          <MagnifyingGlassIcon weight="bold" size={17} />
          Check profile
        </button>
      </div>
      <p className="text-sm text-muted">Usernames and UUIDs both work. Your selected SkyBlock profile loads first.</p>
    </form>
  );
}
