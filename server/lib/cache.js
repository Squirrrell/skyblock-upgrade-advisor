// Tiny in-memory TTL cache. Concurrent callers for the same key share one
// in-flight promise, so a burst of requests only hits the upstream API once.
export function createCache() {
  const entries = new Map();

  async function get(key, ttlMs, load) {
    const now = Date.now();
    const hit = entries.get(key);
    if (hit && hit.expires > now) return hit.promise;

    const promise = Promise.resolve().then(load);
    entries.set(key, { promise, expires: now + ttlMs });
    try {
      return await promise;
    } catch (err) {
      // Never cache failures.
      if (entries.get(key)?.promise === promise) entries.delete(key);
      throw err;
    }
  }

  function peek(key) {
    const hit = entries.get(key);
    return hit && hit.expires > Date.now() ? hit.promise : undefined;
  }

  return { get, peek, clear: () => entries.clear() };
}
