import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import Header from './components/Header.jsx';
import Landing from './components/Landing.jsx';
import Report from './components/Report.jsx';
import ReportError from './components/ReportError.jsx';
import ReportSkeleton from './components/ReportSkeleton.jsx';
import { fetchReport } from './lib/api.js';
import { load, rememberSearch, save } from './lib/storage.js';
import NextLanding from './next/Landing.jsx';
import NextReport, { NextSkeleton } from './next/NextReport.jsx';
import Shell from './next/Shell.jsx';
import { Loading } from './ui.jsx';

// Tool pages load on demand so the profile lookup stays light.
const PAGES = {
  bazaar: lazy(() => import('./pages/Bazaar.jsx')),
  auctions: lazy(() => import('./pages/Auctions.jsx')),
  calendar: lazy(() => import('./pages/Calendar.jsx')),
  tools: lazy(() => import('./pages/Tools.jsx')),
  foraging: lazy(() => import('./pages/Foraging.jsx')),
};
const TITLES = { bazaar: 'Bazaar', auctions: 'Auctions', calendar: 'Mayor & calendar', tools: 'Calculators & links', foraging: 'Foraging helper' };
const SITE = 'SkyBlock Advisor';

function readUrl() {
  const params = new URLSearchParams(window.location.search);
  return {
    player: params.get('player')?.trim() || '',
    profile: params.get('profile') || '',
    tab: params.get('tab') || '',
    page: params.get('page') || '',
  };
}

function writeUrl(route, replace = false) {
  const params = new URLSearchParams();
  for (const key of ['page', 'player', 'profile', 'tab']) if (route[key]) params.set(key, route[key]);
  const url = params.toString() ? `?${params}` : window.location.pathname;
  window.history[replace ? 'replaceState' : 'pushState'](null, '', url);
}

/**
 * The new design is the default; the Minecraft one stays a click away and
 * the choice is remembered. ?ui=classic or ?ui=next in a link picks one.
 */
function readDesign() {
  const asked = new URLSearchParams(window.location.search).get('ui');
  if (asked === 'classic' || asked === 'next') {
    save('design', asked);
    return asked;
  }
  return load('design', 'next') === 'classic' ? 'classic' : 'next';
}

export default function App() {
  const [route, setRoute] = useState(readUrl);
  const [design, setDesign] = useState(readDesign);
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

  // The new design is scoped to <body class="nx"> so tooltips are covered too.
  useEffect(() => {
    document.body.classList.toggle('nx', design === 'next');
    if (new URLSearchParams(window.location.search).has('ui')) writeUrl(readUrl(), true);
  }, [design]);

  const switchDesign = useCallback((next) => {
    save('design', next);
    setDesign(next);
    window.scrollTo({ top: 0, behavior: 'instant' });
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
  const openPage = useCallback(
    (page) => go(page === 'foraging' ? { page, player: state.report?.player?.name ?? '' } : page ? { page } : {}),
    [go, state.report],
  );
  const openProfile = useCallback(() => state.report && go({ player: state.report.player.name }), [go, state.report]);
  // Another member of the same coop: same profile (by id, since a member can
  // have another profile with the same name), same tab.
  const viewMember = useCallback((player) => go({ player, profile: state.report?.profile.id, tab: route.tab }), [go, state.report, route.tab]);
  const retry = () => setReloadKey((k) => k + 1);

  const Page = PAGES[route.page];
  const showReport = state.report && (state.status === 'ready' || state.status === 'loading');
  const page = route.page || (lookup ? 'profile' : '');
  const pageView = Page && (
    <Suspense fallback={<div className="pt-10"><Loading /></div>}>
      {/* The foraging page looks up its own player, kept in the URL with the page. */}
      <Page onSearch={search} route={route} onRoute={(next) => go({ page: route.page, ...next })} />
    </Suspense>
  );

  if (design === 'next') {
    return (
      <Shell
        page={page}
        current={lookup}
        lastPlayer={state.report?.player?.name}
        onHome={() => openPage('')}
        onPage={openPage}
        onProfile={openProfile}
        onSearch={search}
        onClassic={() => switchDesign('classic')}
      >
        {pageView && <div className="pt-8">{pageView}</div>}
        {!Page && !lookup && <NextLanding onSearch={search} onPage={openPage} />}
        {!Page && lookup && state.status === 'loading' && !state.report && <NextSkeleton />}
        {!Page && lookup && state.status === 'error' && (
          <div className="pt-10">
            <ReportError error={state.error} player={lookup} onRetry={retry} />
          </div>
        )}
        {!Page && lookup && showReport && (
          <NextReport report={state.report} tab={route.tab} onTab={pickTab} refreshing={state.status === 'loading'} onRefresh={retry} onPickProfile={pickProfile} onViewMember={viewMember} />
        )}
      </Shell>
    );
  }

  return (
    <div className="min-h-[100dvh]">
      <Header
        onHome={() => openPage('')}
        onSearch={search}
        onPage={openPage}
        page={page}
        current={lookup}
        lastPlayer={state.report?.player?.name}
        onProfile={openProfile}
        onNewDesign={() => switchDesign('next')}
      />
      <main className="mx-auto w-full max-w-[1240px] px-4 pb-24 sm:px-6">
        {pageView}
        {!Page && !lookup && <Landing onSearch={search} onPage={openPage} />}
        {!Page && lookup && state.status === 'loading' && !state.report && <ReportSkeleton />}
        {!Page && lookup && state.status === 'error' && <ReportError error={state.error} player={lookup} onRetry={retry} />}
        {!Page && lookup && showReport && (
          <Report report={state.report} tab={route.tab} onTab={pickTab} refreshing={state.status === 'loading'} onRefresh={retry} onPickProfile={pickProfile} onViewMember={viewMember} />
        )}
      </main>
    </div>
  );
}
