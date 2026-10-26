import { ago, int } from '../lib/format.js';
import { prettyId } from '../../../shared/analyze/helpers.js';
import { Facts, LevelRow, Panel, Stat, StatGrid } from '../ui.jsx';

export default function Mining({ stats }) {
  const m = stats.mining;
  const f = stats.foraging;
  return (
    <div className="fade-in flex flex-col gap-6">
      <StatGrid>
        <Stat label="Heart of the Mountain" value={m.hotm.level} sub={`${m.tokensSpent} tokens spent`} accent />
        {m.powder.map((p) => (
          <Stat key={p.type} label={`${prettyId(p.type)} powder`} value={int(p.current)} sub={`${int(p.total)} earned`} />
        ))}
      </StatGrid>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Heart of the Mountain">
          <LevelRow name="HOTM tier" info={m.hotm} />
          <Facts rows={[['Perks unlocked', m.nodes], ['Peak of the Mountain', m.peak || '-'], m.fossils != null && ['Fossils donated', m.fossils]]} />
        </Panel>
        <Panel title="The Forge" subtitle="Items currently forging, and when they went in.">
          {m.forge.length ? (
            <ul className="flex flex-col">
              {m.forge.map((p) => (
                <li key={`${p.slot}-${p.id}`} className="flex justify-between border-b border-line/60 py-2 text-sm last:border-0">
                  <span>
                    <span className="mr-2 font-mono text-muted tabular">#{p.slot}</span>
                    {prettyId(p.id)}
                  </span>
                  <span className="text-muted">{p.startTime ? `started ${ago(p.startTime)}` : ''}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted">Nothing in the forge.</p>
          )}
        </Panel>
      </div>

      {(m.crystals.length > 0 || m.corpses.length > 0) && (
        <div className="grid gap-6 lg:grid-cols-2">
          {m.crystals.length > 0 && (
            <Panel title="Crystal Hollows crystals">
              <Facts rows={m.crystals.map((c) => [c.name, `${c.state === 'FOUND' || c.state === 'PLACED' ? prettyId(c.state) : 'Missing'} (${c.found} found)`])} />
            </Panel>
          )}
          {m.corpses.length > 0 && (
            <Panel title="Glacite corpses looted">
              <Facts rows={m.corpses.map((c) => [c.name, int(c.count)])} />
            </Panel>
          )}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Heart of the Forest" subtitle="The Galatea foraging tree.">
          <LevelRow name="HOTF tier" info={f.hotf} />
          <Facts rows={[['Tokens spent', f.tokensSpent], ['Perks unlocked', f.nodes], ['Hina task tier', f.hinaTier], ['Fish family found', f.fishFamily]]} />
        </Panel>
        <Panel title="Tree gifts and Starlyn">
          <Facts
            rows={[
              ...f.gifts.map((g) => [`${g.name} gifts`, `${int(g.count)} (milestone ${g.milestone})`]),
              ...f.starlynBests.map((b) => [`Starlyn best: ${b.name}`, int(b.value)]),
            ]}
          />
          {!f.gifts.length && !f.starlynBests.length && <p className="text-sm text-muted">No Galatea progress yet.</p>}
        </Panel>
      </div>
    </div>
  );
}
