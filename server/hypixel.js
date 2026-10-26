import { readFile } from 'node:fs/promises';
import { ApiError } from '../shared/errors.js';
import { createCache } from './lib/cache.js';

const API = 'https://api.hypixel.net/v2';
const cache = createCache();

export { ApiError };

function apiKey() {
  const key = process.env.HYPIXEL_API_KEY?.trim();
  if (!key) {
    throw new ApiError(503, 'The server has no Hypixel API key set. Add HYPIXEL_API_KEY to .env and restart.', {
      code: 'NO_API_KEY',
    });
  }
  return key;
}

async function getJson(url, { headers = {}, label = 'request' } = {}) {
  let res;
  try {
    res = await fetch(url, { headers: { 'User-Agent': 'skyblock-upgrade-advisor', ...headers } });
  } catch (err) {
    throw new ApiError(502, `Could not reach ${label}: ${err.message}`);
  }

  if (res.status === 429) {
    const retry = res.headers.get('retry-after');
    throw new ApiError(429, `Hypixel rate limit hit${retry ? `, try again in ${retry}s` : ''}.`, { code: 'RATE_LIMIT' });
  }
  if (res.status === 403) {
    throw new ApiError(502, 'Hypixel rejected the API key. Check HYPIXEL_API_KEY.', { code: 'BAD_API_KEY' });
  }
  if (res.status === 404) return null;
  if (!res.ok) throw new ApiError(502, `${label} failed with HTTP ${res.status}`);

  return res.json();
}

const UUID_RE = /^[0-9a-f]{32}$/i;

/** Resolve a username or UUID to { uuid, name }. */
export async function resolvePlayer(input) {
  const query = String(input ?? '').trim().replace(/-/g, '');
  if (!query) throw new ApiError(400, 'Enter a Minecraft username.');

  if (UUID_RE.test(query)) {
    return cache.get(`uuid:${query.toLowerCase()}`, 60 * 60_000, async () => {
      const data = await getJson(`https://sessionserver.mojang.com/session/minecraft/profile/${query}`, { label: 'Mojang' });
      if (!data) throw new ApiError(404, 'No Minecraft account has that UUID.', { code: 'NO_PLAYER' });
      return { uuid: data.id, name: data.name };
    });
  }

  if (!/^\w{1,16}$/.test(query)) throw new ApiError(400, 'That does not look like a Minecraft username.');

  return cache.get(`name:${query.toLowerCase()}`, 60 * 60_000, async () => {
    const data = await getJson(`https://api.mojang.com/users/profiles/minecraft/${query}`, { label: 'Mojang' });
    if (!data?.id) throw new ApiError(404, `No Minecraft account called "${query}".`, { code: 'NO_PLAYER' });
    return { uuid: data.id, name: data.name };
  });
}

// Offline testing: PROFILE_FIXTURE points at a saved /v2/skyblock/profiles
// response (an array, or { profiles, garden }) used instead of the live API.
async function readFixture() {
  const data = JSON.parse(await readFile(process.env.PROFILE_FIXTURE, 'utf8'));
  return Array.isArray(data) ? { profiles: data, garden: null } : { profiles: data.profiles ?? [], garden: data.garden ?? null };
}

export function getProfiles(uuid) {
  if (process.env.PROFILE_FIXTURE) return readFixture().then((f) => f.profiles);
  return cache.get(`profiles:${uuid}`, 2 * 60_000, async () => {
    const data = await getJson(`${API}/skyblock/profiles?uuid=${uuid}`, {
      headers: { 'API-Key': apiKey() },
      label: 'Hypixel profiles',
    });
    return data?.profiles ?? [];
  });
}

export function getGarden(profileId) {
  if (process.env.PROFILE_FIXTURE) return readFixture().then((f) => f.garden);
  return cache.get(`garden:${profileId}`, 2 * 60_000, async () => {
    const data = await getJson(`${API}/skyblock/garden?profile=${profileId}`, {
      headers: { 'API-Key': apiKey() },
      label: 'Hypixel garden',
    });
    return data?.garden ?? null;
  });
}

export function getBazaar() {
  return cache.get('bazaar', 60_000, async () => {
    const data = await getJson(`${API}/skyblock/bazaar`, { label: 'Hypixel bazaar' });
    if (!data?.success) throw new ApiError(502, 'Bazaar request failed');
    return data;
  });
}

export function getAuctionPage(page) {
  // Not cached here: the price module keeps its own snapshot of the whole house.
  return getJson(`${API}/skyblock/auctions?page=${page}`, { label: 'Hypixel auctions' });
}

export function getItemsResource() {
  return cache.get('items', 6 * 60 * 60_000, async () => {
    const data = await getJson(`${API}/resources/skyblock/items`, { label: 'Hypixel items' });
    return data?.items ?? [];
  });
}
