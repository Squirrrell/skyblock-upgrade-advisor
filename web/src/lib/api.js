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
