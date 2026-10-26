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
