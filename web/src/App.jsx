import { useCallback, useEffect, useRef, useState } from 'react';
import Header from './components/Header.jsx';
import Landing from './components/Landing.jsx';
import Report from './components/Report.jsx';
import ReportError from './components/ReportError.jsx';
import ReportSkeleton from './components/ReportSkeleton.jsx';
import { fetchReport } from './lib/api.js';
import { rememberSearch } from './lib/storage.js';

function readUrl() {
  const params = new URLSearchParams(window.location.search);
  return { player: params.get('player')?.trim() || '', profile: params.get('profile') || '' };
}

function writeUrl({ player, profile }, replace = false) {
  const params = new URLSearchParams();
  if (player) params.set('player', player);
  if (profile) params.set('profile', profile);
  const url = params.toString() ? `?${params}` : window.location.pathname;
  window.history[replace ? 'replaceState' : 'pushState'](null, '', url);
}

export default function App() {
  const [route, setRoute] = useState(readUrl);
  const [state, setState] = useState({ status: 'idle', report: null, error: null });
  const [reloadKey, setReloadKey] = useState(0);
  const controller = useRef(null);

  useEffect(() => {
    const onPop = () => setRoute(readUrl());
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  useEffect(() => {
    if (!route.player) {
      setState({ status: 'idle', report: null, error: null });
      document.title = 'SkyBlock Upgrade Advisor';
      return;
    }
    controller.current?.abort();
    const ctrl = new AbortController();
    controller.current = ctrl;
    setState((s) => ({ status: 'loading', report: s.report?.player?.name?.toLowerCase() === route.player.toLowerCase() ? s.report : null, error: null }));
    fetchReport(route.player, route.profile, { signal: ctrl.signal })
      .then((report) => {
        rememberSearch(report.player.name);
        document.title = `${report.player.name} on ${report.profile.name} | SkyBlock Upgrade Advisor`;
        setState({ status: 'ready', report, error: null });
      })
      .catch((error) => {
        if (error.name === 'AbortError') return;
        setState({ status: 'error', report: null, error });
      });
    return () => ctrl.abort();
  }, [route, reloadKey]);

  const search = useCallback((player) => {
    const next = { player: player.trim(), profile: '' };
    if (!next.player) return;
    writeUrl(next);
    setRoute(next);
  }, []);

  const pickProfile = useCallback(
    (profileName) => {
      const next = { player: route.player, profile: profileName };
      writeUrl(next);
      setRoute(next);
    },
    [route.player],
  );

  const goHome = useCallback(() => {
    writeUrl({ player: '', profile: '' });
    setRoute({ player: '', profile: '' });
  }, []);

  const showReport = state.report && (state.status === 'ready' || state.status === 'loading');

  return (
    <div className="min-h-[100dvh]">
      <Header onHome={goHome} onSearch={search} compact={Boolean(route.player)} current={route.player} />
      <main className="mx-auto w-full max-w-[1240px] px-4 pb-24 sm:px-6">
        {!route.player && <Landing onSearch={search} />}
        {route.player && state.status === 'loading' && !state.report && <ReportSkeleton />}
        {route.player && state.status === 'error' && (
          <ReportError error={state.error} player={route.player} onRetry={() => setReloadKey((k) => k + 1)} />
        )}
        {route.player && showReport && (
          <Report
            report={state.report}
            refreshing={state.status === 'loading'}
            onRefresh={() => setReloadKey((k) => k + 1)}
            onPickProfile={pickProfile}
          />
        )}
      </main>
    </div>
  );
}
