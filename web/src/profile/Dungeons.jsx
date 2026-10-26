import { duration, int, num } from '../lib/format.js';
import { Empty, LevelRow, Panel, Stat, StatGrid } from '../ui.jsx';

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
                <td className="px-4 py-2.5 font-medium">{r.floor}</td>
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
              <LevelRow key={c.id} name={c.name} info={c} note={c.id === d.selectedClass ? 'selected' : null} />
            ))}
          </div>
        </Panel>
      </div>
      <FloorTable title="Catacombs floors" rows={d.floors} />
      <FloorTable title="Master mode" rows={d.masterFloors} />
    </div>
  );
}
