// Minecraft-style building blocks: item slots and the hover tooltip.
import { useEffect, useLayoutEffect, useReducer, useRef, useState, useSyncExternalStore } from 'react';
import { iconUrls, itemInfo, useIcons } from './lib/icons.js';
import { loadNeuItem, neuItemNow } from './lib/neu.js';
import { petLore } from './lib/pets.js';
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
 * `content`: { name, rarity, lines: [string | { text, color }], label }.
 * Items show as a card (rarity header with the icon, then the lore) when the
 * content has `lore`, `loreId` (lore loaded from NEU) or `card: true`;
 * itemCard() builds that content.
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

// Lore that loads later (NEU lore, a pet's lore at its level), by key.
const lateLore = new Map(); // key -> lore | null, once loaded
const lateLoading = new Set();

/** Lore from `load()` for `key`, or undefined while it loads; `redraw` runs when it arrives. */
function asyncLore(key, load, redraw) {
  if (lateLore.has(key)) return lateLore.get(key);
  if (!lateLoading.has(key)) {
    lateLoading.add(key);
    Promise.resolve()
      .then(load)
      .catch(() => null)
      .then((lore) => {
        lateLore.set(key, Array.isArray(lore) && lore.length ? lore : null);
        lateLoading.delete(key);
        redraw();
      });
  } else {
    // Someone else started it; check back shortly.
    setTimeout(redraw, 300);
  }
  return undefined;
}

/** The lore a card shows: its own, a pet's built from its level, or the NEU lore for its id. */
function cardLore(content, redraw) {
  if (content.lore?.length) return content.lore;
  if (content.loreLoad) return asyncLore(content.loreLoad.key, content.loreLoad.load, redraw);
  if (content.loreId) return neuLore(content.loreId, redraw);
  return null;
}

const tipLine = (l, i) =>
  typeof l === 'string' ? (
    <div key={i} className="mc-tt-line">
      {l}
    </div>
  ) : (
    <div key={i} className={`mc-tt-line ${l.bold ? 'mc-tt-rarity' : ''}`} style={l.color ? { color: l.color } : undefined}>
      {l.text}
    </div>
  );

const cardStyle = (rarity) => ({
  '--tt-rarity': RARITY[rarity] ?? RARITY.COMMON,
  '--tt-ink': rarity === 'COMMON' || !RARITY[rarity] ? '#151515' : '#fff',
});

/** The inside of an item card: rarity header with the icon, the lore, then the extra lines. */
function CardBody({ content, lore }) {
  const { name, rarity, lines = [], label, icon, noFooter } = content;
  const extra = lines.filter(Boolean);
  // Without lore there is no rarity line, so the card ends with its own.
  const footer = !lore && !noFooter && (label ?? rarity) ? label ?? `${rarity.replace('_', ' ')}` : null;
  return (
    <>
      <div className="mc-tt-head">
        {icon && (
          <span className="mc-tt-icon">
            <Icon id={icon} />
          </span>
        )}
        <span>{mcText(name, { colors: false })}</span>
      </div>
      <div className="mc-tt-body">
        {(lore ?? []).map((l, i) =>
          stripCodes(l).trim() ? (
            <div key={i} className="mc-tt-line mc-tt-lore">
              {mcText(l)}
            </div>
          ) : (
            <div key={i} className="mc-tt-gap" />
          ),
        )}
        {lore && extra.length > 0 && <div className="mc-tt-gap" />}
        {extra.map(tipLine)}
        {footer && (
          <div className="mc-tt-line mc-tt-rarity" style={{ color: RARITY[rarity] ?? RARITY.COMMON }}>
            {footer}
          </div>
        )}
      </div>
    </>
  );
}

const isCard = (c) => Boolean(c && (c.card || c.lore?.length || c.loreId || c.loreLoad));

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
  const { content } = current;
  const { name, rarity, lines = [], label } = content;
  const color = RARITY[rarity] ?? RARITY.COMMON;

  // The detailed card for items; late lore redraws it if it is still open.
  if (isCard(content)) {
    const asked = current;
    const lore = cardLore(content, () => tip === asked && setTip({ ...tip }));
    return (
      <div ref={ref} className="mc-tooltip mc-tt-card" style={{ ...pos, ...cardStyle(rarity) }} role="tooltip">
        <CardBody content={content} lore={lore} />
        {content.openable && <div className="mc-tt-hint">Click for the full view</div>}
      </div>
    );
  }

  return (
    <div ref={ref} className="mc-tooltip" style={pos} role="tooltip">
      <div className="mc-tt-name" style={{ color }}>
        {mcText(name)}
      </div>
      {lines.filter(Boolean).map(tipLine)}
      {(label ?? rarity) && (
        <div className="mc-tt-rarity" style={{ color }}>
          {label ?? rarity.replace('_', ' ')}
        </div>
      )}
    </div>
  );
}

// ------------------------------------------------------------------ full view

// The item card opened in full, on click: one for the whole page.
let fullCard = null;
const fullListeners = new Set();
/** Open an item card (itemCard() content) in the full view. */
export function openCard(content) {
  setTip(null);
  fullCard = content;
  for (const l of fullListeners) l();
}
const useFullCard = () =>
  useSyncExternalStore(
    (fn) => {
      fullListeners.add(fn);
      return () => fullListeners.delete(fn);
    },
    () => fullCard,
  );

/** The item card in full, as a modal: easier to read than the hover card, and it stays open. */
export function CardDialog() {
  const content = useFullCard();
  const ref = useRef(null);
  const [, redraw] = useReducer((n) => n + 1, 0);
  useEffect(() => {
    if (content && !ref.current?.open) ref.current?.showModal();
  }, [content]);
  if (!content) return null;
  const lore = cardLore(content, redraw);
  const close = () => ref.current?.close();
  return (
    <dialog
      ref={ref}
      className="card-dialog"
      aria-label={stripCodes(content.name)}
      onClose={() => openCard(null)}
      onClick={(e) => e.target === ref.current && close()}
    >
      <div className="mc-tooltip mc-tt-card mc-tt-full" style={cardStyle(content.rarity)}>
        <button type="button" onClick={close} className="card-dialog-close" aria-label="Close">
          ×
        </button>
        <CardBody content={content} lore={lore} />
      </div>
    </dialog>
  );
}

/** An item card shown in place (in the item popup), at full size. */
export function ItemCardView({ content }) {
  const [, redraw] = useReducer((n) => n + 1, 0);
  const lore = cardLore(content, redraw);
  return (
    <div className="mc-tooltip mc-tt-card mc-tt-static" style={cardStyle(content.rarity)}>
      <CardBody content={content} lore={lore} />
    </div>
  );
}

/** "Mar 03, 2025, 8:15 PM" */
const obtainedText = (ms) =>
  new Date(ms).toLocaleString('en-US', { month: 'short', day: '2-digit', year: 'numeric', hour: 'numeric', minute: '2-digit' });

/**
 * The SkyCrypt-style card for an item: { id, name, rarity, lore?, obtained?,
 * value?, soulbound?, lines? }. Its own lore when it has one (an item on the
 * profile), a pet's lore at its level (`pet`: { type, tier, level, heldItem,
 * xpCurrent, xpForNext, exp, ... }), else the NEU lore for its id; then when
 * it was obtained and its estimated value. `lines` go between the lore and those.
 */
export function itemCard({ id, name, rarity, lore, obtained, value, soulbound, recombobulated, lines = [], label, useNeu = true, pet = null }) {
  const own = Array.isArray(lore) && lore.length ? lore : null;
  const petKey = pet && !own ? `pet:${pet.type}:${pet.tier}:${pet.level}:${pet.heldItem}:${pet.skin}:${Math.round(pet.exp ?? 0)}` : null;
  // With no lore coming at all, the rarity line goes where the game puts it:
  // after the details, before when it was obtained and what it is worth.
  const rarityLine = !own && !useNeu && !petKey && (label ?? rarity) ? { text: label ?? rarity.replace('_', ' '), color: RARITY[rarity] ?? RARITY.COMMON, bold: true } : null;
  return {
    name,
    rarity,
    icon: id,
    card: true,
    lore: own,
    loreId: own || !useNeu || petKey ? undefined : id,
    loreLoad: petKey ? { key: petKey, load: () => petLore(pet) } : undefined,
    label: rarityLine ? null : label,
    noFooter: Boolean(rarityLine),
    lines: [
      // A pet's lore already lists its level, held item and XP.
      ...(petKey ? [] : lines),
      rarityLine,
      // Recombobulated items with their own lore already say so in the rarity line.
      recombobulated && !own ? { text: 'Recombobulated', color: 'var(--code-gold)' } : null,
      obtained ? { text: `Obtained: ${obtainedText(obtained)}`, color: 'var(--code-red)' } : null,
      soulbound && !own ? { text: '* Soulbound *', color: 'var(--code-dark-grey)' } : null,
      value ? { text: `Item Value: ${Math.round(value).toLocaleString('en-US')} Coins (${shortCoins(value)})`, color: 'var(--code-gold)' } : null,
    ],
  };
}

function shortCoins(n) {
  const t = (v) => Number(v.toFixed(Math.abs(v) >= 100 ? 0 : Math.abs(v) >= 10 ? 1 : 2)).toString();
  if (n >= 1e9) return `${t(n / 1e9)}B`;
  if (n >= 1e6) return `${t(n / 1e6)}M`;
  if (n >= 1e3) return `${t(n / 1e3)}k`;
  return String(Math.round(n));
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
 * undefined while it loads; `redraw` runs when it arrives.
 */
function neuLore(id, redraw) {
  const item = neuItemNow(id);
  if (item !== undefined) return Array.isArray(item?.lore) && item.lore.length ? item.lore : null;
  loadNeuItem(id).then(redraw);
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
export function ItemSlot({ id, rarity, count, glint, tooltip, hint, alt, className = '', focusable = true, openable = true }) {
  const info = itemInfo(id);
  const tier = rarity ?? info.tier ?? undefined;
  const shine = glint ?? info.glowing;
  // Without a tooltip of its own, an item shows its card with its lore.
  const base = tooltip === false ? null : (tooltip ?? (info.name ? itemCard({ id, name: info.name, rarity: tier }) : null));
  // An item card opens in full on click, unless the slot sits in a control with its own action.
  const opens = openable && isCard(base);
  const tipContent = opens ? { ...base, openable: true } : base;
  const open = (e) => {
    e.stopPropagation();
    e.preventDefault();
    openCard(base);
  };
  return (
    <span
      className={`mc-slot ${shine ? 'mc-glint' : ''} ${opens ? 'is-openable' : ''} ${className}`}
      data-rarity={tier && RARITY[tier] ? tier : undefined}
      style={tier && RARITY[tier] ? { '--slot-rarity': RARITY[tier] } : undefined}
      tabIndex={tipContent && focusable ? 0 : undefined}
      role={opens && focusable ? 'button' : undefined}
      aria-label={opens && focusable ? `${stripCodes(base.name ?? '')}: full details` : undefined}
      onClick={opens ? open : undefined}
      onKeyDown={opens && focusable ? (e) => (e.key === 'Enter' || e.key === ' ') && open(e) : undefined}
      {...tooltipProps(tipContent)}
    >
      <Icon id={id} hint={hint} alt={alt ?? info.name ?? undefined} />
      {count > 1 && <span className="mc-count">{count > 999 ? `${Math.round(count / 1000)}k` : count}</span>}
    </span>
  );
}
