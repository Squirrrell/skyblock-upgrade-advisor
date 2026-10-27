// Cloudflare Worker that keeps the Hypixel API key secret for the GitHub Pages
// build. It only forwards the three lookups that need a key or a CORS-free
// route, checks the calling site, and rate-limits each visitor. Responses are
// passed through as-is so the Worker uses almost no CPU.
//
// Routes:
//   GET /health
//   GET /player/:nameOrUuid   -> { uuid, name } via Mojang
//   GET /profiles/:uuid       -> Hypixel /v2/skyblock/profiles
//   GET /garden/:profileId    -> Hypixel /v2/skyblock/garden

const HYPIXEL = 'https://api.hypixel.net/v2/skyblock';
const UUID = /^[0-9a-f]{32}$/i;
const PROFILE_ID = /^[0-9a-f]{8}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{12}$/i;
const USERNAME = /^\w{1,16}$/;
const UA = 'skyblock-upgrade-advisor (+https://github.com/Squirrrell/skyblock-upgrade-advisor)';

function allowedOrigin(request, env) {
  const origin = request.headers.get('Origin');
  const allowed = (env.ALLOWED_ORIGINS ?? '').split(',').map((s) => s.trim()).filter(Boolean);
  if (allowed.includes('*')) return origin ?? '*';
  return origin && allowed.includes(origin) ? origin : null;
}

function corsHeaders(origin) {
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
}

function json(body, status, origin, extra = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...(origin ? corsHeaders(origin) : {}), ...extra },
  });
}

const fail = (status, error, code, origin) => json({ error, code }, status, origin);

/** Fetch upstream with a short edge cache. Cache API only works on custom domains, not workers.dev. */
async function cachedFetch(url, init, ttl, ctx) {
  const cache = caches.default;
  const key = new Request(url);
  const hit = await cache.match(key);
  if (hit) return hit;

  const res = await fetch(url, init);
  if (res.ok) {
    const copy = new Response(res.body, res);
    copy.headers.set('Cache-Control', `public, max-age=${ttl}`);
    ctx.waitUntil(cache.put(key, copy.clone()));
    return copy;
  }
  return res;
}

async function hypixelError(res, origin) {
  if (res.status === 429) return fail(429, 'Hypixel rate limit hit, try again in a minute.', 'RATE_LIMIT', origin);
  // Hypixel explains key problems in JSON; anything else (an HTML page) means
  // the request was blocked before it reached the API.
  const text = await res.text();
  let cause = null;
  try {
    cause = JSON.parse(text).cause ?? null;
  } catch {
    // not JSON
  }
  if (res.status === 403 && cause) return fail(502, `Hypixel rejected the API key on the proxy (${cause}).`, 'BAD_API_KEY', origin);
  return fail(502, `Hypixel returned HTTP ${res.status}${cause ? ` (${cause})` : ' without an API response'}.`, 'UPSTREAM', origin);
}

async function resolvePlayer(query, origin, ctx) {
  const clean = query.replace(/-/g, '');
  if (UUID.test(clean)) {
    // Same as names below: Mojang often refuses Cloudflare, so try mirrors too.
    const sources = [
      [`https://sessionserver.mojang.com/session/minecraft/profile/${clean}`, (d) => d],
      [`https://api.minecraftservices.com/minecraft/profile/lookup/${clean}`, (d) => d],
      [`https://playerdb.co/api/player/minecraft/${clean}`, (d) => d?.data?.player && { id: d.data.player.raw_id, name: d.data.player.username }],
      [`https://mowojang.matdoes.dev/session/minecraft/profile/${clean}`, (d) => d],
    ];
    for (const [url, map] of sources) {
      let res;
      try {
        res = await cachedFetch(url, { headers: { 'User-Agent': UA } }, 3600, ctx);
      } catch {
        continue;
      }
      if (res.status === 204 || res.status === 404) return fail(404, 'No Minecraft account has that UUID.', 'NO_PLAYER', origin);
      if (!res.ok) continue;
      const data = map(await res.json().catch(() => null));
      if (data?.id && data?.name) return json({ uuid: data.id.replace(/-/g, ''), name: data.name }, 200, origin);
    }
    return fail(502, 'Mojang lookup failed', null, origin);
  }
  if (!USERNAME.test(query)) return fail(400, 'That does not look like a Minecraft username.', null, origin);

  // Mojang often refuses requests from Cloudflare's network, so fall back to
  // public mirrors of the same lookup. Each entry maps its JSON to { id, name }.
  const sources = [
    [`https://api.mojang.com/users/profiles/minecraft/${query}`, (d) => d],
    [`https://api.minecraftservices.com/minecraft/profile/lookup/name/${query}`, (d) => d],
    [`https://playerdb.co/api/player/minecraft/${query}`, (d) => d?.data?.player && { id: d.data.player.raw_id, name: d.data.player.username }],
    [`https://mowojang.matdoes.dev/users/profiles/minecraft/${query}`, (d) => d],
  ];
  const statuses = [];
  for (const [url, map] of sources) {
    let res;
    try {
      res = await cachedFetch(url, { headers: { 'User-Agent': UA } }, 3600, ctx);
    } catch {
      statuses.push('error');
      continue;
    }
    statuses.push(res.status);
    if (res.status === 204 || res.status === 404) return fail(404, `No Minecraft account called "${query}".`, 'NO_PLAYER', origin);
    if (!res.ok) continue;
    const data = map(await res.json().catch(() => null));
    if (data?.id) return json({ uuid: data.id.replace(/-/g, ''), name: data.name }, 200, origin);
  }
  return fail(502, `Name lookup failed (${statuses.join(', ')}).`, null, origin);
}

async function hypixel(path, env, origin, ctx) {
  if (!env.HYPIXEL_API_KEY) return fail(503, 'The proxy has no Hypixel API key set.', 'NO_API_KEY', origin);
  const res = await cachedFetch(`${HYPIXEL}/${path}`, { headers: { 'API-Key': env.HYPIXEL_API_KEY.trim(), 'User-Agent': UA } }, 120, ctx);
  if (res.status === 404) return json({ success: true, profiles: null, garden: null }, 200, origin);
  if (!res.ok) return await hypixelError(res, origin);
  const headers = new Headers({ 'Content-Type': 'application/json', ...corsHeaders(origin) });
  return new Response(res.body, { status: 200, headers });
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const origin = allowedOrigin(request, env);

    if (request.method === 'OPTIONS') {
      return origin ? new Response(null, { status: 204, headers: corsHeaders(origin) }) : new Response(null, { status: 403 });
    }
    if (request.method !== 'GET') return fail(405, 'Method not allowed', null, origin);
    if (url.pathname === '/health') return json({ ok: true, hasApiKey: Boolean(env.HYPIXEL_API_KEY) }, 200, origin ?? '*');

    // Only the site itself may use the key. Scripts can fake the header,
    // which is what the per-IP rate limit below is for.
    if (!origin) return fail(403, 'This proxy only serves the SkyBlock Upgrade Advisor site.', 'FORBIDDEN', null);

    if (env.LIMITER) {
      const ip = request.headers.get('CF-Connecting-IP') ?? 'unknown';
      const { success } = await env.LIMITER.limit({ key: ip });
      if (!success) return fail(429, 'Too many lookups from your connection, wait a minute.', 'RATE_LIMIT', origin);
    }

    const [, route, arg = ''] = url.pathname.split('/');
    const value = decodeURIComponent(arg).trim();
    switch (route) {
      case 'player':
        return resolvePlayer(value, origin, ctx);
      case 'profiles':
        if (!UUID.test(value.replace(/-/g, ''))) return fail(400, 'Bad UUID', null, origin);
        return hypixel(`profiles?uuid=${value.replace(/-/g, '')}`, env, origin, ctx);
      case 'garden':
        if (!PROFILE_ID.test(value)) return fail(400, 'Bad profile id', null, origin);
        return hypixel(`garden?profile=${value}`, env, origin, ctx);
      default:
        return fail(404, 'Not found', null, origin);
    }
  },
};
