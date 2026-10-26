import { ArrowClockwiseIcon } from '@phosphor-icons/react';
import { ago } from '../lib/format.js';

const MODE_LABEL = { ironman: 'Ironman', island: 'Stranded', bingo: 'Bingo' };

export default function ProfileBar({ report, refreshing, onRefresh, onPickProfile }) {
  const { player, profile, profiles, prices } = report;
  const mode = MODE_LABEL[profile.gameMode];
  return (
    <section className="flex flex-col gap-5 pt-8 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-center gap-4">
        <img
          src={`https://mc-heads.net/avatar/${player.uuid}/112`}
          alt={`${player.name}'s Minecraft head`}
          width="56"
          height="56"
          className="size-14 shrink-0 rounded-lg bg-surface-2"
        />
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-semibold tracking-tight">{player.name}</h1>
          <p className="mt-0.5 text-sm text-muted">
            {report.stats && <span className="mr-2 font-mono text-accent tabular">SB {report.stats.overview.sbLevel}</span>}
            Prices from the bazaar {ago(prices.bazaarUpdatedAt)}, auction house {ago(prices.auctionsUpdatedAt)}
          </p>
          <p className="mt-1 flex flex-wrap gap-x-3 text-xs">
            {[
              ['SkyCrypt', `https://sky.shiiyu.moe/stats/${player.name}/${profile.name}`],
              ['Elite', `https://elitebot.dev/@${player.name}/${profile.name}`],
              ['Plancke', `https://plancke.io/hypixel/player/stats/${player.name}`],
            ].map(([label, href]) => (
              <a key={label} href={href} target="_blank" rel="noreferrer" className="text-muted underline-offset-2 hover:text-accent hover:underline">
                {label}
              </a>
            ))}
          </p>
        </div>
      </div>

      <div className="flex items-end gap-2">
        <div className="flex flex-col gap-1">
          <label htmlFor="profile-pick" className="text-xs font-medium text-muted">
            Profile
          </label>
          <select
            id="profile-pick"
            value={profile.name}
            onChange={(e) => onPickProfile(e.target.value)}
            className="h-10 min-w-40 rounded-lg border border-line bg-surface px-3 text-sm text-text focus:border-accent focus:outline-none"
          >
            {profiles.map((p) => (
              <option key={p.id} value={p.name}>
                {p.name}
                {p.gameMode !== 'normal' ? ` (${MODE_LABEL[p.gameMode] ?? p.gameMode})` : ''}
                {p.selected ? ' - active' : ''}
              </option>
            ))}
          </select>
        </div>
        {mode && <span className="mb-2.5 rounded-md bg-surface-2 px-2 py-0.5 text-xs text-muted">{mode}</span>}
        <button
          type="button"
          onClick={onRefresh}
          disabled={refreshing}
          className="inline-flex h-10 items-center gap-2 rounded-lg border border-line px-3 text-sm font-medium transition-colors hover:border-accent active:scale-[0.98] disabled:opacity-60"
        >
          <ArrowClockwiseIcon size={16} className={refreshing ? 'animate-spin' : ''} />
          {refreshing ? 'Refreshing' : 'Refresh'}
        </button>
      </div>
    </section>
  );
}
