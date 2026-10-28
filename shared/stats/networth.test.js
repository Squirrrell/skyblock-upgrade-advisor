import assert from 'node:assert/strict';
import { test } from 'node:test';
import { averageLowest, createPriceBook, reforgeStones, updateHistory } from '../prices.js';
import { APPLIED_WORTH, itemStars, itemValueParts } from './networth.js';

const HOUR = 60 * 60_000;

test('price history keeps one sample per interval within the window', () => {
  let h = updateHistory(null, { A: 100 }, 0);
  h = updateHistory(h, { A: 999 }, HOUR); // too soon: ignored
  h = updateHistory(h, { A: 120, B: 50 }, 2 * HOUR);
  assert.deepEqual(h.times, [0, 2 * HOUR]);
  assert.deepEqual(h.prices, { A: [100, 120], B: [null, 50] });
  // Four days later the old samples (and A, which stopped listing) are gone.
  h = updateHistory(h, { B: 60 }, 98 * HOUR);
  assert.deepEqual(h.times, [98 * HOUR]);
  assert.deepEqual(h.prices, { B: [60] });
});

test('the average lowest BIN ignores outliers and thin histories', () => {
  const prices = { A: [100, 100, 100, 100, 1, 5000, 100, 100, 100, 100], B: [10, 20] };
  const avg = averageLowest({ times: [], prices });
  assert.equal(avg.A, 100);
  assert.equal(avg.B, undefined);
});

test('value() prefers the average lowest BIN, price() the latest', () => {
  const book = createPriceBook({ lowest: { HELM: 1_000 }, average: { HELM: 1_500 } });
  assert.equal(book.value('HELM'), 1_500);
  assert.equal(book.price('HELM').unit, 1_000);
});

test('reforge names map to their stone', () => {
  const stones = reforgeStones({ BLESSED_FRUIT: { reforgeName: 'Blessed' }, X: { reforgeName: 'Bountiful' } });
  assert.equal(stones.blessed, 'BLESSED_FRUIT');
  assert.equal(stones.bountiful, 'X');
});

test('an item is worth its base price plus its applied upgrades', () => {
  const book = createPriceBook({
    bazaarProducts: Object.fromEntries(
      Object.entries({
        ENCHANTMENT_GROWTH_6: 1_000_000,
        RECOMBOBULATOR_3000: 10_000_000,
        HOT_POTATO_BOOK: 100_000,
        FUMING_POTATO_BOOK: 1_000_000,
        BLESSED_FRUIT: 2_000_000,
        ESSENCE_WITHER: 2_000,
        FIRST_MASTER_STAR: 5_000_000,
      }).map(([id, p]) => [id, { quick_status: { sellPrice: p, buyPrice: p } }]),
    ),
    lowest: { HELM: 20_000_000 },
    reforges: { blessed: 'BLESSED_FRUIT' },
    items: new Map([['HELM', { id: 'HELM', upgrade_costs: Array.from({ length: 5 }, () => [{ type: 'ESSENCE', essence_type: 'WITHER', amount: 100 }]) }]]),
  });
  const helm = {
    id: 'HELM',
    count: 1,
    reforge: 'blessed',
    recombobulated: true,
    hotPotato: 12,
    enchantments: { growth: 6 },
    extra: { upgrade_level: 6 },
  };
  const { total, base, parts } = itemValueParts(helm, book);
  const want = {
    'Growth VI': 1_000_000 * APPLIED_WORTH.enchantment,
    'Recombobulator 3000': 10_000_000 * APPLIED_WORTH.recombobulator,
    'Hot Potato Book x10': 1_000_000,
    'Fuming Potato Book x2': 2_000_000 * APPLIED_WORTH.fumingPotato,
    '5 dungeon stars': 500 * 2_000 * APPLIED_WORTH.stars,
    'First Master Star': 5_000_000,
    'BLESSED_FRUIT (reforge)': 2_000_000,
  };
  assert.equal(base, 20_000_000);
  assert.deepEqual(Object.fromEntries(parts.map((p) => [p.label.replace('Blessed Fruit', 'BLESSED_FRUIT'), p.value])), want);
  assert.equal(total, base + Object.values(want).reduce((a, b) => a + b, 0));
});

test('dungeon items take master stars, Kuudra armor takes ten essence stars', () => {
  const dungeon = Array.from({ length: 5 }, () => [{ type: 'ESSENCE', essence_type: 'WITHER', amount: 10 }]);
  const kuudra = Array.from({ length: 10 }, () => [{ type: 'ESSENCE', essence_type: 'CRIMSON', amount: 10 }]);
  const book = createPriceBook({ items: new Map([['HYPERION', { upgrade_costs: dungeon }], ['AURORA_CHESTPLATE', { upgrade_costs: kuudra }]]) });
  const star = (id, upgrade_level) => itemStars({ id, extra: { upgrade_level } }, book);
  assert.deepEqual({ ...star('HYPERION', 7), costs: undefined }, { essence: 5, master: 2, kind: 'dungeon', costs: undefined });
  assert.deepEqual({ ...star('AURORA_CHESTPLATE', 8), costs: undefined }, { essence: 8, master: 0, kind: 'kuudra', costs: undefined });
});

test('enchantments past their book level count the item that upgraded them', () => {
  const bz = (p) => ({ quick_status: { sellPrice: p, buyPrice: p } });
  const book = createPriceBook({
    bazaarProducts: {
      SEVERED_HAND: bz(9_000_000),
      ENCHANTMENT_LUCK_6: { quick_status: { sellPrice: 4_000, buyPrice: 100_000 } },
    },
  });
  const { parts } = itemValueParts({ id: 'STARRED_BAT_WAND', enchantments: { smite: 7, luck: 6, scavenger: 5 } }, book);
  const got = Object.fromEntries(parts.map((p) => [p.label, p.value]));
  assert.equal(got['Severed Hand (Smite VII)'], 9_000_000 * APPLIED_WORTH.enchantmentUpgrade);
  // A thin bazaar (top buy order far under the asking price) counts at instant-buy.
  assert.equal(got['Luck VI'], 100_000 * APPLIED_WORTH.enchantment);
  assert.equal(got['Scavenger V'], undefined);
});

test('an item not listed now keeps the last price it was listed at', async () => {
  const { lastSeen } = await import('../prices.js');
  let h = updateHistory(null, { DICER: 28_000_000, HOE: 100 }, 0);
  h = updateHistory(h, { HOE: 120 }, 5 * 24 * HOUR); // the dicer sold out
  const last = lastSeen(h, { HOE: 120 });
  assert.deepEqual(last, { DICER: 28_000_000 });
  assert.equal(createPriceBook({ lowest: { HOE: 120 }, last }).value('DICER'), 28_000_000);
  // A month without a listing forgets it.
  h = updateHistory(h, { HOE: 130 }, 40 * 24 * HOUR);
  assert.deepEqual(lastSeen(h, { HOE: 130 }), {});
});

test('soulbound items are told apart', async () => {
  const { isSoulbound } = await import('./networth.js');
  assert.equal(isSoulbound({ lore: ['§7Stuff', '§8§l* §8Co-op Soulbound §8§l*'] }), true);
  assert.equal(isSoulbound({ lore: ['§8§l* Soulbound §8§l*'] }), true);
  assert.equal(isSoulbound({ lore: ['§7Stuff'], extra: { donated_museum: 1 } }), true);
  assert.equal(isSoulbound({ lore: ['§7Stuff', '§6§lLEGENDARY'] }), false);
});
