export class ReportError extends Error {
  constructor(message, { status, code } = {}) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export async function fetchReport(name, profile, { signal } = {}) {
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
