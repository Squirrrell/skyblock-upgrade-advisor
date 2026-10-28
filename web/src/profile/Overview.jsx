import { ArrowRightIcon } from '@phosphor-icons/react';
import { coins, date, int, num, valueLines } from '../lib/format.js';
import { ItemSlot, mcText } from '../mc.jsx';
import { SKILL_ICONS } from '../theme.js';
import { Bar, Facts, Panel, Stat, StatGrid, rarityClass, rarityLabel } from '../ui.jsx';

/** One skill: its menu icon, level against its cap, and progress to the next level. */
function SkillTile({ skill }) {
  const maxed = skill.maxed;
  return (
    <li className="flex min-w-0 flex-col gap-2.5 py-1">
      <div className="flex items-center gap-3">
        <ItemSlot
          id={SKILL_ICONS[skill.id]}
          alt={`${skill.name} skill`}
          tooltip={{
            name: `${skill.name} ${skill.level}`,
            lines: [
              `${int(skill.xp)} XP`,
              maxed ? (skill.overflow ? `+${num(skill.overflow, 2)} levels of overflow` : 'Maxed') : `${int(skill.toNext)} XP to level ${skill.level + 1}`,
              skill.cap < skill.maxLevel ? `Cap ${skill.cap}, can be raised to ${skill.maxLevel}` : null,
            ],
          }}
        />
        <div className="min-w-0">
          <div className="truncate text-sm text-muted">{skill.name}</div>
          <div className="tabular leading-tight">
            <span className={`text-xl font-semibold ${maxed ? 'text-accent' : ''}`}>{skill.level}</span>
            <span className="text-sm text-muted"> / {skill.cap}</span>
          </div>
        </div>
      </div>
      <Bar value={maxed ? 1 : skill.progress} gold={maxed} />
      <div className="truncate text-xs text-muted tabular">{maxed ? 'Maxed' : `${coins(skill.toNext)} XP to ${skill.level + 1}`}</div>
    </li>
  );
}

function SkillsPanel({ skills, onTab }) {
  if (skills.apiOff) {
    return (
      <Panel title="Skills">
        <p className="text-sm text-muted">The Skills API is off for this profile. Turn it on in SkyBlock settings under API settings.</p>
      </Panel>
    );
  }
  const main = skills.list.filter((x) => !x.cosmetic);
  const cosmetic = skills.list.filter((x) => x.cosmetic);
  const maxed = main.filter((x) => x.maxed).length;
  return (
    <Panel
      title="Skills"
      subtitle={`Average ${num(skills.average, 2)} (${num(skills.averageExact, 2)} with progress), ${maxed} of ${main.length} at their cap.`}
      actions={
        <button type="button" onClick={() => onTab('skills')} className="mc-btn mc-btn-sm">
          All skill details
          <ArrowRightIcon size={14} />
        </button>
      }
    >
      {/* Ten skills: two columns (five rows) or five columns (two rows), never a ragged last row. */}
      <ul className="grid grid-cols-2 gap-x-6 gap-y-5 lg:grid-cols-5">
        {main.map((x) => (
          <SkillTile key={x.id} skill={x} />
        ))}
      </ul>
      {cosmetic.length > 0 && (
        <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3 border-t border-line pt-4 text-sm">
          <span className="text-muted">Cosmetic, not in the average</span>
          {cosmetic.map((x) => (
            <span key={x.id} className="inline-flex items-center gap-2">
              <ItemSlot id={SKILL_ICONS[x.id]} alt={`${x.name} skill`} tooltip={{ name: `${x.name} ${x.level}`, lines: [`${int(x.xp)} XP`] }} className="scale-90" />
              {x.name}
              <span className="font-semibold tabular">{x.level}</span>
              <span className="text-muted tabular">/ {x.cap}</span>
            </span>
          ))}
        </div>
      )}
    </Panel>
  );
}

export default function Overview({ stats, onTab }) {
  const o = stats.overview;
  const nw = stats.networth;
  const maxCat = nw.categories[0]?.value || 1;
  const jump = (tab, children) => (
    <button type="button" onClick={() => onTab(tab)} className="text-left hover:outline hover:outline-[var(--px)] hover:outline-[var(--code-white)]">
      {children}
    </button>
  );

  return (
    <div className="fade-in flex flex-col gap-6">
      <StatGrid cols="sm:grid-cols-3 lg:grid-cols-6">
        <Stat label="SkyBlock level" value={o.sbLevel} sub={`${Math.round(o.sbProgress * 100)}/100 XP`} accent />
        <Stat label="Networth (est.)" tone="gold" value={coins(o.networth)} sub={nw.inventoryOff ? 'Inventory API off' : `${coins(nw.items)} in items`} />
        {jump('skills', <Stat label="Skill average" value={num(o.skillAverage, 2)} sub="Without cosmetic skills" />)}
        {jump(
          'dungeons',
          <Stat
            label="Catacombs"
            value={o.catacombs != null ? num(o.catacombs, 2) : '-'}
            sub={stats.dungeons.played ? `${stats.dungeons.completions.normal + stats.dungeons.completions.master} runs` : 'Not played'}
          />,
        )}
        {jump('slayers', <Stat label="Slayer XP" value={coins(o.slayerXp)} sub={stats.slayers.list.map((s) => s.level).join(' / ')} />)}
        {jump('accessories', <Stat label="Magical power" value={num(o.magicalPower, 0)} sub={stats.accessories.selectedPower ?? 'No power selected'} />)}
      </StatGrid>

      <SkillsPanel skills={stats.skills} onTab={onTab} />

      <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
        <Panel
          title="Networth breakdown"
          subtitle="What everything would sell for now. Base items, pets, sacks and essence; enchantments and reforges are not counted."
        >
          <ul className="flex flex-col gap-3">
            {[['Purse', nw.purse], ['Bank (coop)', nw.bank], ...(nw.personalBank ? [['Personal bank', nw.personalBank]] : [])].map(([name, value]) => (
              <li key={name} className="flex justify-between text-sm">
                <span className="text-muted">{name}</span>
                <span className="text-warn tabular">{coins(value)}</span>
              </li>
            ))}
            {nw.categories.map((c) => (
              <li key={c.name}>
                <div className="flex justify-between text-sm">
                  <span>{c.name}</span>
                  <span className="text-warn tabular">{coins(c.value)}</span>
                </div>
                <Bar value={c.value / maxCat} className="mt-1.5" />
              </li>
            ))}
          </ul>
        </Panel>

        <Panel title="Most valuable">
          {nw.top.length ? (
            <ol className="mc-well flex flex-col p-1">
              {nw.top.map((t, i) => (
                <li key={`${t.id}-${i}`} className="flex items-center justify-between gap-3 px-1 py-1 text-sm hover:bg-white/10">
                  <ItemSlot
                    id={t.id}
                    rarity={t.rarity}
                    count={t.count}
                    tooltip={{
                      name: t.rawName ?? t.name,
                      rarity: t.rarity,
                      lines: [t.location, ...valueLines(t)],
                      label: t.rarity ? rarityLabel(t.rarity).toUpperCase() : undefined,
                    }}
                  />
                  <span className="min-w-0 flex-1 truncate">
                    <span className={`font-semibold ${rarityClass(t.rarity)}`}>{mcText(t.rawName ?? t.name)}</span>
                    <span className="ml-2 text-sm text-muted">{t.location}</span>
                  </span>
                  <span className="shrink-0 text-warn tabular">{coins(t.value)}</span>
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
