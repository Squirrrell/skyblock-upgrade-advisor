// Everyone on the profile's island, as buttons that open their own view of
// the same profile. Names are looked up after the page loads (Hypixel only
// gives UUIDs), so a button shows a placeholder until its name arrives.
import { UsersThreeIcon } from '@phosphor-icons/react';
import { useEffect, useState } from 'react';
import { playerName } from '../lib/api.js';

function useNames(coop, known) {
  const [names, setNames] = useState(known);
  const ids = coop.map((m) => m.uuid).join(',');
  useEffect(() => {
    let alive = true;
    setNames(known);
    for (const m of coop) {
      if (known[m.uuid]) continue;
      playerName(m.uuid).then((name) => alive && name && setNames((n) => ({ ...n, [m.uuid]: name })));
    }
    return () => {
      alive = false;
    };
    // `known` only carries the viewed player's name, which `ids` already covers.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ids]);
  return names;
}

/** `design` picks the button style: 'next' (new design) or 'classic'. */
export default function CoopMembers({ report, onView, design = 'next' }) {
  const coop = report.coop ?? [];
  const names = useNames(coop, { [report.player.uuid]: report.player.name });
  if (coop.length < 2) return null;

  const btn = design === 'next' ? 'nx-btn nx-btn-sm' : 'mc-btn mc-btn-sm';
  return (
    <nav aria-label="Island members" className="flex flex-wrap items-center gap-2">
      <span className={`inline-flex items-center gap-1.5 text-sm ${design === 'next' ? 'nx-muted' : 'text-muted'}`}>
        <UsersThreeIcon size={16} aria-hidden="true" />
        Coop ({coop.length})
      </span>
      {coop.map((m) => {
        const name = names[m.uuid];
        return (
          <button
            key={m.uuid}
            type="button"
            className={`${btn} !pl-1.5`}
            aria-current={m.viewing ? 'true' : undefined}
            aria-pressed={m.viewing}
            onClick={() => !m.viewing && onView(name ?? m.uuid)}
            title={m.viewing ? 'You are viewing this member' : `View ${name ?? 'this member'} on this profile`}
          >
            <img
              src={`https://mc-heads.net/avatar/${m.uuid}/32`}
              alt=""
              width="20"
              height="20"
              className="rounded-[5px]"
              style={{ imageRendering: 'pixelated' }}
            />
            {name ?? <span className="opacity-60">{m.uuid.slice(0, 8)}…</span>}
          </button>
        );
      })}
    </nav>
  );
}
