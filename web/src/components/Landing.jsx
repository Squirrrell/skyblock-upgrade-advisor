import { CoinsIcon, CrosshairIcon, FlaskIcon, PlantIcon } from '@phosphor-icons/react';
import { motion } from 'motion/react';
import { useState } from 'react';
import { load } from '../lib/storage.js';
import SearchForm from './SearchForm.jsx';

const CHECKS = [
  {
    icon: PlantIcon,
    title: 'Farming fortune',
    body: 'Armor, equipment, pets and pet items, attribute shards, tools, garden upgrades, accessories and boosts.',
  },
  {
    icon: CrosshairIcon,
    title: 'Hunting fortune',
    body: "Karma and echo attributes, David's Cloak, Safari Belt, nets, lassos, black holes and perks.",
  },
  {
    icon: FlaskIcon,
    title: 'Consumables',
    body: 'Larva, truffles, peppers, serums, Jyrre and the rest of the one-time stat items.',
  },
  {
    icon: CoinsIcon,
    title: 'Live prices',
    body: 'Bazaar instant-buy prices and the lowest BIN from a full auction house scan every 10 minutes.',
  },
];

export default function Landing({ onSearch }) {
  const [recent] = useState(() => load('recent', []));
  return (
    <div className="grid gap-12 pt-12 md:pt-20 lg:grid-cols-12 lg:gap-16">
      <motion.section
        className="lg:col-span-7"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      >
        <h1 className="max-w-[18ch] text-4xl leading-[1.05] font-semibold tracking-tighter text-balance md:text-5xl">
          See what your SkyBlock profile is missing.
        </h1>
        <p className="mt-5 max-w-[52ch] text-lg leading-relaxed text-muted">
          Every farming fortune, hunting fortune and consumable you could still get, priced live from the bazaar and
          auction house.
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
      </motion.section>

      <motion.section
        className="lg:col-span-5"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
        aria-labelledby="checks-title"
      >
        <h2 id="checks-title" className="text-lg font-semibold tracking-tight">
          What gets checked
        </h2>
        <ul className="mt-5 grid gap-6 sm:grid-cols-2 lg:grid-cols-1">
          {CHECKS.map(({ icon: Icon, title, body }) => (
            <li key={title} className="flex gap-4">
              <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-accent-soft text-accent">
                <Icon size={20} />
              </span>
              <div>
                <h3 className="font-medium">{title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-muted">{body}</p>
              </div>
            </li>
          ))}
        </ul>
      </motion.section>
    </div>
  );
}
