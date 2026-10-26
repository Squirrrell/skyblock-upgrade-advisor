import { coins, int } from '../lib/format.js';
import { Facts, Panel, Stat, StatGrid } from '../ui.jsx';

function Experiments({ e }) {
  const games = [
    ['Superpairs', e.superpairs],
    ['Chronomatron', e.chronomatron],
    ['Ultrasequencer', e.ultrasequencer],
  ];
  const TIERS = ['Beginner', 'High', 'Grand', 'Supreme', 'Transcendent', 'Metaphysical'];
  return (
    <Panel title="Experimentation table" subtitle={`${e.serums} Metaphysical Serums drunk.`}>
      <div className="grid gap-6 sm:grid-cols-3">
        {games.map(([name, rows]) => (
          <div key={name}>
            <h3 className="mb-2 text-sm font-medium">{name}</h3>
            {rows.length ? (
              <ul className="text-sm">
                {rows.map((r) => (
                  <li key={r.tier} className="flex justify-between border-b border-line/60 py-1 last:border-0">
                    <span className="text-muted">{TIERS[r.tier] ?? `Tier ${r.tier}`}</span>
                    <span className="font-mono tabular">
                      {r.best} <span className="text-muted">({r.claims})</span>
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted">Not played.</p>
            )}
          </div>
        ))}
      </div>
      <p className="mt-3 text-xs text-muted">Best score, with claims in brackets.</p>
    </Panel>
  );
}

export default function Misc({ stats }) {
  const m = stats.misc;
  const ch = stats.chocolate;
  return (
    <div className="fade-in flex flex-col gap-6">
      <StatGrid>
        <Stat label="Fairy souls" value={int(m.fairySouls.collected)} sub={`${m.fairySouls.unspent} unspent, ${m.fairySouls.exchanges} exchanges`} accent />
        <Stat label="Bestiary milestone" value={m.bestiary.milestone} sub={`${int(m.bestiary.kills)} kills, ${m.bestiary.mobs} mobs`} />
        <Stat label="Highest crit" value={m.highestCrit ? coins(m.highestCrit) : '-'} />
        <Stat label="Deaths" value={int(m.deaths)} />
      </StatGrid>

      {ch && (
        <Panel title="Chocolate Factory" subtitle="Hoppity's factory, from the Easter event data.">
          <StatGrid cols="sm:grid-cols-4">
            <Stat label="All-time chocolate" value={coins(ch.total)} accent />
            <Stat label="Prestige" value={ch.prestige} sub={`${coins(ch.sincePrestige)} since last`} />
            <Stat label="Unique rabbits" value={int(ch.uniqueRabbits)} sub={`${int(ch.duplicates)} duplicates`} />
            <Stat label="Time Tower" value={ch.timeTower} sub={`Barn ${ch.barn}`} />
          </StatGrid>
          <div className="mt-5">
            <Facts
              rows={[
                ...ch.employees.map((e) => [`Rabbit ${e.name}`, `Lvl ${e.level}`]),
                ['Rabbit Hitman slots', ch.hitmenSlots],
                ['Rarity upgrades', ch.rarityUpgrades],
                ['Multiplier upgrades', ch.multiplierUpgrades],
                ['Click upgrades', ch.clickUpgrades],
                ['Hidden rabbit spots found', ch.locationsFound],
              ]}
            />
          </div>
        </Panel>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Essence">
          <Facts rows={m.essence.map((e) => [e.name, int(e.amount)])} />
        </Panel>
        <Panel title="Most killed">
          <Facts rows={m.topKills.map((k) => [k.name, int(k.value)])} />
          {m.topDeaths.length > 0 && (
            <>
              <h3 className="mt-5 mb-2 text-sm font-medium">Most deaths to</h3>
              <Facts rows={m.topDeaths.map((k) => [k.name, int(k.value)])} />
            </>
          )}
        </Panel>
      </div>

      {m.experiments && <Experiments e={m.experiments} />}

      <div className="grid gap-6 lg:grid-cols-2">
        {m.auctions && (
          <Panel title="Auction house">
            <Facts
              rows={[
                ['Auctions created', int(m.auctions.created)],
                ['Sold', int(m.auctions.completed)],
                ['Coins earned', coins(m.auctions.earned)],
                ['Auctions won', int(m.auctions.won)],
                ['Bids placed', int(m.auctions.bids)],
                ['Coins spent', coins(m.auctions.spent)],
                ['Highest bid', coins(m.auctions.highestBid)],
                ['Fees paid', coins(m.auctions.fees)],
              ]}
            />
          </Panel>
        )}
        <Panel title="Other stats">
          <Facts
            rows={[
              ['Highest damage', m.highestDamage ? coins(m.highestDamage) : '-'],
              ['Sea creatures killed', int(m.seaCreatures)],
              ['Items fished', int(m.itemsFished)],
              ['Zealot special loot', int(m.zealotLoot)],
              m.gifts && ['Gifts given / received', `${int(m.gifts.total_given ?? 0)} / ${int(m.gifts.total_received ?? 0)}`],
              m.candy != null && ['Spooky candy', int(m.candy)],
              ['Essence shop perks', m.essencePerks],
              ['Soulflow', int(m.soulflow)],
              ...m.races.map((r) => [`${r.name} best`, `${(r.ms / 1000).toFixed(2)}s`]),
              m.dragons?.most_damage?.best && ['Best dragon damage', coins(m.dragons.most_damage.best)],
              m.dragons?.amount_summoned?.total && ['Dragons summoned', int(m.dragons.amount_summoned.total)],
            ]}
          />
        </Panel>
      </div>
    </div>
  );
}
