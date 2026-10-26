import { CalendarBlankIcon, ChartLineUpIcon, GavelIcon, StorefrontIcon, UserIcon, WrenchIcon } from '@phosphor-icons/react';
import { useState } from 'react';
import { load } from '../lib/storage.js';
import SearchForm from './SearchForm.jsx';

const PROFILE = [
  'Skills, slayers, dungeons and classes',
  'Networth estimate and most valuable items',
  'Inventory, storage and accessory bag viewer',
  'Missing accessories ranked by coins per magical power',
  'Farming and hunting fortune upgrades, priced',
  'Mining, foraging, collections, minions and pets',
  'Crimson Isle, Kuudra, the Rift, Chocolate Factory and more',
];

const TOOLS = [
  { id: 'bazaar', icon: StorefrontIcon, title: 'Bazaar', body: 'Every product live, with spreads, weekly volume and flip margins after tax.' },
  { id: 'auctions', icon: GavelIcon, title: 'Auction prices', body: 'Lowest BIN for any item or pet from a full auction house scan.' },
  { id: 'calendar', icon: CalendarBlankIcon, title: 'Mayor & events', body: 'Current mayor and perks, the election, SkyBlock date and upcoming events.' },
  { id: 'tools', icon: WrenchIcon, title: 'Calculators & links', body: 'XP calculators for skills, catacombs, slayers and HOTM, plus the best community sites.' },
];

export default function Landing({ onSearch, onPage }) {
  const [recent] = useState(() => load('recent', []));
  return (
    <div className="pt-12 md:pt-20">
      <div className="grid gap-12 lg:grid-cols-12 lg:gap-16">
        <section className="fade-in lg:col-span-7">
          <h1 className="max-w-[18ch] text-4xl leading-[1.05] font-semibold tracking-tighter text-balance md:text-5xl">Everything about your SkyBlock profile, in one place.</h1>
          <p className="mt-5 max-w-[52ch] text-lg leading-relaxed text-muted">
            Look up any player for their full stats and what to upgrade next, priced live from the bazaar and auction house.
          </p>
          <div className="mt-9 max-w-xl">
            <SearchForm onSearch={onSearch} />
          </div>
          {recent.length > 0 && (
            <div className="mt-8 max-w-xl">
              <h2 className="text-sm font-medium text-muted">Recent</h2>
              <div className="mt-2 flex flex-wrap gap-2">
                {recent.map((name) => (
                  <button
                    key={name}
                    type="button"
                    onClick={() => onSearch(name)}
                    className="inline-flex h-8 items-center gap-2 rounded-lg border border-line bg-surface pr-3 pl-1 text-sm transition-colors hover:border-accent active:scale-[0.98]"
                  >
                    <img src={`https://mc-heads.net/avatar/${encodeURIComponent(name)}/24`} alt="" width="24" height="24" className="rounded" />
                    {name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </section>

        <section className="fade-in lg:col-span-5" style={{ animationDelay: '80ms' }} aria-labelledby="profile-title">
          <h2 id="profile-title" className="flex items-center gap-2 text-lg font-semibold tracking-tight">
            <UserIcon size={18} className="text-accent" /> In a profile lookup
          </h2>
          <ul className="mt-4 flex flex-col gap-2.5">
            {PROFILE.map((line) => (
              <li key={line} className="flex gap-3 text-sm leading-relaxed text-muted">
                <ChartLineUpIcon size={16} className="mt-0.5 shrink-0 text-accent" />
                {line}
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section className="mt-16" aria-labelledby="tools-title">
        <h2 id="tools-title" className="text-lg font-semibold tracking-tight">
          No username needed
        </h2>
        <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {TOOLS.map(({ id, icon: Icon, title, body }) => (
            <li key={id}>
              <button type="button" onClick={() => onPage(id)} className="flex h-full w-full flex-col rounded-xl border border-line bg-surface p-5 text-left shadow-panel transition-colors hover:border-accent">
                <span className="grid size-10 place-items-center rounded-lg bg-accent-soft text-accent">
                  <Icon size={20} />
                </span>
                <span className="mt-4 font-medium">{title}</span>
                <span className="mt-1 text-sm leading-relaxed text-muted">{body}</span>
              </button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
