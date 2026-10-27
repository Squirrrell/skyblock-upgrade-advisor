// Small pieces of the new design: item icons, progress bars, status badges.
import { CheckIcon, CircleHalfIcon, InfoIcon, LightbulbIcon, QuestionIcon, XIcon } from '@phosphor-icons/react';
import { useEffect, useState } from 'react';
import { iconUrls, itemInfo, useIcons } from '../lib/icons.js';

/** An item texture on a soft tile; tries each icon source in turn. */
export function ItemIcon({ id, size = 40, alt }) {
  useIcons();
  const urls = id ? iconUrls(id) : [];
  const [attempt, setAttempt] = useState(0);
  const key = urls.join('|');
  useEffect(() => setAttempt(0), [key]);
  const label = alt ?? itemInfo(id).name ?? '';
  return (
    <span className="nx-icon" style={{ '--size': `${size}px` }}>
      {attempt < urls.length ? (
        <img key={urls[attempt]} src={urls[attempt]} alt={label} loading="lazy" decoding="async" draggable="false" onError={() => setAttempt((a) => a + 1)} />
      ) : (
        <span className="nx-icon-missing" role="img" aria-label={label ? `${label} (no icon)` : 'No icon'} />
      )}
    </span>
  );
}

export function Bar({ value, muted, className = '' }) {
  const pct = Math.max(0, Math.min(1, value || 0));
  return (
    <div className={`nx-bar ${muted ? 'is-muted' : ''} ${className}`} role="presentation">
      <span style={{ width: `${pct * 100}%` }} />
    </div>
  );
}

export const STATUS = {
  done: { icon: CheckIcon, label: 'Done', className: 'is-done' },
  partial: { icon: CircleHalfIcon, label: 'In progress', className: '' },
  missing: { icon: XIcon, label: 'Missing', className: 'is-missing' },
  unknown: { icon: QuestionIcon, label: 'Check in game', className: '' },
  tip: { icon: LightbulbIcon, label: 'Optional', className: '' },
  info: { icon: InfoIcon, label: 'Info', className: '' },
};

export function StatusBadge({ status }) {
  const s = STATUS[status] ?? STATUS.info;
  const Icon = s.icon;
  return (
    <span className={`nx-badge ${s.className}`}>
      <Icon size={12} weight="bold" aria-hidden="true" />
      {s.label}
    </span>
  );
}
