import assert from 'node:assert/strict';
import { test } from 'node:test';
import { gzipSync } from 'node:zlib';
import { decodeInventory } from '../nbt.js';
import { skillLevel } from '../profile.js';
import { attributeLevel } from './attributes.js';
import { priceLines, source, totals } from './helpers.js';

test('skillLevel respects the level cap', () => {
  assert.equal(skillLevel(0, 50).level, 0);
  assert.equal(skillLevel(50, 50).level, 1);
  // 55,172,425 XP is exactly level 50.
  assert.equal(skillLevel(55_172_425, 50).level, 50);
  assert.equal(skillLevel(55_172_425, 60).level, 50);
  assert.equal(skillLevel(1e9, 55).level, 55);
});

test('attributeLevel counts cumulative shards per rarity', () => {
  assert.deepEqual(attributeLevel(0, 'COMMON'), { level: 0, maxLevel: 10, shardsToMax: 96 });
  assert.equal(attributeLevel(4, 'COMMON').level, 2); // 1 + 3
  assert.equal(attributeLevel(24, 'LEGENDARY').level, 10);
});

test('source derives status from current and max', () => {
  assert.equal(source({ id: 'a', current: 0, max: 10 }).status, 'missing');
  assert.equal(source({ id: 'a', current: 4, max: 10 }).status, 'partial');
  assert.equal(source({ id: 'a', current: 10, max: 10 }).status, 'done');
  assert.equal(source({ id: 'a', current: 10, max: 10, cost: { total: 5 } }).cost, null);
});

test('totals skip conditional, unknown and non-fortune rows', () => {
  const groups = [
    {
      items: [
        source({ id: 'a', current: 10, max: 20 }),
        source({ id: 'b', current: 0, max: 50, condition: 'At night' }),
        source({ id: 'c', status: 'unknown', max: 40 }),
        source({ id: 'd', current: 3, max: 9, unit: 'levels' }),
      ],
    },
  ];
  assert.deepEqual(totals(groups), { current: 10, max: 60, unreadable: 40 });
});

test('priceLines totals priced lines and counts unpriced ones', () => {
  const book = { price: (id) => (id === 'A' ? { unit: 100, source: 'bazaar' } : null), name: () => null };
  const out = priceLines(book, [{ id: 'A', qty: 3 }, { id: 'B', qty: 1 }, { id: 'C', qty: 0 }]);
  assert.equal(out.total, 300);
  assert.equal(out.unpriced, 1);
  assert.equal(out.lines.length, 2);
});

test('decodeInventory reads a gzipped NBT item list', () => {
  // Hand-built NBT: { i: [ { Count: 1b, tag: { ExtraAttributes: { id: "FERMENTO_HELMET" } } } ] }
  const str = (s) => {
    const b = Buffer.from(s, 'utf8');
    const len = Buffer.alloc(2);
    len.writeUInt16BE(b.length);
    return Buffer.concat([len, b]);
  };
  const named = (type, name, payload) => Buffer.concat([Buffer.from([type]), str(name), payload]);
  const compound = (...children) => Buffer.concat([...children, Buffer.from([0])]);
  const item = compound(
    named(1, 'Count', Buffer.from([1])),
    named(10, 'tag', compound(named(10, 'ExtraAttributes', compound(named(8, 'id', str('FERMENTO_HELMET')))))),
  );
  const count = Buffer.alloc(4);
  count.writeInt32BE(1);
  const list = Buffer.concat([Buffer.from([10]), count, item]);
  const root = named(10, '', compound(named(9, 'i', list)));
  const blob = gzipSync(root).toString('base64');

  const items = decodeInventory({ type: 0, data: blob });
  assert.equal(items.length, 1);
  assert.equal(items[0].tag.ExtraAttributes.id, 'FERMENTO_HELMET');
});

test('bestArmorLoadout mixes sets and loose pieces', async () => {
  const { bestArmorLoadout } = await import('./farming.js');
  const own = (...ids) => ids.map((id) => ({ id, rarity: 'RARE', name: id }));
  const cropie = ['CROPIE_HELMET', 'CROPIE_CHESTPLATE', 'CROPIE_LEGGINGS', 'CROPIE_BOOTS'];
  // Full Cropie: 90 + 3 bonus steps of 15.
  assert.equal(bestArmorLoadout(own(...cropie), 30).value, 135);
  // Rancher's Boots at Farming 60 (+60) beat Cropie boots plus one bonus step (20 + 15).
  const mixed = bestArmorLoadout(own(...cropie, 'RANCHERS_BOOTS'), 60);
  assert.equal(mixed.value, 70 + 30 + 60);
  assert.equal(mixed.slots[3].id, 'RANCHERS_BOOTS');
  // At Farming 20 the boots are worth less than keeping the set together.
  assert.equal(bestArmorLoadout(own(...cropie, 'RANCHERS_BOOTS'), 20).slots[3].id, 'CROPIE_BOOTS');
  // Best piece per slot across sets: Squash helmet with Cropie chest/legs/boots.
  const across = bestArmorLoadout(own('SQUASH_HELMET', 'CROPIE_CHESTPLATE', 'CROPIE_LEGGINGS', 'CROPIE_BOOTS'), 0);
  assert.equal(across.value, 25 + 70 + 30);
});

test('shardStats values held shards and reads attribute levels', async () => {
  const { shardStats } = await import('../stats/shards.js');
  const constants = {
    attributes: [
      { bazaarName: 'SHARD_CRICKET', displayName: 'Cricket', rarity: 'UNCOMMON', internalName: 'ATTRIBUTE_SHARD_PEST_FORTUNE;1', abilityName: 'Pest Fortune', family: ['Bug'], shardId: 'U19' },
      { bazaarName: 'SHARD_PUCK', displayName: 'Puck', rarity: 'COMMON', internalName: 'ATTRIBUTE_SHARD_VISITOR_BAIT;1', abilityName: 'Visitor Speed', family: [], shardId: 'C9' },
    ],
  };
  const book = { value: (id) => ({ SHARD_CRICKET: 40_000 })[id] ?? null, price: (id) => (id === 'SHARD_CRICKET' ? { unit: 50_000 } : null) };
  const member = { shards: { owned: [{ type: 'CRICKET', amount_owned: 3 }, { type: 'PUCK', amount_owned: 2 }], fused: 7 }, attributes: { stacks: { pest_fortune: 3, visitor_bait: 1 } } };
  const s = shardStats(member, book, constants);
  // 3 held + 3 syphoned crickets at 40k; Puck has no price.
  assert.equal(s.heldValue, 120_000);
  assert.equal(s.syphonedValue, 120_000);
  assert.equal(s.value, 240_000);
  assert.equal(s.buyValue, 300_000);
  assert.equal(s.owned, 5);
  assert.equal(s.unpriced, 1);
  // Matched by internal name even though the ability is "Visitor Speed".
  assert.equal(s.list.find((r) => r.id === 'SHARD_PUCK').syphoned, 1);
  assert.equal(s.list.find((r) => r.id === 'SHARD_CRICKET').level, 2); // uncommon: 1 + 2 shards
});

test('missingAccessories lists the next tier and the top tier of each line', async () => {
  const { missingAccessories } = await import('../accessories.js');
  const index = {
    list: [
      { id: 'SPEED_TALISMAN', name: 'Speed Talisman', tier: 'COMMON' },
      { id: 'SPEED_RING', name: 'Speed Ring', tier: 'UNCOMMON' },
      { id: 'SPEED_ARTIFACT', name: 'Speed Artifact', tier: 'RARE' },
      { id: 'LONE_RING', name: 'Lone Ring', tier: 'EPIC' },
    ],
    upgrades: { SPEED_TALISMAN: ['SPEED_RING', 'SPEED_ARTIFACT'], SPEED_RING: ['SPEED_ARTIFACT'] },
  };
  const book = { price: () => null };
  const m = missingAccessories([{ id: 'SPEED_TALISMAN', rarity: 'COMMON' }], index, book);
  // Next step: the ring (not the artifact), plus the standalone ring.
  assert.deepEqual(m.rows.map((r) => r.id).sort(), ['LONE_RING', 'SPEED_RING']);
  // Highest tier: the artifact, counted up from the talisman you own.
  assert.deepEqual(m.topRows.map((r) => r.id).sort(), ['LONE_RING', 'SPEED_ARTIFACT']);
  const artifact = m.topRows.find((r) => r.id === 'SPEED_ARTIFACT');
  assert.equal(artifact.upgradeFrom, 'Speed Talisman');
  assert.equal(artifact.mp, 8 - 3); // rare 8 MP minus common 3 MP
});

test('buildAccessoryIndex fills in a middle tier missing from NEU', async () => {
  const { buildAccessoryIndex } = await import('../accessories.js');
  const items = ['PEST_BADGE', 'PEST_RING', 'PEST_ARTIFACT', 'PEST_RELIC'].map((id) => ({ id, name: id, category: 'ACCESSORY' }));
  const misc = { talisman_upgrades: { PEST_BADGE: ['PEST_RING', 'PEST_ARTIFACT', 'PEST_RELIC'], PEST_RING: ['PEST_ARTIFACT', 'PEST_RELIC'] } };
  const { upgrades } = buildAccessoryIndex(items, misc);
  assert.deepEqual(upgrades.PEST_ARTIFACT, ['PEST_RELIC']);
});
