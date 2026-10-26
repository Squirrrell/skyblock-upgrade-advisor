import { useEffect, useState } from 'react';
import { sbDate, upcomingEvents } from '../../../shared/calendar.js';
import { int, until } from '../lib/format.js';
import { loadElection } from '../lib/data.js';
import { useLoad } from '../lib/useLoad.js';
import { Bar, ErrorNote, Loading, Panel } from '../ui.jsx';

const clean = (s = '') => s.replace(/§./g, '');
const timeFmt = (ts) => new Date(ts).toLocaleString(undefined, { weekday: 'short', hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' });

function useNow(ms = 1000) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(id);
  }, [ms]);
  return now;
}

function Perks({ perks }) {
  return (
    <ul className="mt-3 flex flex-col gap-2.5">
      {perks.map((p) => (
        <li key={p.name} className="text-sm leading-relaxed">
          <span className="font-medium">{p.name}</span>
          {p.minister && <span className="ml-2 rounded bg-accent-soft px-1.5 py-0.5 text-xs text-accent">minister perk</span>}
          <span className="block text-muted">{clean(p.description)}</span>
        </li>
      ))}
    </ul>
  );
}

function Election({ data }) {
  const current = data.current;
  const last = data.mayor?.election;
  const shown = current ?? last;
  if (!shown) return null;
  const total = shown.candidates.reduce((n, c) => n + (c.votes ?? 0), 0) || 1;
  const ranked = [...shown.candidates].sort((a, b) => (b.votes ?? 0) - (a.votes ?? 0));
  return (
    <Panel
      title={current ? `Election for year ${current.year} (voting now)` : `Year ${last.year} election results`}
      subtitle={current ? 'Votes so far. The booth closes on Late Spring 27th.' : 'The booth is closed. It opens again on Late Summer 27th.'}
    >
      <ul className="flex flex-col gap-3">
        {ranked.map((c) => (
          <li key={c.key}>
            <div className="flex justify-between text-sm">
              <span className="font-medium">{c.name}</span>
              <span className="font-mono tabular">
                {int(c.votes)} <span className="text-muted">({((c.votes / total) * 100).toFixed(1)}%)</span>
              </span>
            </div>
            <Bar value={c.votes / total} className="mt-1.5" />
            <p className="mt-1 text-xs text-muted">{c.perks.map((p) => p.name).join(', ')}</p>
          </li>
        ))}
      </ul>
    </Panel>
  );
}

export default function Calendar() {
  const { data, error, loading, reload } = useLoad(loadElection);
  const now = useNow();
  const d = sbDate(now);
  const keys = [data?.mayor?.key, data?.mayor?.minister?.key].filter(Boolean);
  const events = upcomingEvents(now, keys);

  return (
    <div className="fade-in pt-8">
      <h1 className="text-2xl font-semibold tracking-tight">Mayor & events</h1>
      <p className="mt-2 font-mono text-lg tabular">
        {d.monthName} {d.day}, Year {d.year} <span className="text-muted">· {String(d.hour).padStart(2, '0')}:{String(Math.floor(d.minute / 10) * 10).padStart(2, '0')}</span>
      </p>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_1.2fr]">
        <div className="flex flex-col gap-6">
          {loading && <Loading />}
          {error && <ErrorNote error={error} onRetry={reload} />}
          {data?.mayor && (
            <Panel title={`Mayor ${data.mayor.name}`} subtitle={data.mayor.minister ? `Minister ${data.mayor.minister.name}: ${data.mayor.minister.perk?.name}` : null}>
              <Perks perks={data.mayor.perks ?? []} />
              {data.mayor.minister?.perk && (
                <>
                  <h3 className="mt-5 text-sm font-medium">Minister perk</h3>
                  <p className="mt-1 text-sm text-muted">{clean(data.mayor.minister.perk.description)}</p>
                </>
              )}
            </Panel>
          )}
          {data && <Election data={data} />}
        </div>

        <Panel title="Upcoming events" subtitle="Times are in your time zone." pad={false}>
          <ul>
            {events.map((e) => (
              <li key={e.id} className="flex items-start justify-between gap-4 border-b border-line/60 px-5 py-3 last:border-0 sm:px-6">
                <div className="min-w-0">
                  <div className="font-medium">
                    {e.name}
                    {e.window.active && <span className="ml-2 rounded bg-accent-soft px-1.5 py-0.5 text-xs font-medium text-accent">now</span>}
                  </div>
                  <div className="text-xs text-muted">{e.note}</div>
                </div>
                <div className="shrink-0 text-right text-sm">
                  <div className="font-mono tabular">{e.window.active ? `ends in ${until(e.window.end, now)}` : `in ${until(e.window.start, now)}`}</div>
                  <div className="text-xs text-muted">{timeFmt(e.window.active ? e.window.end : e.window.start)}</div>
                </div>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </div>
  );
}
