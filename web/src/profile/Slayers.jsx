import { coins, int } from '../lib/format.js';
import { ItemSlot } from '../mc.jsx';
import { SLAYER_ICONS } from '../theme.js';
import { LevelRow, Panel, Stat, StatGrid } from '../ui.jsx';

const TIER = ['I', 'II', 'III', 'IV', 'V'];

export default function Slayers({ stats }) {
  const { list, totalXp } = stats.slayers;
  const kills = list.reduce((n, s) => n + s.totalKills, 0);
  return (
    <div className="fade-in flex flex-col gap-6">
      <StatGrid>
        <Stat label="Total slayer XP" value={coins(totalXp)} accent />
        <Stat label="Bosses killed" value={int(kills)} />
        <Stat label="Levels" value={list.map((s) => s.level).join(' / ')} sub="Rev / Tara / Sven / Eman / Blaze / Vamp" />
        <Stat label="Maxed slayers" value={`${list.filter((s) => s.maxed).length} / ${list.length}`} />
      </StatGrid>
      <div className="grid gap-4 md:grid-cols-2">
        {list.map((s) => (
          <Panel
            key={s.id}
            title={
              <span className="flex items-center gap-3">
                <ItemSlot id={SLAYER_ICONS[s.id]} alt={s.name} tooltip={false} />
                {s.name}
              </span>
            }
          >
            <LevelRow name="Level" info={s} />
            <table className="mt-2 w-full text-sm">
              <caption className="sr-only">Boss kills by tier</caption>
              <thead>
                <tr className="text-xs text-muted">
                  {s.kills.map((_, t) => (
                    <th key={t} className="py-1 text-center font-medium">
                      T{TIER[t]}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  {s.kills.map((k, t) => (
                    <td key={t} className={`py-1 text-center font-mono tabular ${k ? 'text-text' : 'text-muted'}`}>
                      {int(k)}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </Panel>
        ))}
      </div>
    </div>
  );
}
