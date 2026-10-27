import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import Header from './components/Header.jsx';
import Landing from './components/Landing.jsx';
import Report from './components/Report.jsx';
import ReportError from './components/ReportError.jsx';
import ReportSkeleton from './components/ReportSkeleton.jsx';
import { fetchReport } from './lib/api.js';
import { rememberSearch } from './lib/storage.js';
import { Loading } from './ui.jsx';

// Tool pages load on demand so the profile lookup stays light.
const PAGES = {
  bazaar: lazy(() => import('./pages/Bazaar.jsx')),
  auctions: lazy(() => import('./pages/Auctions.jsx')),
  calendar: lazy(() => import('./pages/Calendar.jsx')),
  tools: lazy(() => import('./pages/Tools.jsx')),
};
const TITLES = { bazaar: 'Bazaar', auctions: 'Auctions', calendar: 'Mayor & calendar', tools: 'Calculators & links' };
const SITE = 'SkyBlock Advisor';

// Preview of the new design (?ui=next), one page at a time.
const NextReport = lazy(() => import('./next/NextReport.jsx'));

function readUrl() {
  const params = new URLSearchParams(window.location.search);
  return {
    player: params.get('player')?.trim() || '',
    profile: params.get('profile') || '',
    tab: params.get('tab') || '',
    page: params.get('page') || '',
    ui: params.get('ui') === 'next' ? 'next' : '',
  };
}

function writeUrl(route, replace = false) {
  const params = new URLSearchParams();
  for (const key of ['page', 'player', 'profile', 'tab', 'ui']) if (route[key]) params.set(key, route[key]);
  const url = params.toString() ? `?${params}` : window.location.pathname;
  window.history[replace ? 'replaceState' : 'pushState'](null, '', url);
}

export default function App() {
  const [route, setRoute] = useState(readUrl);
  const [state, setState] = useState({ status: 'idle', report: null, error: null });
  const [reloadKey, setReloadKey] = useState(0);
  const controller = useRef(null);

  const go = useCallback((next, replace = false) => {
    writeUrl(next, replace);
    setRoute(next);
    if (!replace) window.scrollTo({ top: 0, behavior: 'instant' });
  }, []);

  useEffect(() => {
    const onPop = () => setRoute(readUrl());
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const lookup = route.page ? '' : route.player;

  useEffect(() => {
    if (!lookup) {
      if (!route.page) document.title = SITE;
      return;
    }
    controller.current?.abort();
    const ctrl = new AbortController();
    controller.current = ctrl;
    setState((s) => ({ status: 'loading', report: s.report?.player?.name?.toLowerCase() === lookup.toLowerCase() ? s.report : null, error: null }));
    fetchReport(lookup, route.profile, { signal: ctrl.signal })
      .then((report) => {
        rememberSearch(report.player.name);
        setState({ status: 'ready', report, error: null });
      })
      .catch((error) => {
        if (error.name === 'AbortError') return;
        setState({ status: 'error', report: null, error });
      });
    return () => ctrl.abort();
    // The tab is not part of the lookup, so switching tabs never refetches.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lookup, route.profile, reloadKey]);

  useEffect(() => {
    if (route.page) document.title = `${TITLES[route.page] ?? 'Tools'} | ${SITE}`;
    else if (state.report && lookup) document.title = `${state.report.player.name} on ${state.report.profile.name} | ${SITE}`;
  }, [route.page, state.report, lookup]);

  const search = useCallback((player) => player.trim() && go({ player: player.trim(), tab: route.tab }), [go, route.tab]);
  const pickProfile = useCallback((profile) => go({ ...route, profile }), [go, route]);
  const pickTab = useCallback((tab) => go({ ...route, tab }, true), [go, route]);
  const openPage = useCallback((page) => go(page ? { page } : {}), [go]);

  const Page = PAGES[route.page];
  const showReport = state.report && (state.status === 'ready' || state.status === 'loading');
  const preview = route.ui === 'next' && lookup && state.status !== 'error';

  if (preview) {
    return (
      <Suspense fallback={null}>
        <NextReport
          report={showReport ? state.report : null}
          loading={state.status === 'loading'}
          refreshing={state.status === 'loading' && Boolean(state.report)}
          onRefresh={() => setReloadKey((k) => k + 1)}
          onPickProfile={pickProfile}
          onSearch={(player) => go({ player, ui: 'next' })}
          onClassic={(tab) => go({ ...route, ui: '', tab: tab ?? 'farming' })}
          onHome={() => openPage('')}
        />
      </Suspense>
    );
  }

  return (
    <div className="min-h-[100dvh]">
      <Header onHome={() => openPage('')} onSearch={search} onPage={openPage} page={route.page || (lookup ? 'profile' : '')} current={lookup} lastPlayer={state.report?.player?.name} onProfile={() => state.report && go({ player: state.report.player.name })} />
      <main className="mx-auto w-full max-w-[1240px] px-4 pb-24 sm:px-6">
        {Page && (
          <Suspense fallback={<div className="pt-10"><Loading /></div>}>
            <Page onSearch={search} />
          </Suspense>
        )}
        {!Page && !lookup && <Landing onSearch={search} onPage={openPage} />}
        {!Page && lookup && state.status === 'loading' && !state.report && <ReportSkeleton />}
        {!Page && lookup && state.status === 'error' && <ReportError error={state.error} player={lookup} onRetry={() => setReloadKey((k) => k + 1)} />}
        {!Page && lookup && showReport && (
          <Report
            report={state.report}
            tab={route.tab}
            onTab={pickTab}
            refreshing={state.status === 'loading'}
            onRefresh={() => setReloadKey((k) => k + 1)}
            onPickProfile={pickProfile}
          />
        )}
      </main>
    </div>
  );
}
