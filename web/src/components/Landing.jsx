import { useState } from 'react';
import { load } from '../lib/storage.js';
import { ItemSlot } from '../mc.jsx';
import SearchForm from './SearchForm.jsx';

const PROFILE = [
  ['DIAMOND_SWORD', 'Skills, slayers, dungeons and classes'],
  ['GOLD_INGOT', 'Networth estimate and most valuable items'],
  ['CHEST', 'Inventory, storage and accessory bag viewer'],
  ['EMERALD', 'Missing accessories ranked by coins per magical power'],
  ['WHEAT', 'Farming and hunting fortune upgrades, priced'],
  ['DIAMOND_PICKAXE', 'Mining, foraging, collections, minions and pets'],
  ['BLAZE_POWDER', 'Crimson Isle, Kuudra, the Rift, Chocolate Factory and more'],
];

const TOOLS = [
  { id: 'bazaar', icon: 'BAZAAR', title: 'Bazaar', body: 'Every product live, with spreads, weekly volume and flip margins after tax.' },
  { id: 'auctions', icon: 'AUCTIONS', title: 'Auction prices', body: 'Lowest BIN for any item or pet from a full auction house scan.' },
  { id: 'calendar', icon: 'WATCH', title: 'Mayor & events', body: 'Current mayor and perks, the election, SkyBlock date and upcoming events.' },
  {
    id: 'tools',
    icon: 'WORKBENCH',
    title: 'Calculators & links',
    body: 'XP calculators for skills, catacombs, slayers and HOTM, plus the best community sites.',
  },
];

export default function Landing({ onSearch, onPage }) {
  const [recent] = useState(() => load('recent', []));
  return (
    <div className="pt-12 md:pt-16">
      <div className="grid gap-10 lg:grid-cols-12 lg:gap-12">
        <section className="lg:col-span-7">
          <h1 className="max-w-[20ch] text-3xl leading-[1.2] font-bold text-balance text-[var(--code-yellow)] md:text-4xl">
            Everything about your SkyBlock profile, in one place.
          </h1>
          <p className="mt-5 max-w-[52ch] text-lg leading-relaxed text-muted">
            Look up any player for their full stats and what to upgrade next, priced live from the bazaar and auction house.
          </p>
          <div className="mc-panel mt-8 max-w-xl p-4 sm:p-5">
            <SearchForm onSearch={onSearch} />
          </div>
          {recent.length > 0 && (
            <div className="mt-8 max-w-xl">
              <h2 className="text-sm text-muted">Recent</h2>
              <div className="mt-2 flex flex-wrap gap-2">
                {recent.map((name) => (
                  <button key={name} type="button" onClick={() => onSearch(name)} className="mc-btn mc-btn-sm pl-1">
                    <img src={`https://mc-heads.net/avatar/${encodeURIComponent(name)}/24`} alt="" width="20" height="20" />
                    {name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </section>

        <section className="mc-panel p-4 sm:p-5 lg:col-span-5" aria-labelledby="profile-title">
          <h2 id="profile-title" className="text-lg font-bold">
            In a profile lookup
          </h2>
          <ul className="mt-4 flex flex-col gap-2">
            {PROFILE.map(([icon, line]) => (
              <li key={line} className="flex items-center gap-3 text-sm leading-relaxed">
                <ItemSlot id={icon} tooltip={false} />
                {line}
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section className="mt-14" aria-labelledby="tools-title">
        <h2 id="tools-title" className="text-lg font-bold">
          No username needed
        </h2>
        <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {TOOLS.map(({ id, icon, title, body }) => (
            <li key={id}>
              <button
                type="button"
                onClick={() => onPage(id)}
                className="mc-panel flex h-full w-full flex-col p-4 text-left hover:outline hover:outline-[var(--px)] hover:outline-[var(--code-white)]"
              >
                <span className="flex items-center gap-3">
                  <ItemSlot id={icon} tooltip={false} />
                  <span className="font-bold">{title}</span>
                </span>
                <span className="mt-3 text-sm leading-relaxed text-muted">{body}</span>
              </button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
