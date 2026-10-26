import { ArrowSquareOutIcon } from '@phosphor-icons/react';
import { useMemo, useState } from 'react';
import { CATACOMBS_XP, HOTF_XP, HOTM_XP, SKILL_XP, levelFrom, slayerLevel, xpForLevel } from '../../../shared/stats/levels.js';
import { RUNECRAFTING_XP, SLAYER_XP, SOCIAL_XP } from '../../../shared/stats/constants.js';
import { int } from '../lib/format.js';
import { Panel } from '../ui.jsx';

const CURVES = {
  skill: { label: 'Skill (most skills)', table: SKILL_XP, cap: 60 },
  runecrafting: { label: 'Runecrafting', table: RUNECRAFTING_XP, cap: 25 },
  social: { label: 'Social', table: SOCIAL_XP, cap: 25 },
  catacombs: { label: 'Catacombs or a class', table: CATACOMBS_XP, cap: 50 },
  hotm: { label: 'Heart of the Mountain', table: HOTM_XP, cap: 10 },
  hotf: { label: 'Heart of the Forest', table: HOTF_XP, cap: 8 },
};
const SLAYERS = { zombie: 'Revenant', spider: 'Tarantula', wolf: 'Sven', enderman: 'Voidgloom', blaze: 'Inferno', vampire: 'Riftstalker' };
const BOSS_XP = { default: [5, 25, 100, 500, 1500], vampire: [10, 25, 60, 120, 150] };

function Field({ label, children }) {
  return (
    <label className="flex flex-col gap-1.5 text-sm">
      <span className="text-muted">{label}</span>
      {children}
    </label>
  );
}
const inputCls = 'h-10 rounded-lg border border-line bg-surface px-3 font-mono text-text tabular focus:border-accent focus:outline-none';

function XpCalculator() {
  const [curve, setCurve] = useState('skill');
  const [xp, setXp] = useState('0');
  const [target, setTarget] = useState(50);
  const c = CURVES[curve];
  const now = levelFrom(Number(xp) || 0, c.table, c.cap);
  const goal = Math.min(Math.max(1, Number(target) || 1), c.cap);
  const need = Math.max(0, xpForLevel(goal, c.table) - (Number(xp) || 0));
  return (
    <Panel title="XP to level" subtitle="Paste your current XP (shown in the profile tabs) and pick a goal.">
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Curve">
          <select value={curve} onChange={(e) => setCurve(e.target.value)} className={inputCls}>
            {Object.entries(CURVES).map(([id, v]) => (
              <option key={id} value={id}>
                {v.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Current XP">
          <input inputMode="numeric" value={xp} onChange={(e) => setXp(e.target.value.replace(/[^\d.]/g, ''))} className={inputCls} />
        </Field>
        <Field label={`Target level (max ${c.cap})`}>
          <input type="number" min={1} max={c.cap} value={target} onChange={(e) => setTarget(e.target.value)} className={inputCls} />
        </Field>
      </div>
      <dl className="mt-5 grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg bg-surface-2 p-3">
          <dt className="text-xs text-muted">Current level</dt>
          <dd className="mt-1 font-mono text-xl tabular">{now.exact.toFixed(2)}</dd>
        </div>
        <div className="rounded-lg bg-surface-2 p-3">
          <dt className="text-xs text-muted">XP still needed</dt>
          <dd className="mt-1 font-mono text-xl text-accent tabular">{int(need)}</dd>
        </div>
        <div className="rounded-lg bg-surface-2 p-3">
          <dt className="text-xs text-muted">Total XP for level {goal}</dt>
          <dd className="mt-1 font-mono text-xl tabular">{int(xpForLevel(goal, c.table))}</dd>
        </div>
      </dl>
    </Panel>
  );
}

function SlayerCalculator() {
  const [boss, setBoss] = useState('zombie');
  const [xp, setXp] = useState('0');
  const table = SLAYER_XP[boss];
  const [target, setTarget] = useState(table.length);
  const now = slayerLevel(boss, Number(xp) || 0);
  const goal = Math.min(Math.max(1, Number(target) || 1), table.length);
  const need = Math.max(0, table[goal - 1] - (Number(xp) || 0));
  const bossXp = BOSS_XP[boss] ?? BOSS_XP.default;
  const tiers = useMemo(() => bossXp.slice(0, now.maxTier), [bossXp, now.maxTier]);
  return (
    <Panel title="Slayer XP" subtitle="Boss counts ignore the Aatrox XP perk and other boosts.">
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Slayer">
          <select
            value={boss}
            onChange={(e) => {
              setBoss(e.target.value);
              setTarget(SLAYER_XP[e.target.value].length);
            }}
            className={inputCls}
          >
            {Object.entries(SLAYERS).map(([id, name]) => (
              <option key={id} value={id}>
                {name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Current XP">
          <input inputMode="numeric" value={xp} onChange={(e) => setXp(e.target.value.replace(/[^\d]/g, ''))} className={inputCls} />
        </Field>
        <Field label={`Target level (max ${table.length})`}>
          <input type="number" min={1} max={table.length} value={goal} onChange={(e) => setTarget(e.target.value)} className={inputCls} />
        </Field>
      </div>
      <p className="mt-5 text-sm">
        Level <span className="font-mono tabular">{now.level}</span> now. <span className="font-mono text-accent tabular">{int(need)}</span> XP to level {goal}
        {need > 0 && ', which is about:'}
      </p>
      {need > 0 && (
        <ul className="mt-2 flex flex-wrap gap-2 text-sm">
          {tiers.map((x, i) => (
            <li key={i} className="rounded-lg bg-surface-2 px-3 py-1.5 font-mono tabular">
              {int(Math.ceil(need / x))} × T{i + 1}
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

const LINKS = [
  ['Profiles', 'SkyCrypt', 'https://sky.shiiyu.moe', 'The classic profile viewer: inventories, networth and every stat.'],
  ['Profiles', 'Elite', 'https://elitebot.dev', 'Farming weight, Jacob contest history and leaderboards.'],
  ['Trading', 'Coflnet', 'https://sky.coflnet.com', 'Auction and bazaar price history, and an auction flipper.'],
  ['Trading', 'Bazaar on the wiki', 'https://wiki.hypixel.net/Bazaar', 'How orders, offers and tax work.'],
  ['Wikis', 'Official SkyBlock wiki', 'https://wiki.hypixel.net', 'Hypixel-run wiki with item, mob and mechanic pages.'],
  ['Wikis', 'Community SkyBlock wiki', 'https://hypixelskyblock.minecraft.wiki', 'Community wiki, used for this site\'s fortune numbers.'],
  ['Mods', 'NotEnoughUpdates', 'https://github.com/NotEnoughUpdates/NotEnoughUpdates', 'Item list, recipes and price overlays for Forge 1.8.9.'],
  ['Mods', 'Skyblocker', 'https://modrinth.com/mod/skyblocker-liap', 'Quality-of-life features for modern Fabric versions.'],
  ['Developers', 'Hypixel API', 'https://api.hypixel.net', 'The public API this site reads from.'],
  ['Developers', 'NEU item repo', 'https://github.com/NotEnoughUpdates/NotEnoughUpdates-REPO', 'Item data and game constants used here for levels and pets.'],
];

export default function Tools() {
  const groups = [...new Set(LINKS.map((l) => l[0]))];
  return (
    <div className="fade-in pt-8">
      <h1 className="text-2xl font-semibold tracking-tight">Calculators & links</h1>
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <XpCalculator />
        <SlayerCalculator />
      </div>
      <h2 className="mt-12 text-lg font-semibold tracking-tight">Helpful community sites</h2>
      <div className="mt-4 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {groups.map((g) => (
          <section key={g}>
            <h3 className="mb-2 text-xs font-semibold tracking-wide text-muted uppercase">{g}</h3>
            <ul className="flex flex-col gap-2">
              {LINKS.filter((l) => l[0] === g).map(([, name, href, body]) => (
                <li key={name}>
                  <a href={href} target="_blank" rel="noreferrer" className="block rounded-xl border border-line bg-surface p-4 shadow-panel transition-colors hover:border-accent">
                    <span className="flex items-center gap-1.5 font-medium">
                      {name} <ArrowSquareOutIcon size={14} className="text-muted" />
                    </span>
                    <span className="mt-1 block text-sm text-muted">{body}</span>
                  </a>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
