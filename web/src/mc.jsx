// Minecraft-style building blocks: item slots and the hover tooltip.
import { useEffect, useLayoutEffect, useReducer, useRef, useState, useSyncExternalStore } from 'react';
import { iconUrls, itemInfo, useIcons } from './lib/icons.js';
import { loadNeuItem, neuItemNow } from './lib/neu.js';
import { packGlyph } from './lib/vanilla.js';
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
  const { name, rarity, lines = [], label, icon, loreId } = current.content;
  // Items not on the profile (missing accessories) get their lore from the
  // NEU repo on first hover; the short tooltip shows until it arrives.
  const lore = current.content.lore ?? (loreId ? neuLore(loreId, current) : null);
  const color = RARITY[rarity] ?? RARITY.COMMON;
  const line = (l, i) =>
    typeof l === 'string' ? (
      <div key={i} className="mc-tt-line">
        {l}
      </div>
    ) : (
      <div key={i} className="mc-tt-line" style={l.color ? { color: l.color } : undefined}>
        {l.text}
      </div>
    );

  // The detailed card: rarity-coloured header, the item's own lore, then extras.
  if (lore) {
    return (
      <div
        ref={ref}
        className="mc-tooltip mc-tt-card"
        style={{ ...pos, '--tt-rarity': color, '--tt-ink': rarity === 'COMMON' || !RARITY[rarity] ? '#151515' : '#fff' }}
        role="tooltip"
      >
        <div className="mc-tt-head">
          {icon && (
            <span className="mc-tt-icon">
              <Icon id={icon} />
            </span>
          )}
          <span>{mcText(name, { colors: false })}</span>
        </div>
        <div className="mc-tt-body">
          {lore.map((l, i) =>
            stripCodes(l).trim() ? (
              <div key={i} className="mc-tt-line mc-tt-lore">
                {mcText(l)}
              </div>
            ) : (
              <div key={i} className="mc-tt-gap" />
            ),
          )}
          {lines.filter(Boolean).length > 0 && <div className="mc-tt-gap" />}
          {lines.filter(Boolean).map(line)}
        </div>
      </div>
    );
  }

  return (
    <div ref={ref} className="mc-tooltip" style={pos} role="tooltip">
      <div className="mc-tt-name" style={{ color }}>
        {mcText(name)}
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

// ------------------------------------------------------------------ § text

// Minecraft formatting codes: §0-§f colours, §l bold, §o italic, §n
// underline, §m strikethrough, §k scrambled (hidden here), §r reset.
const CODE_COLORS = {
  0: 'black',
  1: 'dark-blue',
  2: 'dark-green',
  3: 'dark-aqua',
  4: 'dark-red',
  5: 'dark-purple',
  6: 'gold',
  7: 'grey',
  8: 'dark-grey',
  9: 'blue',
  a: 'green',
  b: 'aqua',
  c: 'red',
  d: 'pink',
  e: 'yellow',
  f: 'white',
};

export const stripCodes = (s) => String(s).replace(/§./g, '');

/**
 * An item's in-game lore from the NEU data repository (lib/neu.js), or
 * undefined while it loads. When it arrives and the same tooltip is still
 * open, the tooltip redraws with it.
 */
function neuLore(id, tipWhenAsked) {
  const item = neuItemNow(id);
  if (item !== undefined) return Array.isArray(item?.lore) && item.lore.length ? item.lore : null;
  loadNeuItem(id).then(() => {
    if (tip === tipWhenAsked) setTip({ ...tip });
  });
  return undefined;
}

/**
 * One of the pack font's own characters (the fragged-item mark, stat icons),
 * drawn from its bitmap sheet in the current text colour. Shows the plain
 * character until the sheet index loads, or if the pack has no such glyph.
 */
function Glyph({ ch }) {
  const [, redraw] = useReducer((n) => n + 1, 0);
  const g = packGlyph(ch.codePointAt(0).toString(16), redraw);
  if (!g) return ch;
  const em = 0.85;
  return (
    <span
      className="mc-glyph"
      aria-hidden="true"
      style={{
        maskImage: `url(${g.url})`,
        maskSize: `${g.cols * em}em ${g.rows * em}em`,
        maskPosition: `${-g.x * em}em ${-g.y * em}em`,
      }}
    />
  );
}

// Private-use (and the odd other) characters the pack font draws itself.
const PACK_CHARS = /([က-῿-])/;

/** Plain text with the pack font's characters drawn as glyphs. */
export function withGlyphs(s, key = 'g') {
  const parts = String(s).split(PACK_CHARS);
  if (parts.length === 1) return s;
  return parts.map((p, i) => (i % 2 ? <Glyph key={`${key}${i}`} ch={p} /> : p));
}

/**
 * Text with § codes as styled spans, and the pack font's glyphs drawn.
 * `colors: false` keeps the surrounding colour (for headers on a coloured band).
 */
export function mcText(s, { colors = true } = {}) {
  if (!colors) return withGlyphs(stripCodes(s));
  const out = [];
  let style = {};
  let hidden = false;
  const parts = String(s).split(/(§.)/);
  parts.forEach((part, i) => {
    const m = /^§(.)$/.exec(part);
    if (m) {
      const c = m[1].toLowerCase();
      if (CODE_COLORS[c]) {
        style = { color: `var(--code-${CODE_COLORS[c]})` };
        hidden = false;
      } else if (c === 'r') {
        style = {};
        hidden = false;
      } else if (c === 'l') style = { ...style, fontWeight: 700 };
      else if (c === 'o') style = { ...style, fontStyle: 'italic' };
      else if (c === 'n') style = { ...style, textDecoration: 'underline' };
      else if (c === 'm') style = { ...style, textDecoration: 'line-through' };
      else if (c === 'k') hidden = true;
      return;
    }
    if (part && !hidden) out.push(<span key={i} style={style}>{withGlyphs(part, `${i}-`)}</span>);
  });
  return out;
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
