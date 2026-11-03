// Shard fusions from the shards a player already holds. Recipes come from
// SkyShards' fusion-data.json (github.com/Campionnn/SkyShards, MIT), which is
// keyed by output: recipes[outputCode][qty] = [[inputA, inputB], ...], with
// shards keyed by code ("C1", "R45") and carrying the bazaar id, rarity and
// how many of it one fusion takes (fuse_amount).
//
// Every fusion is valued at what its shards sell for: using a shard you hold
// costs what selling it would have brought, so a fusion is worth doing when
// its output sells for more than its inputs do. Shards you buy cost the buy
// price instead.

export const SKYSHARDS_URL = 'https://raw.githubusercontent.com/Campionnn/SkyShards/master/public/fusion-data.json';

/** Pure Reptile (the Crocodile attribute): each level is a 2% chance to double a Reptile fusion's output. */
export const crocodileMultiplier = (level) => 1 + 0.02 * (level || 0);

const isReptile = (shard) => /Reptile/.test(shard?.family ?? '');

/**
 * The recipes turned around into fusions: one per ordered input pair, with
 * every output it can offer. Shards are re-keyed by bazaar id (SHARD_X).
 */
export function indexFusions(data) {
  const shards = {};
  const codeToId = {};
  for (const [code, s] of Object.entries(data?.shards ?? {})) {
    if (!s?.internal_id) continue;
    codeToId[code] = s.internal_id;
    shards[s.internal_id] = { id: s.internal_id, code, name: s.name, rarity: String(s.rarity ?? '').toUpperCase(), family: s.family ?? '', amount: s.fuse_amount || 5 };
  }
  const byPair = new Map();
  for (const [out, byQty] of Object.entries(data?.recipes ?? {})) {
    const outId = codeToId[out];
    if (!outId) continue;
    for (const [qty, pairs] of Object.entries(byQty)) {
      for (const [ca, cb] of pairs) {
        const a = codeToId[ca];
        const b = codeToId[cb];
        if (!a || !b) continue;
        const key = `${a}|${b}`;
        let f = byPair.get(key);
        if (!f) {
          f = { key, a, b, reptile: isReptile(shards[a]) || isReptile(shards[b]), outputs: [] };
          byPair.set(key, f);
        }
        f.outputs.push({ id: outId, qty: Number(qty) || 1 });
      }
    }
  }
  const fusions = [...byPair.values()];
  // Fusions by the shards they use, so planning only looks at what is held.
  const byInput = new Map();
  for (const f of fusions) {
    for (const id of f.a === f.b ? [f.a] : [f.a, f.b]) {
      if (!byInput.has(id)) byInput.set(id, []);
      byInput.get(id).push(f);
    }
  }
  return { shards, fusions, byInput };
}

/**
 * Unit prices from Hypixel's bazaar products. `sellMode` is 'instaSell' (the
 * top buy order) or 'sellOffer' (the lowest sell offer); `buyMode` is
 * 'instaBuy' (the lowest offer) or 'buyOrder' (the top order). `tax` is a
 * fraction taken off every sale.
 */
export function shardPrices(products, { sellMode = 'instaSell', buyMode = 'instaBuy', tax = 0.0125 } = {}) {
  const qs = (id) => products?.[id]?.quick_status;
  const pick = (id, high) => {
    const q = qs(id);
    const v = high ? q?.buyPrice : q?.sellPrice;
    return v > 0 ? v : null;
  };
  return {
    // What one shard brings when sold, after tax.
    sell: (id) => {
      const v = pick(id, sellMode === 'sellOffer');
      return v == null ? null : v * (1 - tax);
    },
    // What one shard costs to buy.
    buy: (id) => pick(id, buyMode === 'instaBuy'),
    // Bought this week, for spotting shards that barely trade.
    volume: (id) => Math.min(qs(id)?.buyMovingWeek ?? 0, qs(id)?.sellMovingWeek ?? 0),
  };
}

/** The input counts one run of a fusion takes: { [id]: count }. */
function needs(f, shards) {
  const na = shards[f.a].amount;
  const nb = shards[f.b].amount;
  return f.a === f.b ? { [f.a]: na + nb } : { [f.a]: na, [f.b]: nb };
}

/** The fusion's most valuable output, at `mult` average output (Pure Reptile). */
function bestOutput(f, prices, mult) {
  let best = null;
  for (const o of f.outputs) {
    const unit = prices.sell(o.id);
    if (unit == null) continue;
    const qty = o.qty * (f.reptile ? mult : 1);
    const value = unit * qty;
    if (!best || value > best.value) best = { ...o, unit, expected: qty, value };
  }
  return best;
}

/**
 * Every fusion the player can do at least once, best first. `held` is
 * { [SHARD_X]: count }. With `buyMissing`, fusions where only one input is
 * held are included too, with the other input bought.
 */
export function fusionsYouCanDo(index, held, prices, { crocodile = 0, buyMissing = false } = {}) {
  const { shards, byInput } = index;
  const mult = crocodileMultiplier(crocodile);
  const seen = new Set();
  const rows = [];
  for (const id of Object.keys(held)) {
    if (!(held[id] > 0)) continue;
    for (const f of byInput.get(id) ?? []) {
      if (seen.has(f.key)) continue;
      seen.add(f.key);
      const need = needs(f, shards);
      const inputs = [];
      let cost = 0;
      let times = Infinity;
      let ok = true;
      for (const [inId, n] of Object.entries(need)) {
        const have = held[inId] ?? 0;
        if (have >= n) {
          const unit = prices.sell(inId);
          if (unit == null) {
            ok = false;
            break;
          }
          inputs.push({ id: inId, count: n, unit, bought: false });
          cost += unit * n;
          times = Math.min(times, Math.floor(have / n));
        } else if (buyMissing) {
          const unit = prices.buy(inId);
          if (unit == null) {
            ok = false;
            break;
          }
          inputs.push({ id: inId, count: n, unit, bought: true });
          cost += unit * n;
        } else {
          ok = false;
          break;
        }
      }
      // A fusion needs at least one held input to be "yours".
      if (!ok || !inputs.some((i) => !i.bought)) continue;
      const out = bestOutput(f, prices, mult);
      if (!out) continue;
      rows.push({
        key: f.key,
        inputs,
        output: out,
        alternatives: f.outputs.filter((o) => o.id !== out.id),
        reptile: f.reptile,
        cost,
        profit: out.value - cost,
        times,
        total: (out.value - cost) * times,
        buys: inputs.some((i) => i.bought),
      });
    }
  }
  return rows.sort((x, y) => y.profit - x.profit);
}

/**
 * The most valuable way to fuse the shards held, worked out greedily: run the
 * best paying fusion as many times as the shards allow, then the next best
 * with what is left, and so on. Outputs go back into the pile, so a fusion's
 * output can feed a later one (a chain). Returns the steps in order and what
 * is left.
 */
export function bestPlan(index, held, prices, { crocodile = 0, maxSteps = 60 } = {}) {
  const { shards } = index;
  const pile = { ...held };
  const steps = [];
  for (let n = 0; n < maxSteps; n++) {
    const options = fusionsYouCanDo(index, pile, prices, { crocodile }).filter((r) => r.profit > 0.5);
    if (!options.length) break;
    // Best total over the runs the pile allows, so a 2-run fusion beats a
    // slightly better one that can only run once.
    const best = options.reduce((a, b) => (b.total > a.total ? b : a));
    for (const i of best.inputs) pile[i.id] -= i.count * best.times;
    // Only the guaranteed output goes back in; Pure Reptile's extra is a chance.
    pile[best.output.id] = (pile[best.output.id] ?? 0) + best.output.qty * best.times;
    const last = steps[steps.length - 1];
    if (last?.key === best.key) {
      last.times += best.times;
      last.total += best.total;
    } else steps.push({ ...best });
  }
  // Shards a later step used up were partly made by an earlier one; the totals
  // still add up, because each step counts its inputs at their selling price.
  const profit = steps.reduce((t, s) => t + s.total, 0);
  const made = {};
  for (const s of steps) made[s.output.id] = (made[s.output.id] ?? 0) + s.output.qty * s.times;
  return { steps, profit, pile, made, fusions: steps.reduce((t, s) => t + s.times, 0), shards };
}

/**
 * Shards the player has never had that a fusion of held shards makes, each
 * with its cheapest fusion (what the inputs would sell for, less the output).
 */
export function newShards(index, held, known, prices, opts = {}) {
  const best = new Map();
  const mult = crocodileMultiplier(opts.crocodile);
  for (const row of fusionsYouCanDo(index, held, prices, opts)) {
    for (const o of [row.output, ...row.alternatives]) {
      if (known.has(o.id)) continue;
      const qty = o.qty * (row.reptile ? mult : 1);
      // What the inputs sell for, less what this output sells for.
      const net = row.cost - (prices.sell(o.id) ?? 0) * qty;
      const prev = best.get(o.id);
      if (!prev || net < prev.net) best.set(o.id, { id: o.id, qty: o.qty, net, via: row });
    }
  }
  return [...best.values()].sort((a, b) => a.net - b.net);
}
