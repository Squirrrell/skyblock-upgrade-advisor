import { useEffect, useState } from 'react';
import { fetchReport } from './api.js';

/**
 * A player's report for a tool page that looks up its own player (the
 * foraging and fusion pages). Bump `retry` to fetch it again.
 */
export function useReport(player, profile, retry) {
  const [state, setState] = useState({ status: player ? 'loading' : 'idle', report: null, error: null });
  useEffect(() => {
    if (!player) {
      setState({ status: 'idle', report: null, error: null });
      return undefined;
    }
    const ctrl = new AbortController();
    setState((s) => ({ status: 'loading', report: s.report?.player?.name?.toLowerCase() === player.toLowerCase() ? s.report : null, error: null }));
    fetchReport(player, profile, { signal: ctrl.signal })
      .then((report) => setState({ status: 'ready', report, error: null }))
      .catch((error) => error.name !== 'AbortError' && setState({ status: 'error', report: null, error }));
    return () => ctrl.abort();
  }, [player, profile, retry]);
  return state;
}
