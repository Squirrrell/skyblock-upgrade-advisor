// The shard fusion optimiser: what to fuse from the shards a player holds in
// the Hunting Box. Recipes are SkyShards' (MIT), prices the live bazaar. Three
// views: the best plan for the whole pile, every fusion the player can do
// (optionally buying the other shard), and shards they have never had that a
// fusion can make. Logic lives in shared/fusions.js.
//
// This page alone uses the look of the Shard Fusion Flips site
// (squirrrell.github.io/skyblock-shard-fusions), scoped under .sf in
// fusions/fusions.css.
import { ArrowRightIcon, MagnifyingGlassIcon, PlusIcon, WarningIcon } from '@phosphor-icons/react';
import { useMemo, useState } from 'react';
import { bestPlan, fusionsYouCanDo, indexFusions, newShards, shardPrices } from '../../../shared/fusions.js';
import { loadBazaar, loadFusionData } from '../lib/data.js';
import { coins, int } from '../lib/format.js';
import { useLoad } from '../lib/useLoad.js';
import { useReport } from '../lib/useReport.js';
import '../fusions/fusions.css';

const ICONS = 'https://raw.githubusercontent.com/Campionnn/SkyShards/master/public/shardIcons/';
const VIEWS = [
  ['plan', 'Best plan'],
  ['all', 'Every fusion'],
  ['new', 'New shards'],
];
const PAGE = 50;

async function loadAll() {
  const [data, bazaar] = await Promise.all([loadFusionData(), loadBazaar()]);
  return { index: indexFusions(data), products: bazaar.products ?? {}, updated: bazaar.lastUpdated };
}

const signed = (n) => `${n >= 0 ? '+' : '-'}${coins(Math.abs(n))}`;
const tone = (n) => (n > 0 ? 'gain' : n < 0 ? 'loss' : '');

// ------------------------------------------------------------------ pieces

function Segmented({ label, value, options, onChange }) {
  return (
    <div className="segmented" role="radiogroup" aria-label={label}>
      {options.map(([id, text]) => (
        <button key={id} type="button" role="radio" aria-checked={value === id} onClick={() => onChange(id)}>
          {text}
        </button>
      ))}
    </div>
  );
}

/** A shard as SkyShards draws it: icon, name in its rarity colour, rarity letter, count. */
function Shard({ id, shards, qty, bought, name = true }) {
  const s = shards[id];
  const rarity = s?.rarity?.toLowerCase() || 'common';
  return (
    <span className="shard" data-rarity={rarity} title={`${s?.name ?? id} (${rarity}${s?.family ? `, ${s.family}` : ''})`}>
      {s?.code && <img src={`${ICONS}${s.code}.png`} alt="" width="24" height="24" loading="lazy" />}
      {name && <span className="shard-name">{s?.name ?? id.replace(/^SHARD_/, '')}</span>}
      {name && <span className="rarity-letter">{rarity[0].toUpperCase()}</span>}
      {qty > 1 && <span className="qty">×{qty}</span>}
      {bought && <span className="buy-tag">buy</span>}
    </span>
  );
}

function FusionCell({ row, shards }) {
  return (
    <span className="fusion-cell">
      {row.inputs.map((i, n) => (
        <span key={i.id} className="contents">
          {n > 0 && <PlusIcon size={12} className="plus" aria-hidden="true" />}
          <Shard id={i.id} qty={i.count} bought={i.bought} shards={shards} />
        </span>
      ))}
    </span>
  );
}

function ResultCell({ output, shards, reptile, alts }) {
  return (
    <span className="result-cell">
      <ArrowRightIcon size={14} className="arrow" aria-hidden="true" />
      <Shard id={output.id} qty={output.qty} shards={shards} />
      {reptile && <span className="reptile-tag">Reptile</span>}
      {alts > 0 && (
        <span className="alt-count" title="Other outputs this fusion can give">
          +{alts}
        </span>
      )}
    </span>
  );
}

function PlayerField({ initial, onPlayer }) {
  const [q, setQ] = useState(initial);
  return (
    <form
      className="control-group player"
      onSubmit={(e) => {
        e.preventDefault();
        if (q.trim()) onPlayer(q.trim());
      }}
    >
      <label className="label" htmlFor="sf-player">
        Player
      </label>
      <div className="player-row">
        <div className="field-icon">
          <MagnifyingGlassIcon size={16} aria-hidden="true" />
          <input className="field nx-plain" id="sf-player" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Player name" autoComplete="off" spellCheck="false" />
        </div>
        <button type="submit" className="btn">
          Look up
        </button>
      </div>
    </form>
  );
}

// ------------------------------------------------------------------ overview

function Overview({ result, report, held, shards }) {
  const top = result.all.find((r) => !r.buys && r.profit > 0) ?? null;
  const plan = result.plan;
  return (
    <section className="overview" aria-label="Best fusion with your shards">
      <div className="pick">
        <h2 className="pick-title">Best fusion with your shards right now</h2>
        {top ? (
          <>
            <div className="pick-flow">
              {top.inputs.map((i, n) => (
                <span key={i.id} className="contents">
                  {n > 0 && <span className="op">+</span>}
                  <Shard id={i.id} qty={i.count} shards={shards} />
                </span>
              ))}
              <span className="op">
                <ArrowRightIcon size={18} aria-hidden="true" />
              </span>
              <Shard id={top.output.id} qty={top.output.qty} shards={shards} />
            </div>
            <div className="pick-numbers">
              <div className="metric big">
                <span>Profit per fusion</span>
                <strong>{signed(top.profit)}</strong>
              </div>
              <div className="metric">
                <span>You can do it</span>
                <strong>×{int(top.times)}</strong>
              </div>
              <div className="metric">
                <span>All of them</span>
                <strong>{signed(top.total)}</strong>
              </div>
              <div className="metric">
                <span>Inputs would sell for</span>
                <strong>{coins(top.cost)}</strong>
              </div>
            </div>
          </>
        ) : (
          <p className="pick-empty">No fusion of your shards pays more than selling them right now.</p>
        )}
      </div>
      <div className="stats">
        <div className="metric">
          <span>Shards in the Hunting Box</span>
          <strong>{int(Object.values(held).reduce((t, n) => t + n, 0))}</strong>
          <small>
            {Object.keys(held).length} kinds · {report.player.name} on {report.profile.name}
          </small>
        </div>
        <div className="metric">
          <span>Worth if sold</span>
          <strong>{coins(result.worth)}</strong>
          <small>After bazaar tax</small>
        </div>
        <div className="metric">
          <span>Best plan</span>
          <strong className={tone(plan.profit)}>{signed(plan.profit)}</strong>
          <small>
            {int(plan.fusions)} fusions in {plan.steps.length} steps
          </small>
        </div>
      </div>
    </section>
  );
}

// ------------------------------------------------------------------ tables

function PlanTable({ plan, shards }) {
  return (
    <table className="fusions">
      <thead>
        <tr>
          <th className="col-rank" scope="col">
            Step
          </th>
          <th scope="col">Fusion</th>
          <th scope="col">Result</th>
          <th className="num" scope="col">
            Runs
          </th>
          <th className="num col-hide-sm" scope="col">
            Profit each
          </th>
          <th className="num" scope="col">
            Profit
          </th>
        </tr>
      </thead>
      <tbody>
        {plan.steps.length === 0 && <Empty title="Nothing to fuse" text="No fusion of your shards pays more than selling them right now." />}
        {plan.steps.map((s, n) => (
          <tr key={`${s.key}-${n}`} className="row">
            <td className="col-rank num">{n + 1}</td>
            <td>
              <FusionCell row={s} shards={shards} />
            </td>
            <td>
              <ResultCell output={s.output} shards={shards} reptile={s.reptile} alts={s.alternatives.length} />
            </td>
            <td className="num">×{int(s.times)}</td>
            <td className={`num col-hide-sm ${tone(s.profit)}`}>{signed(s.profit)}</td>
            <td className={`num ${tone(s.total)}`}>{signed(s.total)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function AllTable({ rows, shards, limit }) {
  return (
    <table className="fusions">
      <thead>
        <tr>
          <th className="col-rank" scope="col">
            #
          </th>
          <th scope="col">Fusion</th>
          <th scope="col">Result</th>
          <th className="num col-hide-sm" scope="col">
            Cost
          </th>
          <th className="num col-hide-sm" scope="col">
            Revenue
          </th>
          <th className="num" scope="col">
            Profit
          </th>
          <th className="num col-hide-sm" scope="col">
            ROI
          </th>
          <th className="num" scope="col">
            Runs
          </th>
        </tr>
      </thead>
      <tbody>
        {rows.length === 0 && <Empty title="No fusions match" text="Try another search, or buy the missing shards." />}
        {rows.slice(0, limit).map((r, n) => (
          <tr key={r.key} className="row">
            <td className="col-rank num">{n + 1}</td>
            <td>
              <FusionCell row={r} shards={shards} />
            </td>
            <td>
              <ResultCell output={r.output} shards={shards} reptile={r.reptile} alts={r.alternatives.length} />
            </td>
            <td className="num col-hide-sm">{coins(r.cost)}</td>
            <td className="num col-hide-sm">{coins(r.output.value)}</td>
            <td className={`num ${tone(r.profit)}`}>{signed(r.profit)}</td>
            <td className={`num col-hide-sm ${tone(r.profit)}`}>{r.cost ? `${Math.round((r.profit / r.cost) * 100)}%` : '-'}</td>
            <td className="num">×{int(r.times)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function NewTable({ list, shards, limit, prices }) {
  return (
    <table className="fusions">
      <thead>
        <tr>
          <th className="col-rank" scope="col">
            #
          </th>
          <th scope="col">Fusion</th>
          <th scope="col">New shard</th>
          <th className="num col-hide-sm" scope="col">
            Inputs sell for
          </th>
          <th className="num col-hide-sm" scope="col">
            It sells for
          </th>
          <th className="num" scope="col">
            Vs selling
          </th>
        </tr>
      </thead>
      <tbody>
        {list.length === 0 && <Empty title="Nothing new" text="Every shard your shards can make is one you've had already." />}
        {list.slice(0, limit).map((n, i) => (
          <tr key={n.id} className="row">
            <td className="col-rank num">{i + 1}</td>
            <td>
              <FusionCell row={n.via} shards={shards} />
            </td>
            <td>
              <ResultCell output={{ id: n.id, qty: n.qty }} shards={shards} reptile={n.via.reptile} alts={0} />
            </td>
            <td className="num col-hide-sm">{coins(n.via.cost)}</td>
            <td className="num col-hide-sm">{prices.sell(n.id) == null ? '-' : coins(prices.sell(n.id) * n.qty)}</td>
            <td className={`num ${tone(-n.net)}`}>{signed(-n.net)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

const Empty = ({ title, text }) => (
  <tr className="empty">
    <td colSpan={8}>
      <strong>{title}</strong>
      {text}
    </td>
  </tr>
);

function Skeleton() {
  return (
    <section className="results" aria-busy="true" aria-label="Loading the shards and recipes">
      <table className="fusions">
        <tbody>
          {Array.from({ length: 8 }, (_, n) => (
            <tr key={n} className="skeleton">
              {[18, 62, 44, 30, 30].map((w, i) => (
                <td key={i}>
                  <span style={{ width: `${w}%` }} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

// ------------------------------------------------------------------ page

export default function Fusions({ route, onRoute }) {
  const player = route?.player ?? '';
  const [retry, setRetry] = useState(0);
  const { status, report, error } = useReport(player, route?.profile, retry);
  const prices$ = useLoad(loadAll);
  const [view, setView] = useState('plan');
  const [sellMode, setSellMode] = useState('instaSell');
  // 'none' uses only the player's shards; otherwise how the missing shard is bought.
  const [buy, setBuy] = useState('none');
  const buyMissing = buy !== 'none';
  const buyMode = buy === 'buyOrder' ? 'buyOrder' : 'instaBuy';
  const [tax, setTax] = useState(1.25);
  const [croc, setCroc] = useState(null);
  const [q, setQ] = useState('');
  const [limit, setLimit] = useState(PAGE);

  const rows = report?.stats?.shards?.list ?? [];
  const held = useMemo(() => Object.fromEntries(rows.filter((r) => r.owned > 0).map((r) => [r.id, r.owned])), [rows]);
  const known = useMemo(() => new Set(rows.filter((r) => r.owned > 0 || r.captured || r.syphoned > 0).map((r) => r.id)), [rows]);
  // Pure Reptile comes from the Crocodile shard's attribute; it can be changed here.
  const ownCroc = rows.find((r) => r.id === 'SHARD_CROCODILE')?.level ?? 0;
  const crocodile = croc ?? ownCroc;

  const data = prices$.data;
  const prices = useMemo(() => (data ? shardPrices(data.products, { sellMode, buyMode, tax: tax / 100 }) : null), [data, sellMode, buyMode, tax]);
  const result = useMemo(() => {
    if (!data || !prices || !report) return null;
    const opts = { crocodile };
    return {
      plan: bestPlan(data.index, held, prices, opts),
      all: fusionsYouCanDo(data.index, held, prices, { ...opts, buyMissing }),
      fresh: newShards(data.index, held, known, prices, opts),
      worth: Object.entries(held).reduce((t, [id, n]) => t + (prices.sell(id) ?? 0) * n, 0),
    };
  }, [data, prices, report, held, known, crocodile, buyMissing]);

  const shards = data?.index.shards;
  const needle = q.trim().toLowerCase();
  const nameOf = (id) => (shards?.[id]?.name ?? id).toLowerCase();
  const match = (output, inputs) => !needle || [output, ...inputs.map((i) => i.id)].some((id) => nameOf(id).includes(needle));
  const shownAll = result?.all.filter((r) => match(r.output.id, r.inputs)) ?? [];
  const shownNew = result?.fresh.filter((n) => match(n.id, n.via.inputs)) ?? [];
  const total = view === 'all' ? shownAll.length : view === 'new' ? shownNew.length : (result?.plan.steps.length ?? 0);
  const failed = (status === 'error' && error) || prices$.error;

  return (
    <div className="sf fade-in">
      <section className="controls" aria-label="Player and pricing">
        <PlayerField key={player} initial={player} onPlayer={(name) => onRoute({ player: name })} />
        <div className="control-group">
          <span className="label">Sell output with</span>
          <Segmented
            label="Sell output with"
            value={sellMode}
            onChange={setSellMode}
            options={[
              ['instaSell', 'Insta-sell'],
              ['sellOffer', 'Sell offer'],
            ]}
          />
        </div>
        <div className="control-group">
          <span className="label">Missing shards</span>
          <Segmented
            label="Missing shards"
            value={buy}
            onChange={(v) => {
              setBuy(v);
              setLimit(PAGE);
            }}
            options={[
              ['none', "Don't buy"],
              ['instaBuy', 'Insta-buy'],
              ['buyOrder', 'Buy order'],
            ]}
          />
        </div>
        <div className="control-group narrow">
          <label className="label" htmlFor="sf-tax">
            Bazaar tax %
          </label>
          <input className="field nx-plain" id="sf-tax" type="number" min="0" max="10" step="0.125" inputMode="decimal" value={tax} onChange={(e) => setTax(Math.max(0, Number(e.target.value) || 0))} />
        </div>
        <div className="control-group narrow">
          <label className="label" htmlFor="sf-croc" title="Pure Reptile: 2% chance per level to double the output of fusions with a Reptile input">
            Crocodile level{croc == null && report ? ' (yours)' : ''}
          </label>
          <input
            className="field nx-plain"
            id="sf-croc"
            type="number"
            min="0"
            max="10"
            step="1"
            inputMode="numeric"
            value={crocodile}
            onChange={(e) => setCroc(Math.min(10, Math.max(0, Math.round(Number(e.target.value) || 0))))}
          />
        </div>
        <div className="control-group grow">
          <label className="label" htmlFor="sf-search">
            Search shard
          </label>
          <div className="field-icon">
            <MagnifyingGlassIcon size={16} aria-hidden="true" />
            <input
              className="field nx-plain"
              id="sf-search"
              type="search"
              placeholder="Any input or output, e.g. Kiwi"
              autoComplete="off"
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setLimit(PAGE);
              }}
            />
          </div>
        </div>
      </section>

      {!player && (
        <section className="results">
          <table className="fusions">
            <tbody>
              <Empty title="Look up a player" text="Their Hunting Box shards are matched against every fusion recipe and the live bazaar." />
            </tbody>
          </table>
        </section>
      )}

      {player && failed && (
        <div className="banner" role="alert">
          <WarningIcon size={18} aria-hidden="true" />
          <span>{failed.message ?? 'Something went wrong.'}</span>
          <button
            type="button"
            className="btn"
            onClick={() => {
              setRetry((n) => n + 1);
              prices$.reload();
            }}
          >
            Try again
          </button>
        </div>
      )}

      {player && !failed && !result && <Skeleton />}

      {result && (
        <>
          <Overview result={result} report={report} held={held} shards={shards} />
          <section className="results" aria-label="Fusions">
            <div className="results-head">
              <Segmented
                label="View"
                value={view}
                onChange={(v) => {
                  setView(v);
                  setLimit(PAGE);
                }}
                options={VIEWS.map(([id, text]) => [id, id === 'all' ? `${text} · ${int(result.all.length)}` : id === 'new' ? `${text} · ${int(result.fresh.length)}` : text])}
              />
              <span className="results-note">
                {view === 'plan' && 'Run these in order; a step can use what an earlier one made. Profit is against selling the shards.'}
                {view === 'all' && (buyMissing ? 'Your shards, plus fusions where you buy the other one.' : 'Fusions you can do with only your shards.')}
                {view === 'new' && "Shards you've never had, from your shards. Each is a unique for the Hunting Box."}
              </span>
            </div>
            <div className="table-scroll">
              {view === 'plan' && <PlanTable plan={result.plan} shards={shards} />}
              {view === 'all' && <AllTable rows={shownAll} shards={shards} limit={limit} />}
              {view === 'new' && <NewTable list={shownNew} shards={shards} limit={limit} prices={prices} />}
            </div>
            <div className="table-foot">
              <span>
                {view === 'plan' ? `${int(total)} steps` : `Showing ${int(Math.min(limit, total))} of ${int(total)}`}
              </span>
              {view !== 'plan' && total > limit && (
                <button type="button" className="btn" onClick={() => setLimit((l) => l + PAGE)}>
                  Show {Math.min(PAGE, total - limit)} more
                </button>
              )}
            </div>
          </section>
        </>
      )}

      <footer className="footer">
        <p>
          Prices from the Hypixel Bazaar API. Fusion recipes and shard icons from{' '}
          <a href="https://github.com/Campionnn/SkyShards" target="_blank" rel="noreferrer">
            SkyShards
          </a>{' '}
          (MIT). Only shards in the Hunting Box count. Profit assumes you pick the most valuable output; with a Crocodile level set, reptile fusions use the average
          output from Pure Reptile doubling.
        </p>
      </footer>
    </div>
  );
}
