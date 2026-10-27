import { duration, int, num } from '../lib/format.js';
import { ItemSlot } from '../mc.jsx';
import { CLASS_ICONS, FLOOR_BOSSES } from '../theme.js';
import { Empty, LevelRow, Panel, Stat, StatGrid } from '../ui.jsx';

/** "Entrance", "F3" or "M7" -> that floor's boss. */
const bossOf = (floor) => FLOOR_BOSSES[floor === 'Entrance' ? 0 : Number(floor.slice(1))] ?? null;

function FloorTable({ rows, title }) {
  if (!rows.length) return null;
  return (
    <Panel title={title} pad={false}>
      <div className="scroll-x">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b border-line text-xs text-muted">
              {['Floor', 'Completions', 'Best score', 'Fastest', 'Fastest S', 'Fastest S+', 'Mobs killed'].map((h, i) => (
                <th key={h} className={`px-4 py-2.5 font-medium ${i ? 'text-right' : 'text-left'}`}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.floor} className="border-b border-line/60 last:border-0">
                <td className="px-4 py-2 font-medium">
                  {(() => {
                    const boss = bossOf(r.floor);
                    return (
                      <span className="flex items-center gap-3">
                        {boss && <ItemSlot id={boss.icon} alt={boss.name} tooltip={{ name: boss.name, lines: [`Boss of ${r.floor}`] }} />}
                        <span>
                          <span className="block">{r.floor}</span>
                          {boss && <span className="block text-xs font-normal text-muted">{boss.name}</span>}
                        </span>
                      </span>
                    );
                  })()}
                </td>
                <td className="px-4 py-2.5 text-right font-mono tabular">{int(r.completions)}</td>
                <td className="px-4 py-2.5 text-right font-mono tabular">{r.bestScore ?? '-'}</td>
                <td className="px-4 py-2.5 text-right font-mono tabular">{duration(r.fastest)}</td>
                <td className="px-4 py-2.5 text-right font-mono tabular">{duration(r.fastestS)}</td>
                <td className="px-4 py-2.5 text-right font-mono tabular text-accent">{duration(r.fastestSPlus)}</td>
                <td className="px-4 py-2.5 text-right font-mono tabular">{int(r.mobsKilled)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

export default function Dungeons({ stats }) {
  const d = stats.dungeons;
  if (!d.played) return <Empty>This player has not entered the Catacombs on this profile.</Empty>;
  return (
    <div className="fade-in flex flex-col gap-6">
      <StatGrid>
        <Stat label="Catacombs" value={num(d.catacombs.exact, 2)} sub={d.catacombs.overflow ? `+${num(d.catacombs.overflow, 2)} overflow` : null} accent />
        <Stat label="Class average" value={num(d.classAverage, 2)} sub={d.selectedClass ? `Playing ${d.selectedClass}` : null} />
        <Stat label="Secrets" value={int(d.secrets)} sub={`${num(d.secretsPerRun, 2)} per run`} />
        <Stat label="Runs" value={int(d.completions.normal + d.completions.master)} sub={`${int(d.completions.master)} master mode`} />
      </StatGrid>
      <div className="grid gap-6 lg:grid-cols-[1fr_1.4fr]">
        <Panel title="Catacombs level">
          <LevelRow name="Catacombs" info={d.catacombs} />
        </Panel>
        <Panel title="Classes">
          <div className="grid gap-x-8 sm:grid-cols-2">
            {d.classes.map((c) => (
              <LevelRow
                key={c.id}
                name={c.name}
                info={c}
                note={c.id === d.selectedClass ? 'selected' : null}
                icon={<ItemSlot id={CLASS_ICONS[c.id]?.id} hint={{ color: CLASS_ICONS[c.id]?.color }} alt={`${c.name} class`} tooltip={false} />}
              />
            ))}
          </div>
        </Panel>
      </div>
      <FloorTable title="Catacombs floors" rows={d.floors} />
      <FloorTable title="Master mode" rows={d.masterFloors} />
    </div>
  );
}
