// Minecraft-style building blocks: item slots and the hover tooltip.
import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react';
import { iconUrls, itemInfo, useIcons } from './lib/icons.js';
import { RARITY } from './theme.js';

// ------------------------------------------------------------------ tooltip

// One tooltip for the whole page, so hovering a long list stays cheap.
let tip = null; // { content, x, y }
const tipListeners = new Set();
const setTip = (next) => {
  tip = next;
  for (const l of tipListeners) l();
};
const useTip = () =>
  useSyncExternalStore(
    (fn) => {
      tipListeners.add(fn);
      return () => tipListeners.delete(fn);
    },
    () => tip,
  );

/**
 * Props that make any element show a Minecraft tooltip on hover or focus.
 * `content`: { name, rarity, lines: [string | { text, color }], label }
 */
export function tooltipProps(content) {
  if (!content) return {};
  return {
    onMouseEnter: (e) => setTip({ content, x: e.clientX, y: e.clientY }),
    onMouseMove: (e) => setTip({ content, x: e.clientX, y: e.clientY }),
    onMouseLeave: () => setTip(null),
    onFocus: (e) => {
      const r = e.currentTarget.getBoundingClientRect();
      setTip({ content, x: r.right, y: r.top });
    },
    onBlur: () => setTip(null),
  };
}

export function TooltipLayer() {
  const current = useTip();
  const ref = useRef(null);
  const [pos, setPos] = useState({ left: -9999, top: -9999 });

  useLayoutEffect(() => {
    if (!current || !ref.current) return;
    const { width, height } = ref.current.getBoundingClientRect();
    let left = current.x + 14;
    let top = current.y - 18;
    if (left + width > window.innerWidth - 8) left = current.x - width - 14;
    if (top + height > window.innerHeight - 8) top = window.innerHeight - height - 8;
    setPos({ left: Math.max(8, left), top: Math.max(8, top) });
  }, [current]);

  useEffect(() => {
    const hide = () => setTip(null);
    window.addEventListener('scroll', hide, { passive: true });
    return () => window.removeEventListener('scroll', hide);
  }, []);

  if (!current) return null;
  const { name, rarity, lines = [], label } = current.content;
  const color = RARITY[rarity] ?? RARITY.COMMON;
  return (
    <div ref={ref} className="mc-tooltip" style={pos} role="tooltip">
      <div className="mc-tt-name" style={{ color }}>
        {name}
      </div>
      {lines.filter(Boolean).map((line, i) =>
        typeof line === 'string' ? (
          <div key={i} className="mc-tt-line">
            {line}
          </div>
        ) : (
          <div key={i} className="mc-tt-line" style={line.color ? { color: line.color } : undefined}>
            {line.text}
          </div>
        ),
      )}
      {(label ?? rarity) && (
        <div className="mc-tt-rarity" style={{ color }}>
          {label ?? rarity.replace('_', ' ')}
        </div>
      )}
    </div>
  );
}

// ------------------------------------------------------------------ item slot

function Icon({ id, hint, alt }) {
  useIcons();
  const urls = iconUrls(id, hint);
  const [attempt, setAttempt] = useState(0);
  const key = urls.join('|');
  useEffect(() => setAttempt(0), [key]);

  if (!id || attempt >= urls.length) {
    return (
      <span className="mc-missing" role="img" aria-label={alt ? `${alt} (no icon)` : 'No icon'}>
        ?
      </span>
    );
  }
  return (
    <img key={urls[attempt]} src={urls[attempt]} alt={alt ?? ''} loading="lazy" decoding="async" draggable="false" onError={() => setAttempt((a) => a + 1)} />
  );
}

/**
 * An inventory slot with the item's icon. Rarity tints the slot border,
 * `count` shows as the stack number, `glint` adds the enchant shimmer, and
 * `tooltip` (see tooltipProps) shows on hover. Pass focusable={false} when the
 * slot sits inside a button or link, which already takes keyboard focus.
 */
export function ItemSlot({ id, rarity, count, glint, tooltip, hint, alt, className = '', focusable = true }) {
  const info = itemInfo(id);
  const tier = rarity ?? info.tier ?? undefined;
  const shine = glint ?? info.glowing;
  const tipContent = tooltip === false ? null : (tooltip ?? (info.name ? { name: info.name, rarity: tier } : null));
  return (
    <span
      className={`mc-slot ${shine ? 'mc-glint' : ''} ${className}`}
      data-rarity={tier && RARITY[tier] ? tier : undefined}
      style={tier && RARITY[tier] ? { '--slot-rarity': RARITY[tier] } : undefined}
      tabIndex={tipContent && focusable ? 0 : undefined}
      {...tooltipProps(tipContent)}
    >
      <Icon id={id} hint={hint} alt={alt ?? info.name ?? undefined} />
      {count > 1 && <span className="mc-count">{count > 999 ? `${Math.round(count / 1000)}k` : count}</span>}
    </span>
  );
}
