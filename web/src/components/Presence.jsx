// "Online now: The Garden" or "Last seen 3 h ago" for the profile header.
// Asked separately from the profile, so a slow or failed status lookup never
// holds up the report; nothing shows when the player hides their status.
import { useEffect, useState } from 'react';
import { presence } from '../../../shared/presence.js';
import { fetchPresence } from '../lib/api.js';

/** "12 min ago", "5 h ago", "3 days ago". */
function since(ms) {
  const min = Math.max(0, Math.round((Date.now() - ms) / 60_000));
  if (min < 1) return 'just now';
  if (min < 60) return `${min} min ago`;
  const h = Math.round(min / 60);
  if (h < 48) return `${h} h ago`;
  const d = Math.round(h / 24);
  return d < 60 ? `${d} days ago` : `on ${new Date(ms).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
}

export default function Presence({ uuid, className = '' }) {
  const [state, setState] = useState(null);
  useEffect(() => {
    let alive = true;
    setState(null);
    fetchPresence(uuid)
      .then((data) => alive && setState(presence(data)))
      .catch(() => alive && setState(null));
    return () => {
      alive = false;
    };
  }, [uuid]);

  if (!state) return null;
  if (state.online) {
    return (
      <span className={`inline-flex items-center gap-1.5 ${className}`}>
        {/* A live state, so the dot carries meaning. */}
        <span className="size-2 rounded-full bg-[var(--color-accent)]" aria-hidden="true" />
        <span>
          Online now{state.skyblock ? ': ' : ' in '}
          <span className="font-medium">{state.where}</span>
        </span>
      </span>
    );
  }
  return <span className={className}>Last seen {since(state.lastSeen)}</span>;
}
