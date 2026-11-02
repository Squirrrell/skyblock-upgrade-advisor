// The Dungeons tab, on one screen: Catacombs and the headline stats share one
// row, the five classes another, and the Catacombs and Master Mode floors sit
// side by side in two tables; the less-used times and mob kills are in a hover
// on each floor.
import { duration, int, num } from '../lib/format.js';
import { ItemSlot, tooltipProps } from '../mc.jsx';
import { CLASS_ICONS, FLOOR_BOSSES } from '../theme.js';
import { Bar, Empty } from '../ui.jsx';

// The same surface as every other panel and stat tile, in both designs.
const SURFACE = 'border border-line bg-surface shadow-panel';

const bossOf = (floor) => FLOOR_BOSSES[floor === 'Entrance' ? 0 : Number(floor.slice(1))] ?? null;

/** Hover lines for one floor: every time it records, plus mobs killed. */
const floorLines = (r, label) =>
  r
    ? [
        { text: label, color: 'var(--code-yellow)' },
        `Completions: ${int(r.completions)}`,
        `Best score: ${r.bestScore ?? '-'}`,
        `Fastest: ${duration(r.fastest)}`,
        `Fastest S: ${duration(r.fastestS)}`,
        { text: `Fastest S+: ${duration(r.fastestSPlus)}`, color: 'var(--code-green)' },
        `Mobs killed: ${int(r.mobsKilled)}`,
      ]
    : [];

function LevelStat({ label, info, accent }) {
  const maxed = info.maxed && !info.overflow;
  return (
    <div className={`dg-tile dg-tile-wide ${SURFACE}`}>
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-sm text-muted">{label}</span>
        <span className="text-xs text-muted tabular">{maxed ? 'Maxed' : `${int(info.toNext)} XP to ${Math.floor(info.exact ?? info.level) + 1}`}</span>
      </div>
      <div className={`mt-1 text-2xl font-semibold tabular ${accent ? 'text-accent' : ''}`}>
        {num(info.exact ?? info.level, 2)}
        {info.overflow ? <span className="ml-2 text-sm font-normal text-muted">+{num(info.overflow, 2)} overflow</span> : null}
      </div>
      <Bar value={info.progress} className="mt-2" gold={info.maxed} />
    </div>
  );
}

const Tile = ({ label, value, sub }) => (
  <div className={`dg-tile ${SURFACE}`}>
    <span className="text-sm text-muted">{label}</span>
    <div className="mt-1 text-2xl font-semibold tabular">{value}</div>
    {sub && <div className="mt-0.5 truncate text-xs text-muted">{sub}</div>}
  </div>
);

/** One mode's floors: boss, runs, best score and fastest S+; every time in a hover. */
function FloorTable({ title, rows, empty }) {
  const played = rows.filter((r) => r.completions > 0);
  return (
    <section className={SURFACE} aria-label={`${title} floors`}>
      <h2 className="px-3 pt-2.5 font-semibold">{title}</h2>
      {played.length === 0 ? (
        <p className="px-3 pt-1 pb-3 text-sm text-muted">{empty ?? 'No runs yet.'}</p>
      ) : (
        <table className="dg-floors w-full text-sm">
          <thead>
            <tr className="text-xs text-muted">
              <th>Floor</th>
              <th>Runs</th>
              <th>Best</th>
              <th>Fastest S+</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const boss = bossOf(r.floor);
              return (
                <tr key={r.floor} {...tooltipProps({ name: `${r.floor}${boss ? `: ${boss.name}` : ''}`, lines: floorLines(r, title) })}>
                  <td>
                    <span className="flex min-w-0 items-center gap-2">
                      {boss && <ItemSlot id={boss.icon} alt={boss.name} tooltip={false} />}
                      <span className="font-medium">{r.floor}</span>
                      {boss && <span className="truncate text-xs text-muted">{boss.name}</span>}
                    </span>
                  </td>
                  <td>{int(r.completions)}</td>
                  <td>{r.bestScore ?? '-'}</td>
                  <td className="text-accent">{duration(r.fastestSPlus)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </section>
  );
}

export default function Dungeons({ stats }) {
  const d = stats.dungeons;
  if (!d.played) return <Empty>This player has not entered the Catacombs on this profile.</Empty>;
  return (
    <div className="dg-compact fade-in flex flex-col gap-4">
      <div className="dg-top">
        <LevelStat label="Catacombs" info={d.catacombs} accent />
        <Tile label="Class average" value={num(d.classAverage, 2)} sub={d.selectedClass ? `Playing ${d.selectedClass}` : null} />
        <Tile label="Secrets" value={int(d.secrets)} sub={`${num(d.secretsPerRun, 2)} per run`} />
        <Tile label="Runs" value={int(d.completions.normal + d.completions.master)} sub={`${int(d.completions.master)} in Master Mode`} />
      </div>

      <ul className="dg-classes" aria-label="Classes">
        {d.classes.map((c) => (
          <li key={c.id} className={`dg-tile ${SURFACE} ${c.id === d.selectedClass ? 'is-selected' : ''}`}>
            <div className="flex items-center gap-2.5">
              <ItemSlot id={CLASS_ICONS[c.id]?.id} hint={{ color: CLASS_ICONS[c.id]?.color }} alt={`${c.name} class`} tooltip={false} />
              <span className="min-w-0">
                <span className="block truncate text-sm">
                  {c.name}
                  {c.id === d.selectedClass && <span className="ml-1.5 text-xs text-accent">selected</span>}
                </span>
                <span className="block text-lg font-semibold tabular leading-tight">{num(c.exact ?? c.level, 2)}</span>
              </span>
            </div>
            <Bar value={c.progress} className="mt-2" gold={c.maxed} />
          </li>
        ))}
      </ul>

      <div className="dg-modes">
        <FloorTable title="Catacombs" rows={d.floors} />
        <FloorTable title="Master Mode" rows={d.masterFloors} empty="No Master Mode runs yet." />
      </div>
    </div>
  );
}
