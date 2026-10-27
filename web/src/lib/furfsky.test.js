import assert from 'node:assert/strict';
import { test } from 'node:test';
import { strToU8, zipSync } from 'fflate';
import { loadPackTextures } from './furfsky.js';

const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47]);

test('reads OptiFine CIT and Firmament item textures from a pack zip', async () => {
  const zip = zipSync({
    // CIT with an explicit texture path
    'assets/minecraft/optifine/cit/armor/fermento_helmet.properties': strToU8(
      'type=item\nitems=skull\nnbt.ExtraAttributes.id=FERMENTO_HELMET\ntexture=./helm\n',
    ),
    'assets/minecraft/optifine/cit/armor/helm.png': png,
    // CIT with a .png next to the properties file
    'assets/minecraft/optifine/cit/tools/hoe.properties': strToU8('type=item\nnbt.ExtraAttributes.id=THEORETICAL_HOE_WHEAT_3\n'),
    'assets/minecraft/optifine/cit/tools/hoe.png': png,
    // Glob pattern
    'assets/minecraft/optifine/cit/misc/many.properties': strToU8('type=item\nnbt.ExtraAttributes.id=ipattern:*DRILL*\n'),
    'assets/minecraft/optifine/cit/misc/many.png': png,
    // Firmament model
    'assets/firmskyblock/models/item/helianthus_relic.json': strToU8(JSON.stringify({ textures: { layer0: 'firmskyblock:item/relic' } })),
    'assets/firmskyblock/textures/item/relic.png': png,
  });

  const pack = await loadPackTextures(new Blob([zip]));
  for (const id of ['FERMENTO_HELMET', 'HELIANTHUS_RELIC', 'THEORETICAL_HOE_WHEAT_3']) assert.match(pack.get(id), /^blob:/);
  // Glob patterns match too.
  assert.match(pack.get('TITANIUM_DRILL_4'), /^blob:/);
  assert.equal(pack.get('NOT_IN_THE_PACK'), undefined);
  pack.revoke();
});

/** Build a .cats archive (github.com/meowdding/cats-file-format) from { 'module/path': bytes }. */
function makeCats(files) {
  const tree = {};
  for (const [path, data] of Object.entries(files)) {
    const parts = path.split('/');
    let node = tree;
    for (const dir of parts.slice(0, -1)) node = node[dir] ??= {};
    node[parts.at(-1)] = data;
  }
  const header = [0x43, 0x41, 0x54, 0x53, 0x01];
  const data = [];
  const u16 = (n) => [(n >> 8) & 0xff, n & 0xff];
  const i32 = (n) => [(n >>> 24) & 0xff, (n >>> 16) & 0xff, (n >>> 8) & 0xff, n & 0xff];
  const walk = (node) => {
    const names = Object.keys(node);
    header.push(...u16(names.length));
    for (const name of names) {
      const value = node[name];
      const isFile = value instanceof Uint8Array;
      header.push(isFile ? 0 : 1, name.length, ...strToU8(name));
      if (isFile) {
        header.push(...i32(data.length), ...i32(value.length), 0xff);
        data.push(...value);
      } else walk(value);
    }
  };
  walk(tree);
  return new Uint8Array([...header, ...data]);
}

test('reads item definitions from a Catharsis .cats pack', async () => {
  const cats = makeCats({
    // A conditional definition in one module, its model and texture in another.
    'armor_icon/assets/skyblock/items/fermento_helmet.json': strToU8(
      JSON.stringify({
        model: { type: 'condition', on_true: { type: 'catharsis:fallthrough' }, on_false: { type: 'model', model: 'helmet_icon:item/fermento_helmet' } },
      }),
    ),
    'helmet_icon/assets/helmet_icon/models/item/fermento_helmet.json': strToU8(JSON.stringify({ textures: { layer0: 'helmet_icon:item/fermento_helmet' } })),
    'helmet_icon/assets/helmet_icon/textures/item/fermento_helmet.png': png,
  });
  const zip = zipSync({ 'pack.cats': cats, 'pack.mcmeta': strToU8('{}') });

  for (const file of [new Blob([cats]), new Blob([zip])]) {
    const pack = await loadPackTextures(file);
    assert.match(pack.get('FERMENTO_HELMET'), /^blob:/);
    assert.equal(pack.get('HYPERION'), undefined);
    pack.revoke();
  }
});
