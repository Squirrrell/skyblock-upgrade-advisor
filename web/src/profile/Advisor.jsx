// The original upgrade advisor (fortune and consumables), plus the plain
// stats that belong next to it: garden and Jacob for farming, shards and
// the safari for hunting.
import { useState } from 'react';
import BestValue from '../components/BestValue.jsx';
import SectionView from '../components/SectionView.jsx';
import { remainingCost } from '../lib/sections.js';
import { coins, int, num } from '../lib/format.js';
import { load, save } from '../lib/storage.js';
import { Facts, Panel, Stat, StatGrid } from '../ui.jsx';

function GardenPanel({ stats }) {
  const g = stats.garden;
  const j = stats.jacob;
  return (
    <div className="mb-6 grid gap-6 lg:grid-cols-2">
      <Panel title="Garden">
        {g ? (
          <>
            <Facts
              rows={[
                ['Garden level', g.level],
                ['Plots unlocked', `${g.plots} / 24`],
                ['Visitors served', `${int(g.visitorsServed)} (${int(g.uniqueVisitors)} unique)`],
                ['Copper', int(g.copper)],
                ...g.cropUpgrades.map((c) => [`${c.name} upgrade`, `${c.level} / 9`]),
              ]}
            />
            {g.milestones.length > 0 && (
              <details className="mt-4 text-sm">
                <summary className="cursor-pointer text-muted hover:text-text">Crops collected on the garden</summary>
                <div className="mt-3">
                  <Facts rows={g.milestones.map((m) => [m.name, int(m.collected)])} />
                </div>
              </details>
            )}
          </>
        ) : (
          <p className="text-sm text-muted">Garden data is not available for this profile.</p>
        )}
      </Panel>
      <Panel title="Jacob's farming contests">
        {j ? (
          <>
            <Facts
              rows={[
                ['Contests entered', int(j.contests)],
                ['Medals to spend', `${j.medals.gold ?? 0} gold, ${j.medals.silver ?? 0} silver, ${j.medals.bronze ?? 0} bronze`],
                ['Medals earned (recent)', Object.entries(j.earned).filter(([, n]) => n).map(([k, n]) => `${n} ${k}`).join(', ') || '-'],
                ['Anita level cap', `${j.perks.levelCap} / 10`],
                ['Double drops perk', `${j.perks.doubleDrops} / 15`],
              ]}
            />
            {j.personalBests.length > 0 && (
              <>
                <h3 className="mt-5 mb-2 text-sm font-medium">Personal bests</h3>
                <Facts rows={j.personalBests.map((p) => [p.name, int(p.value)])} />
              </>
            )}
          </>
        ) : (
          <p className="text-sm text-muted">No contests entered yet.</p>
        )}
      </Panel>
    </div>
  );
}

function HuntingPanel({ stats }) {
  const h = stats.hunting;
  return (
    <div className="mb-6 flex flex-col gap-6">
      <StatGrid>
        <Stat label="Shards fused" value={int(h.shardsFused)} />
        <Stat label="Unique shards" value={int(h.uniqueShards)} sub={`${h.shardTypesOwned} types held`} />
        <Stat label="Attributes unlocked" value={h.attributesUnlocked} />
        <Stat label="Safari captures" value={int(h.safariCaptures)} sub={`${h.critters} critters found`} />
      </StatGrid>
      <Panel title="Hunting activity">
        <Facts
          rows={[
            ['Combat shard hunts', int(h.hunts.combat)],
            ['Fishing shard hunts', int(h.hunts.fishing)],
            ['Forest shard hunts', int(h.hunts.forest)],
            ['Salt shard hunts', int(h.hunts.salt)],
            ...h.biomes.map((b) => [`${b.name} captures`, `${int(b.captures)} (milestone ${b.milestone})`]),
            ['Trapper pelts', int(h.pelts)],
          ]}
        />
      </Panel>
    </div>
  );
}

export default function Advisor({ report, stats, sectionId }) {
  const [hideDone, setHideDone] = useState(() => load('hideDone', false));
  const [sort, setSort] = useState('default');
  const section = report.sections[sectionId];

  const jumpTo = (rowId) => {
    const group = section.groups.find((g) => g.items.some((s) => s.id === rowId));
    document.getElementById(`group-${section.id}-${group?.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const totals = sectionId === 'consumables' ? null : section.totals;
  const cost = remainingCost(section);
  return (
    <div className="fade-in">
      {sectionId === 'farming' && <GardenPanel stats={stats} />}
      {sectionId === 'hunting' && <HuntingPanel stats={stats} />}

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm text-muted">
          {totals && (
            <>
              <span className="font-mono text-lg text-text tabular">{num(totals.current)}</span> / {num(totals.max)} {sectionId} fortune
            </>
          )}
          {cost > 0 && <span className="ml-3">About {coins(cost)} coins for everything left.</span>}
        </div>
        <div className="flex items-center gap-4 text-sm">
          <label className="inline-flex cursor-pointer items-center gap-2 text-muted">
            <input
              type="checkbox"
              checked={hideDone}
              onChange={(e) => {
                setHideDone(e.target.checked);
                save('hideDone', e.target.checked);
              }}
              className="size-4 accent-[var(--accent)]"
            />
            Hide finished
          </label>
          <label className="inline-flex items-center gap-2 text-muted">
            Sort
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="h-8 px-2"
            >
              <option value="default">By category</option>
              <option value="gain">Biggest gain</option>
              <option value="cost">Cheapest first</option>
            </select>
          </label>
        </div>
      </div>

      <BestValue sectionId={section.id} picks={report.bestValue[section.id]} onJump={jumpTo} />
      <SectionView section={section} hideDone={hideDone} sort={sort} />
    </div>
  );
}
