import { coins, date, num } from '../lib/format.js';
import Summary from '../components/Summary.jsx';
import { Bar, Facts, Panel, Stat, StatGrid, rarityClass } from '../ui.jsx';

export default function Overview({ report, stats, onTab }) {
  const o = stats.overview;
  const nw = stats.networth;
  const maxCat = nw.categories[0]?.value || 1;
  const jump = (tab, children) => (
    <button type="button" onClick={() => onTab(tab)} className="text-left transition-transform hover:-translate-y-0.5">
      {children}
    </button>
  );

  return (
    <div className="fade-in flex flex-col gap-6">
      <StatGrid cols="sm:grid-cols-3 lg:grid-cols-6">
        <Stat label="SkyBlock level" value={o.sbLevel} sub={`${Math.round(o.sbProgress * 100)}/100 XP`} accent />
        <Stat label="Networth (est.)" value={coins(o.networth)} sub={nw.inventoryOff ? 'Inventory API off' : `${coins(nw.items)} in items`} />
        {jump('skills', <Stat label="Skill average" value={num(o.skillAverage, 2)} sub="Without cosmetic skills" />)}
        {jump('dungeons', <Stat label="Catacombs" value={o.catacombs != null ? num(o.catacombs, 2) : '-'} sub={stats.dungeons.played ? `${stats.dungeons.completions.normal + stats.dungeons.completions.master} runs` : 'Not played'} />)}
        {jump('slayers', <Stat label="Slayer XP" value={coins(o.slayerXp)} sub={stats.slayers.list.map((s) => s.level).join(' / ')} />)}
        {jump('accessories', <Stat label="Magical power" value={num(o.magicalPower, 0)} sub={stats.accessories.selectedPower ?? 'No power selected'} />)}
      </StatGrid>

      <Summary sections={report.sections} />

      <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
        <Panel title="Networth breakdown" subtitle="What everything would sell for now. Base items, pets, sacks and essence; enchantments and reforges are not counted.">
          <ul className="flex flex-col gap-3">
            {[
              ['Purse', nw.purse],
              ['Bank (coop)', nw.bank],
              ...(nw.personalBank ? [['Personal bank', nw.personalBank]] : []),
            ].map(([name, value]) => (
              <li key={name} className="flex justify-between text-sm">
                <span className="text-muted">{name}</span>
                <span className="font-mono tabular">{coins(value)}</span>
              </li>
            ))}
            {nw.categories.map((c) => (
              <li key={c.name}>
                <div className="flex justify-between text-sm">
                  <span>{c.name}</span>
                  <span className="font-mono tabular">{coins(c.value)}</span>
                </div>
                <Bar value={c.value / maxCat} className="mt-1.5" />
              </li>
            ))}
          </ul>
        </Panel>

        <Panel title="Most valuable">
          {nw.top.length ? (
            <ol className="flex flex-col">
              {nw.top.map((t, i) => (
                <li key={`${t.id}-${i}`} className="flex items-baseline justify-between gap-3 border-b border-line/60 py-2 text-sm last:border-0">
                  <span className="min-w-0 truncate">
                    <span className={`font-medium ${rarityClass(t.rarity)}`}>{t.name}</span>
                    {t.count > 1 && <span className="ml-1 text-muted">x{t.count}</span>}
                    <span className="ml-2 text-xs text-muted">{t.location}</span>
                  </span>
                  <span className="shrink-0 font-mono tabular">{coins(t.value)}</span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-sm text-muted">No priced items. The inventory API may be off.</p>
          )}
        </Panel>
      </div>

      <Panel title="Profile">
        <Facts
          rows={[
            ['First joined', date(o.firstJoin)],
            ['Coop members', o.coopMembers],
            ['Booster cookie', o.cookieBuff ? 'Active' : 'Not active'],
            ['Fairy souls', num(o.fairySouls, 0)],
            ['Heart of the Mountain', o.hotm],
            ['Heart of the Forest', o.hotf],
            ['Pets', o.pets],
            ['Minion uniques', stats.minions.uniques],
            ['Garden level', stats.garden?.level ?? '-'],
            ['Bestiary milestone', stats.misc.bestiary.milestone],
            ['Deaths', num(stats.misc.deaths, 0)],
            o.selectedSymbol && ['Level symbol', o.selectedSymbol],
          ]}
        />
      </Panel>
    </div>
  );
}
