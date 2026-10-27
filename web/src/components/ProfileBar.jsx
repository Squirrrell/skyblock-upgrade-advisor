import { ArrowClockwiseIcon } from '@phosphor-icons/react';
import { ago } from '../lib/format.js';

const MODE_LABEL = { ironman: 'Ironman', island: 'Stranded', bingo: 'Bingo' };

export default function ProfileBar({ report, refreshing, onRefresh, onPickProfile }) {
  const { player, profile, profiles, prices } = report;
  const mode = MODE_LABEL[profile.gameMode];
  return (
    <section className="flex flex-col gap-5 pt-8 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-center gap-4">
        <span className="mc-slot shrink-0" style={{ '--slot': 'calc(var(--px) * 30)' }}>
          <img src={`https://mc-heads.net/avatar/${player.uuid}/112`} alt={`${player.name}'s Minecraft head`} width="56" height="56" />
        </span>
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-bold text-[var(--code-yellow)]">{player.name}</h1>
          <p className="mt-0.5 text-sm text-muted">
            {report.stats && <span className="mc-readout mr-2 text-[var(--code-aqua)] tabular">SB {report.stats.overview.sbLevel}</span>}
            Prices from the bazaar {ago(prices.bazaarUpdatedAt)}, auction house {ago(prices.auctionsUpdatedAt)}
          </p>
          <p className="mt-1 flex flex-wrap gap-x-3 text-sm">
            {[
              ['SkyCrypt', `https://sky.shiiyu.moe/stats/${player.name}/${profile.name}`],
              ['Elite', `https://elitebot.dev/@${player.name}/${profile.name}`],
              ['Plancke', `https://plancke.io/hypixel/player/stats/${player.name}`],
            ].map(([label, href]) => (
              <a key={label} href={href} target="_blank" rel="noreferrer" className="mc-link">
                {label}
              </a>
            ))}
          </p>
        </div>
      </div>

      <div className="flex items-end gap-2">
        <div className="flex flex-col gap-1">
          <label htmlFor="profile-pick" className="text-sm text-muted">
            Profile
          </label>
          <select id="profile-pick" value={profile.name} onChange={(e) => onPickProfile(e.target.value)} className="h-10 min-w-40 px-3 text-sm">
            {profiles.map((p) => (
              <option key={p.id} value={p.name}>
                {p.name}
                {p.gameMode !== 'normal' ? ` (${MODE_LABEL[p.gameMode] ?? p.gameMode})` : ''}
                {p.selected ? ' - active' : ''}
              </option>
            ))}
          </select>
        </div>
        {mode && <span className="mb-2.5 bg-surface-2 px-2 text-sm text-[var(--code-gold)]">{mode}</span>}
        <button type="button" onClick={onRefresh} disabled={refreshing} className="mc-btn h-10">
          <ArrowClockwiseIcon size={16} className={refreshing ? 'animate-spin' : ''} />
          {refreshing ? 'Refreshing' : 'Refresh'}
        </button>
      </div>
    </section>
  );
}
