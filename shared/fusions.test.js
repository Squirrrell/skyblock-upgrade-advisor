import assert from 'node:assert/strict';
import { test } from 'node:test';
import { bestPlan, fusionsYouCanDo, indexFusions, newShards, shardPrices } from './fusions.js';

const shard = (id, amount = 5, family = 'Bird Family') => ({ name: id, family, rarity: 'common', fuse_amount: amount, internal_id: `SHARD_${id}` });
const data = {
  shards: { C1: shard('A'), C2: shard('B'), C3: shard('C', 2), C4: shard('D'), C5: shard('E') },
  recipes: {
    // A + B -> C (x2), or D
    C3: { 2: [['C1', 'C2']] },
    C4: { 1: [['C1', 'C2']] },
    // C + C -> E
    C5: { 1: [['C3', 'C3']] },
  },
};
const bz = (sell, buy = sell * 1.1) => ({ quick_status: { sellPrice: sell, buyPrice: buy, buyMovingWeek: 1000, sellMovingWeek: 1000 } });
const products = { SHARD_A: bz(10), SHARD_B: bz(10), SHARD_C: bz(100), SHARD_D: bz(50), SHARD_E: bz(1000) };
const prices = shardPrices(products, { tax: 0 });
const index = indexFusions(data);

test('fusions use the best output and count the runs the shards allow', () => {
  const rows = fusionsYouCanDo(index, { SHARD_A: 12, SHARD_B: 20 }, prices);
  assert.equal(rows.length, 1);
  const [r] = rows;
  assert.equal(r.output.id, 'SHARD_C');
  assert.equal(r.output.qty, 2);
  assert.equal(r.cost, 100); // 5 A + 5 B at 10
  assert.equal(r.profit, 100); // 2 C at 100, less 100
  assert.equal(r.times, 2);
});

test('the plan feeds outputs into later fusions', () => {
  const plan = bestPlan(index, { SHARD_A: 10, SHARD_B: 10 }, prices);
  // 2 runs of A + B make 4 C, which make one E (C + C takes 2 + 2).
  assert.deepEqual(
    plan.steps.map((s) => [s.output.id, s.times]),
    [
      ['SHARD_C', 2],
      ['SHARD_E', 1],
    ],
  );
  assert.equal(plan.profit, 200 + 600);
  assert.equal(plan.pile.SHARD_C, 0);
});

test('buying the missing shard is optional, and new shards skip known ones', () => {
  assert.equal(fusionsYouCanDo(index, { SHARD_A: 5 }, prices).length, 0);
  const bought = fusionsYouCanDo(index, { SHARD_A: 5 }, prices, { buyMissing: true });
  assert.equal(bought.length, 1);
  assert.equal(bought[0].inputs.find((i) => i.id === 'SHARD_B').bought, true);
  const fresh = newShards(index, { SHARD_A: 5, SHARD_B: 5 }, new Set(['SHARD_A', 'SHARD_B', 'SHARD_C']), prices);
  assert.deepEqual(
    fresh.map((n) => n.id),
    ['SHARD_D'],
  );
});
