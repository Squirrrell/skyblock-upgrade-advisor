import assert from 'node:assert/strict';
import { test } from 'node:test';
import { bestiary } from './bestiary.js';

const constants = {
  brackets: { 1: [5, 10, 20, 50, 100] },
  bracketSets: { CRITTERS: { 1: [1, 3, 5] } },
  hub: { name: 'Hub', mobs: [{ name: '§aZombie', cap: 50, bracket: 1, mobs: ['zombie_1', 'zombie_2'] }] },
  safari: {
    name: 'Safari',
    hasSubcategories: true,
    forest: { name: 'Forest', mobs: [{ name: '§aFrog', cap: 5, bracket: 1, bracketType: 'CRITTERS', mobs: ['frog_1'] }] },
  },
};

test('a family counts all its mob ids and stops at its cap', () => {
  const b = bestiary(constants, { zombie_1: 8, zombie_2: 4, frog_1: 9 }, { zombie_1: 2 });
  const zombie = b.islands[0].groups[0].families[0];
  assert.equal(zombie.kills, 12);
  assert.equal(zombie.deaths, 2);
  // Thresholds 5, 10, 20, 50 are within the cap of 50: 12 kills passes two of four.
  assert.deepEqual([zombie.tier, zombie.maxTier, zombie.next], [2, 4, 20]);
  const frog = b.islands[1].groups[0].families[0];
  assert.equal(frog.maxed, true);
  assert.deepEqual([b.tiers, b.maxTiers, b.maxed, b.families], [5, 7, 1, 2]);
});

test('head textures decode despite the quirks in the data', async () => {
  const { skullHash } = await import('../prices.js');
  const url = '{"textures":{"SKIN":{"url":"http://textures.minecraft.net/texture/abc123"}}}';
  const b64 = btoa(url);
  assert.equal(skullHash(b64), 'abc123');
  assert.equal(skullHash(b64.replace(/=+$/, '')), 'abc123'); // padding dropped
  assert.equal(skullHash(`${b64.replace(/=+$/, '')}x`), 'abc123'); // one stray character
  assert.equal(skullHash(`${b64}", "${btoa('other')}`), 'abc123'); // two values joined
});
