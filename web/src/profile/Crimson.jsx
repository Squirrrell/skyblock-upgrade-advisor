import { duration, int } from '../lib/format.js';
import { Facts, Panel, Stat, StatGrid } from '../ui.jsx';

export default function Crimson({ stats }) {
  const c = stats.crimson;
  const r = stats.rift;
  const tf = c.trophyFish;
  const caughtTypes = tf.list.filter((f) => f.total > 0).length;
  return (
    <div className="fade-in flex flex-col gap-6">
      <StatGrid>
        <Stat label="Faction" value={c.faction ? (c.faction === 'mages' ? 'Mages' : 'Barbarians') : 'None'} accent />
        <Stat label="Mage reputation" value={int(c.mages.rep)} sub={c.mages.rank} />
        <Stat label="Barbarian reputation" value={int(c.barbarians.rep)} sub={c.barbarians.rank} />
        <Stat label="Dojo belt" value={c.belt} sub={`${int(c.dojoTotal)} points`} />
      </StatGrid>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Kuudra">
          <Facts rows={c.kuudra.map((k) => [k.name, `${int(k.completions)} runs${k.highestWave ? `, wave ${k.highestWave}` : ''}`])} />
        </Panel>
        <Panel title="Dojo">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-muted">
                <th className="py-1.5 text-left font-medium">Test</th>
                <th className="py-1.5 text-right font-medium">Points</th>
                <th className="py-1.5 text-right font-medium">Grade</th>
                <th className="py-1.5 text-right font-medium">Time</th>
              </tr>
            </thead>
            <tbody>
              {c.dojo.map((t) => (
                <tr key={t.id} className="border-t border-line/60">
                  <td className="py-1.5">{t.name}</td>
                  <td className="py-1.5 text-right font-mono tabular">{int(t.points)}</td>
                  <td className={`py-1.5 text-right font-mono ${t.grade === 'S' ? 'text-accent' : ''}`}>{t.grade}</td>
                  <td className="py-1.5 text-right font-mono text-muted tabular">{t.time ? duration(t.time) : '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>
      </div>

      <Panel title="Trophy fish" subtitle={`${int(tf.total)} caught, ${caughtTypes} of ${tf.list.length} kinds, ${tf.rewards} rewards claimed from Odger.`} pad={false}>
        <div className="scroll-x">
          <table className="w-full min-w-[520px] text-sm">
            <thead>
              <tr className="border-b border-line text-xs text-muted">
                {['Fish', 'Bronze', 'Silver', 'Gold', 'Diamond', 'Total'].map((h, i) => (
                  <th key={h} className={`px-4 py-2.5 font-medium ${i ? 'text-right' : 'text-left'}`}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tf.list.map((f) => (
                <tr key={f.id} className={`border-b border-line/60 last:border-0 ${f.total ? '' : 'text-muted'}`}>
                  <td className="px-4 py-2">{f.name}</td>
                  {['bronze', 'silver', 'gold', 'diamond'].map((t) => (
                    <td key={t} className={`px-4 py-2 text-right font-mono tabular ${t === 'diamond' && f[t] ? 'r-divine' : ''}`}>
                      {f[t] || '-'}
                    </td>
                  ))}
                  <td className="px-4 py-2 text-right font-mono tabular">{f.total || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <Panel title="The Rift">
        {r.visited ? (
          <Facts
            rows={[
              ['Motes in purse', int(r.motes)],
              ['Lifetime motes', int(r.lifetimeMotes)],
              ['Visits', int(r.visits)],
              ['Enigma souls', int(r.enigmaSouls)],
              ['Timecharms', r.timecharms],
              ['Montezuma cats found', `${r.catsFound}${r.montezuma ? ', pet unlocked' : ''}`],
              ['Wither cage eyes', r.eyesKilled],
              ['Areas unlocked', r.areas.join(', ') || '-'],
            ]}
          />
        ) : (
          <p className="text-sm text-muted">Never visited the Rift.</p>
        )}
      </Panel>

      {c.lastMinibosses.length > 0 && (
        <Panel title="Recent Crimson Isle minibosses">
          <p className="text-sm">{c.lastMinibosses.join(', ')}</p>
          <p className="mt-2 text-sm text-muted">Matriarch pearls collected: {c.matriarchPearls}</p>
        </Panel>
      )}
    </div>
  );
}
