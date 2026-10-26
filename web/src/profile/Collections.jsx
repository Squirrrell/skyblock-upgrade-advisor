import { useMemo, useState } from 'react';
import { int } from '../lib/format.js';
import { loadCollections } from '../lib/data.js';
import { useLoad } from '../lib/useLoad.js';
import { Bar, Chip, Empty, ErrorNote, Loading, Panel, SearchInput, Stat, StatGrid } from '../ui.jsx';

function tierOf(amount, tiers) {
  let tier = 0;
  for (const t of tiers) if (amount >= t.amountRequired) tier = t.tier;
  const next = tiers.find((t) => t.tier === tier + 1);
  return { tier, next: next?.amountRequired ?? null };
}

function CollectionsPanel({ stats }) {
  const { data, error, loading, reload } = useLoad(loadCollections);
  const [cat, setCat] = useState('ALL');
  const [q, setQ] = useState('');
  const { total, mine } = stats.collections;

  const rows = useMemo(() => {
    if (!data?.collections) return [];
    const out = [];
    for (const [catId, category] of Object.entries(data.collections)) {
      for (const [id, item] of Object.entries(category.items ?? {})) {
        const amount = total[id] ?? 0;
        const { tier, next } = tierOf(amount, item.tiers ?? []);
        out.push({ id, cat: catId, catName: category.name, name: item.name, amount, mine: mine[id] ?? 0, tier, maxTier: item.maxTiers, next });
      }
    }
    return out;
  }, [data, total, mine]);

  if (loading) return <Loading />;
  if (error) return <ErrorNote error={error} onRetry={reload} />;

  const cats = [...new Set(rows.map((r) => r.cat))];
  const shown = rows.filter((r) => (cat === 'ALL' || r.cat === cat) && (!q || r.name.toLowerCase().includes(q.toLowerCase())));
  const maxed = rows.filter((r) => r.tier >= r.maxTier).length;
  const unlocked = rows.filter((r) => r.amount > 0).length;

  return (
    <>
      <StatGrid>
        <Stat label="Collections maxed" value={`${maxed} / ${rows.length}`} accent />
        <Stat label="Collections unlocked" value={`${unlocked} / ${rows.length}`} />
        <Stat label="Minion uniques" value={int(stats.minions.uniques)} sub={`of ${int(stats.minions.possible)}`} />
        <Stat label="Minion slots" value={stats.minions.slots + stats.minions.communitySlots} sub={`${stats.minions.slots} from crafting, ${stats.minions.communitySlots} community`} />
      </StatGrid>
      <Panel
        title="Collections"
        subtitle="Totals are summed across the coop, like the game does. Your own share is shown in grey."
        actions={<SearchInput value={q} onChange={setQ} placeholder="Find a collection" className="w-48" />}
      >
        <div className="scroll-x -mx-1 mb-4 flex gap-1.5 px-1">
          <Chip active={cat === 'ALL'} onClick={() => setCat('ALL')}>
            All
          </Chip>
          {cats.map((c) => (
            <Chip key={c} active={cat === c} onClick={() => setCat(c)}>
              {data.collections[c].name}
            </Chip>
          ))}
        </div>
        {stats.collections.apiOff && <p className="mb-3 text-sm text-warn">The collections API is off for this player, so only coop totals are known.</p>}
        <ul className="grid gap-x-8 gap-y-1 md:grid-cols-2">
          {shown.map((r) => (
            <li key={r.id} className="py-2">
              <div className="flex items-baseline justify-between gap-3 text-sm">
                <span className="truncate font-medium">{r.name}</span>
                <span className={`font-mono tabular ${r.tier >= r.maxTier ? 'text-accent' : ''}`}>
                  {r.tier} / {r.maxTier}
                </span>
              </div>
              <Bar value={r.next ? r.amount / r.next : 1} className="mt-1.5" />
              <div className="mt-1 flex justify-between text-xs text-muted">
                <span className="font-mono tabular">
                  {int(r.amount)}
                  {r.mine !== r.amount && ` (you ${int(r.mine)})`}
                </span>
                <span className="font-mono tabular">{r.next ? `next at ${int(r.next)}` : 'Maxed'}</span>
              </div>
            </li>
          ))}
        </ul>
      </Panel>
    </>
  );
}

function MinionsPanel({ stats }) {
  const m = stats.minions;
  const [showAll, setShowAll] = useState(false);
  const list = showAll ? m.list : m.list.filter((x) => x.tiers.length);
  return (
    <Panel
      title="Minions crafted"
      subtitle={m.nextSlotAt ? `${m.nextSlotAt - m.uniques} more unique crafts for the next minion slot (${m.nextSlotAt} uniques).` : 'Every crafting slot is unlocked.'}
      actions={
        <Chip active={showAll} onClick={() => setShowAll((s) => !s)}>
          Show uncrafted
        </Chip>
      }
    >
      <ul className="grid gap-x-8 gap-y-2 sm:grid-cols-2 lg:grid-cols-3">
        {list.map((x) => (
          <li key={x.type} className="py-1.5">
            <div className="flex justify-between text-sm">
              <span className="truncate">{x.name}</span>
              <span className={`font-mono tabular ${x.tiers.length >= x.maxTier ? 'text-accent' : 'text-muted'}`}>
                {x.tiers.length}/{x.maxTier}
              </span>
            </div>
            <div className="mt-1.5 flex gap-0.5" aria-label={`Tiers crafted: ${x.tiers.join(', ') || 'none'}`}>
              {Array.from({ length: x.maxTier }, (_, i) => (
                <span key={i} className={`h-1.5 flex-1 rounded-sm ${x.tiers.includes(i + 1) ? 'bg-accent' : 'bg-line'}`} />
              ))}
            </div>
          </li>
        ))}
      </ul>
      {!list.length && <Empty>No minions crafted.</Empty>}
    </Panel>
  );
}

export default function Collections({ stats }) {
  return (
    <div className="fade-in flex flex-col gap-6">
      <CollectionsPanel stats={stats} />
      <MinionsPanel stats={stats} />
    </div>
  );
}
