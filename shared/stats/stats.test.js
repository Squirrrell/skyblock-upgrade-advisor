import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { createPriceBook } from '../prices.js';
import { buildReport } from '../report.js';
import { catacombsLevel, hotmLevel, levelFrom, slayerLevel, SKILL_XP, xpForLevel } from './levels.js';

const fixture = JSON.parse(readFileSync(new URL('./fixtures/no_ballz.json', import.meta.url)));

const book = createPriceBook({
  bazaarProducts: {
    ENDER_PEARL: { quick_status: { buyPrice: 10, sellPrice: 8 } },
    ESSENCE_UNDEAD: { quick_status: { buyPrice: 1200, sellPrice: 1000 } },
  },
  lowest: { PET_RABBIT_EPIC: 100_000, 'PET_RABBIT_EPIC@MAX': 2_000_000, YELLOW_BANDANA: 50_000 },
});

const report = buildReport({ ...fixture, profile: fixture.profiles[0], book, petConstants: null, attrConstants: null });
const { stats } = report;

test('levelFrom walks a per-level table and honors the cap', () => {
  assert.equal(levelFrom(0, SKILL_XP, 50).level, 0);
  assert.equal(levelFrom(xpForLevel(50, SKILL_XP), SKILL_XP, 50).level, 50);
  assert.equal(levelFrom(1e12, SKILL_XP, 50).level, 50);
  assert.equal(levelFrom(1e12, SKILL_XP, 50).maxed, true);
  assert.equal(levelFrom(175, SKILL_XP, 50).level, 2);
});

test('catacombs overflows past 50 at 200M per level', () => {
  const at50 = 569_809_640;
  assert.equal(catacombsLevel(at50).level, 50);
  assert.equal(catacombsLevel(at50 + 300_000_000).level, 50);
  assert.equal(catacombsLevel(at50 + 300_000_000).overflow, 1.5);
});

test('hotm and slayer levels', () => {
  assert.equal(hotmLevel(0).level, 1);
  assert.equal(hotmLevel(14_068).level, 3);
  assert.equal(slayerLevel('zombie', 20_230).level, 6);
  assert.equal(slayerLevel('enderman', 250).level, 3);
  assert.equal(slayerLevel('vampire', 0).level, 0);
});

test('skills use per-player caps and pool social XP across the coop', () => {
  const by = Object.fromEntries(stats.skills.list.map((s) => [s.id, s]));
  assert.equal(by.foraging.cap, 54);
  assert.equal(by.farming.cap, 50);
  assert.equal(by.enchanting.level, 53);
  assert.ok(by.social.xp > 130);
  assert.ok(stats.skills.average > 30 && stats.skills.average < 50);
});

test('dungeons, slayers and mining', () => {
  assert.equal(stats.dungeons.catacombs.level, 32);
  assert.equal(stats.dungeons.completions.normal, 326);
  assert.equal(stats.dungeons.floors.length, 8);
  assert.equal(stats.slayers.totalXp, 20230 * 2 + 20255 + 250);
  assert.equal(stats.mining.powder[0].total, 32570 + 13034);
  assert.equal(stats.mining.forge.length, 2);
  assert.equal(stats.foraging.tokensSpent, 21);
});

test('minions merge the whole coop', () => {
  const m = stats.minions;
  // 7 from the player, 2 new from the coop member (COBBLESTONE_1 is shared).
  assert.equal(m.uniques, 9);
  assert.equal(m.slots, 6);
  assert.equal(m.nextSlotAt, 15);
  assert.equal(m.communitySlots, 4);
  assert.deepEqual(m.list.find((x) => x.type === 'OAK').tiers, [8, 9]);
});

test('collections sum across coop members', () => {
  assert.equal(stats.collections.total.WHEAT, 44832 + 1000);
  assert.equal(stats.collections.mine.WHEAT, 44832);
});

test('networth counts coins, sacks, essence and pets at the right level', () => {
  const nw = stats.networth;
  const cat = Object.fromEntries(nw.categories.map((c) => [c.name, c.value]));
  // Bazaar items count at the midpoint of instant-sell and instant-buy.
  assert.equal(cat.Sacks, 640 * 9);
  assert.equal(cat.Essence, 8282 * 1100);
  // Rabbit is not max level without pet constants, so the any-level price is used, plus the bandana.
  assert.equal(cat.Pets, 100_000 + 50_000);
  assert.equal(nw.total, Math.round(nw.items + nw.purse + nw.bank + nw.personalBank));
});

test('misc sections read events and the Crimson Isle', () => {
  assert.equal(stats.chocolate.uniqueRabbits, 3);
  assert.equal(stats.chocolate.duplicates, 3);
  assert.equal(stats.jacob.earned.gold, 1);
  assert.equal(stats.crimson.dojoTotal, 1488);
  // Yellow starts at 1,000 points.
  assert.equal(stats.crimson.belt, 'Yellow');
  assert.equal(stats.crimson.mages.rank, 'Neutral');
  assert.equal(stats.crimson.trophyFish.list.find((f) => f.id === 'blobfish').bronze, 1);
  assert.equal(stats.garden.level, 14);
  assert.equal(stats.overview.sbLevel, 180);
});

test('missing accessories show only the next step of each line', async () => {
  const { buildAccessoryIndex, missingAccessories } = await import('../accessories.js');
  const index = buildAccessoryIndex(
    [
      { id: 'FEATHER_TALISMAN', name: 'Feather Talisman', category: 'ACCESSORY', tier: 'COMMON' },
      { id: 'FEATHER_RING', name: 'Feather Ring', category: 'ACCESSORY', tier: 'UNCOMMON' },
      { id: 'FEATHER_ARTIFACT', name: 'Feather Artifact', category: 'ACCESSORY', tier: 'RARE' },
      { id: 'WOLF_TALISMAN', name: 'Wolf Talisman', category: 'ACCESSORY', tier: 'COMMON' },
      { id: 'WOLF_RING', name: 'Wolf Ring', category: 'ACCESSORY', tier: 'RARE' },
      { id: 'RIFT_THING', name: 'Rift Thing', category: 'ACCESSORY', tier: 'RARE', origin: 'RIFT' },
      { id: 'SWORD', name: 'Sword', category: 'SWORD', tier: 'RARE' },
    ],
    { talisman_upgrades: { FEATHER_TALISMAN: ['FEATHER_RING', 'FEATHER_ARTIFACT'], FEATHER_RING: ['FEATHER_ARTIFACT'], WOLF_TALISMAN: ['WOLF_RING'] } },
  );
  assert.equal(index.list.length, 5);
  const priced = { price: (id) => (id === 'FEATHER_RING' ? { unit: 1000, source: 'bazaar' } : null) };
  const out = missingAccessories([{ id: 'FEATHER_TALISMAN', rarity: 'COMMON' }], index, priced);
  assert.deepEqual(out.rows.map((r) => r.id), ['FEATHER_RING', 'WOLF_TALISMAN']);
  assert.equal(out.rows[0].mp, 2);
  assert.equal(out.rows[0].upgradeFrom, 'Feather Talisman');
});

test('toolkit slots holding a bare item compound are read as items', () => {
  const toolkit = stats.inventory.find((g) => g.location === 'Hunting toolkit');
  assert.ok(toolkit, 'hunting toolkit group exists');
  assert.deepEqual(toolkit.items.map((i) => i.id).sort(), ['EVERSTRETCH_LASSO', 'MEDIUM_POCKET_BLACK_HOLE']);
  assert.equal(toolkit.items.find((i) => i.id === 'EVERSTRETCH_LASSO').name, 'Everstretch Lasso');
});

test('inventory merges plain stacks and hides menu items', async () => {
  const { buildStats } = await import('./index.js');
  const item = (id, extra = {}) => ({ id, name: id, location: 'Quiver', count: 64, enchantments: {}, gems: {}, extra: {}, ...extra });
  const out = buildStats({
    member: {},
    profile: { members: {} },
    garden: null,
    book: { value: () => 1, name: () => null },
    pets: [],
    items: [item('ARROW'), item('ARROW', { count: 26 }), item('SKYBLOCK_MENU', { location: 'Inventory', count: 1 }), item('BOW', { uuid: 'a', reforge: 'none' })],
  });
  const quiver = out.inventory.find((g) => g.location === 'Quiver').items;
  assert.equal(quiver.length, 2);
  assert.equal(quiver.find((i) => i.id === 'ARROW').count, 90);
  assert.equal(quiver.find((i) => i.id === 'BOW').reforge, null);
  assert.equal(out.inventory.some((g) => g.location === 'Inventory'), false);
});
