import assert from 'node:assert/strict';
import { test } from 'node:test';
import { strToU8, zipSync } from 'fflate';
import { loadPackTextures } from './furfsky.js';

const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47]);

test('reads OptiFine CIT and Firmament item textures from a pack zip', async () => {
  const zip = zipSync({
    // CIT with an explicit texture path
    'assets/minecraft/optifine/cit/armor/fermento_helmet.properties': strToU8('type=item\nitems=skull\nnbt.ExtraAttributes.id=FERMENTO_HELMET\ntexture=./helm\n'),
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
