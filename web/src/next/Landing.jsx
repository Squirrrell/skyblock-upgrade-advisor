// The front page in the new design: player search first, then what a lookup
// shows and the tools that need no username.
import { ArrowRightIcon, MagnifyingGlassIcon } from '@phosphor-icons/react';
import { useState } from 'react';
import { load } from '../lib/storage.js';
import { ItemIcon } from './parts.jsx';

const PROFILE = [
  ['DIAMOND_SWORD', 'Skills, slayers, dungeons and classes'],
  ['GOLD_INGOT', 'Networth estimate and most valuable items'],
  ['CHEST', 'Inventory, storage and accessory bag'],
  ['EMERALD', 'Missing accessories, ranked by coins per magical power'],
  ['WHEAT', 'Farming and hunting fortune upgrades, priced'],
  ['PRISMARINE_SHARD', 'Every hunting shard you hold, with its value'],
  ['DIAMOND_PICKAXE', 'Mining, foraging, collections, minions and pets'],
  ['BLAZE_POWDER', 'Crimson Isle, Kuudra, the Rift and the Chocolate Factory'],
];

const TOOLS = [
  { id: 'bazaar', icon: 'EMERALD', title: 'Bazaar', body: 'Every product live, with spreads, weekly volume and flip margins after tax.' },
  { id: 'auctions', icon: 'GOLD_INGOT', title: 'Auction prices', body: 'Lowest BIN for any item or pet from a full auction house scan.' },
  { id: 'calendar', icon: 'WATCH', title: 'Mayor & events', body: 'Current mayor and perks, the election, the SkyBlock date and what is coming up.' },
  { id: 'tools', icon: 'WORKBENCH', title: 'Calculators & links', body: 'XP calculators for skills, catacombs, slayers and HOTM, and the best community sites.' },
];

export default function Landing({ onSearch, onPage }) {
  const [recent] = useState(() => load('recent', []));
  const [value, setValue] = useState('');
  const submit = (e) => {
    e.preventDefault();
    if (value.trim()) onSearch(value.trim());
  };

  return (
    <div className="pt-14 md:pt-20">
      <div className="grid gap-10 lg:grid-cols-12 lg:gap-14">
        <section className="nx-rise lg:col-span-7">
          <div className="nx-eyebrow">Hypixel SkyBlock</div>
          <h1 className="mt-4 max-w-[16ch] text-[40px] leading-[1.04] font-semibold tracking-[-0.035em] text-balance md:text-[60px]">
            Everything about your profile, in one place.
          </h1>
          <p className="nx-muted mt-6 max-w-[50ch] text-[17px] leading-relaxed">
            Look up any player for their full stats and what to upgrade next, priced live from the bazaar and auction house.
          </p>

          <form onSubmit={submit} role="search" className="nx-shell mt-10 max-w-xl !rounded-full">
            <div className="nx-core flex items-center gap-2 !rounded-full p-1.5 pl-5">
              <MagnifyingGlassIcon size={18} className="nx-faint shrink-0" aria-hidden="true" />
              <label htmlFor="nx-landing-player" className="sr-only">
                Minecraft username or UUID
              </label>
              <input
                id="nx-landing-player"
                className="nx-plain min-w-0 flex-1 border-0 bg-transparent text-[16px] outline-none placeholder:text-[var(--nx-text-3)]"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder="Username or UUID"
                autoComplete="off"
                spellCheck="false"
                autoFocus
              />
              <button type="submit" className="nx-btn nx-btn-primary group h-11 shrink-0 pr-2.5" disabled={!value.trim()}>
                Check profile
                <span className="nx-btn-icon">
                  <ArrowRightIcon size={14} weight="bold" />
                </span>
              </button>
            </div>
          </form>
          <p className="nx-faint mt-3 pl-5 text-[13px]">Your selected SkyBlock profile loads first.</p>

          {recent.length > 0 && (
            <div className="mt-10 max-w-xl">
              <div className="nx-eyebrow">Recent</div>
              <div className="mt-3 flex flex-wrap gap-2">
                {recent.map((name) => (
                  <button key={name} type="button" onClick={() => onSearch(name)} className="nx-btn nx-btn-sm !pl-1.5">
                    <img src={`https://mc-heads.net/avatar/${encodeURIComponent(name)}/32`} alt="" width="20" height="20" className="rounded-[6px]" style={{ imageRendering: 'pixelated' }} />
                    {name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </section>

        <section className="nx-shell nx-rise lg:col-span-5" style={{ '--i': 1 }} aria-labelledby="nx-profile-title">
          <div className="nx-core h-full p-6 sm:p-7">
            <div className="nx-eyebrow">In a profile lookup</div>
            <h2 id="nx-profile-title" className="nx-h2 mt-1.5">
              Fifteen tabs of stats and advice
            </h2>
            <ul className="mt-5 flex flex-col gap-3">
              {PROFILE.map(([icon, line]) => (
                <li key={line} className="flex items-center gap-3 text-[14px]">
                  <ItemIcon id={icon} size={34} />
                  <span className="nx-muted">{line}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </div>

      <section className="mt-20" aria-labelledby="nx-tools-title">
        <div className="nx-eyebrow">No username needed</div>
        <h2 id="nx-tools-title" className="nx-h2 mt-1.5">
          Market and game tools
        </h2>
        <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {TOOLS.map(({ id, icon, title, body }, i) => (
            <li key={id} className="nx-rise" style={{ '--i': i + 2 }}>
              <button type="button" onClick={() => onPage(id)} className="nx-shell group block h-full w-full cursor-pointer text-left">
                <span className="nx-core flex h-full flex-col p-5 transition-transform duration-300 group-hover:-translate-y-0.5">
                  <span className="flex items-center justify-between">
                    <ItemIcon id={icon} size={40} />
                    <ArrowRightIcon size={16} className="nx-faint transition-transform duration-300 group-hover:translate-x-1" />
                  </span>
                  <span className="mt-5 text-[15px] font-semibold">{title}</span>
                  <span className="nx-muted mt-1.5 text-[14px] leading-relaxed">{body}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
