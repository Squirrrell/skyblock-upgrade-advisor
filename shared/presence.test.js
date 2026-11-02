import assert from 'node:assert/strict';
import { test } from 'node:test';
import { presence } from './presence.js';

test('online players show their SkyBlock area, or the game they are in', () => {
  assert.deepEqual(presence({ session: { online: true, gameType: 'SKYBLOCK', mode: 'garden' } }), { online: true, where: 'The Garden', skyblock: true });
  assert.equal(presence({ session: { online: true, gameType: 'SKYBLOCK', mode: 'new_island' } }).where, 'New Island');
  assert.deepEqual(presence({ session: { online: true, gameType: 'BEDWARS', mode: 'EIGHT_ONE' } }), { online: true, where: 'Bedwars', skyblock: false });
});

test('offline players show when they were last seen; hidden status shows nothing', () => {
  assert.deepEqual(presence({ session: { online: false }, lastLogin: 100, lastLogout: 250 }), { online: false, lastSeen: 250 });
  assert.equal(presence({ session: { online: false }, lastLogin: null, lastLogout: null }), null);
  assert.equal(presence(null), null);
});
