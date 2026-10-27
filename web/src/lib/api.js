export class ReportError extends Error {
  constructor(message, { status, code } = {}) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

/** True for the GitHub Pages build, which runs the analysis in the browser. */
export const STATIC_MODE = Boolean(import.meta.env.VITE_PROXY_URL);

export async function fetchReport(name, profile, { signal } = {}) {
  if (STATIC_MODE) {
    const { fetchStaticReport } = await import('./static-report.js');
    return fetchStaticReport(name, profile, { signal });
  }

  const qs = profile ? `?profile=${encodeURIComponent(profile)}` : '';
  let res;
  try {
    res = await fetch(`/api/player/${encodeURIComponent(name)}${qs}`, { signal });
  } catch (err) {
    if (err.name === 'AbortError') throw err;
    throw new ReportError('Could not reach the server. Is it running?', { code: 'OFFLINE' });
  }
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new ReportError(body.error ?? `Request failed (${res.status})`, { status: res.status, code: body.code });
  return body;
}

const PROXY = import.meta.env.VITE_PROXY_URL?.replace(/\/$/, '');
const NAME_TTL = 24 * 60 * 60_000;
const nameLookups = new Map(); // uuid -> Promise<string | null>

/**
 * A player's current username from their UUID, through the local server or
 * the Pages proxy. Kept in localStorage for a day: names rarely change and
 * the proxy is rate limited.
 */
export function playerName(uuid) {
  if (!nameLookups.has(uuid)) {
    nameLookups.set(
      uuid,
      (async () => {
        const key = `name:${uuid}`;
        try {
          const hit = JSON.parse(localStorage.getItem(key) ?? 'null');
          if (hit && Date.now() - hit.at < NAME_TTL) return hit.name;
        } catch {
          // no storage: look it up
        }
        try {
          const res = await fetch(STATIC_MODE ? `${PROXY}/player/${uuid}` : `/api/resolve/${uuid}`);
          if (!res.ok) return null;
          const { name } = await res.json();
          try {
            localStorage.setItem(key, JSON.stringify({ name, at: Date.now() }));
          } catch {
            // private mode: fine, it is cached for this visit
          }
          return name ?? null;
        } catch {
          return null;
        }
      })(),
    );
  }
  return nameLookups.get(uuid);
}
