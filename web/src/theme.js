// =============================================================================
// THEME CONFIG
// Everything that decides how the site looks lives here: palette, Minecraft
// colour codes, rarity colours, fonts, GUI scale and the item icon packs.
// applyTheme() turns these into CSS variables, so styles.css never hard-codes
// a colour. Change a value here and the whole site follows.
// =============================================================================

/** Minecraft inventory GUI colours. */
export const PALETTE = {
  panel: '#C6C6C6', // GUI panel fill
  highlight: '#FFFFFF', // top/left bevel of raised panels
  shadow: '#373737', // bottom/right bevel of raised panels
  outline: '#000000', // 1px outer outline
  slot: '#8B8B8B', // item slot fill (inverted bevel)
  well: '#2B2B2B', // dark inset areas: tables, lists, readouts
  wellHighlight: '#5A5A5A',
  wellShadow: '#141414',
  field: '#000000', // chat / anvil text field
  fieldBorder: '#A0A0A0',
  label: '#2E2E2E', // text on light panels (vanilla uses #404040; a bit darker reads better in a sans)
  labelMuted: '#4F4F4F',
  button: '#7A7A7A', // stone button face (under the stone texture)
  buttonHover: '#7E88BF', // classic highlighted button
  buttonDisabled: '#2C2C2C',
  xp: '#80FF20', // XP bar fill
  xpTrack: '#1A1A1A',
  tooltipBg: 'rgba(16, 0, 16, 0.94)', // #100010 at ~94%
  tooltipBorderTop: '#5000FF',
  tooltipBorderBottom: '#28007F',
};

/** Minecraft chat colour codes, used on dark backgrounds. */
export const MC = {
  black: '#000000', // §0
  darkBlue: '#0000AA', // §1
  darkGreen: '#00AA00', // §2
  darkAqua: '#00AAAA', // §3
  darkRed: '#AA0000', // §4
  darkPurple: '#AA00AA', // §5
  gold: '#FFAA00', // §6 coins
  grey: '#B4B4B4', // §7 secondary text (vanilla #AAAAAA, lifted for long text)
  darkGrey: '#555555', // §8
  blue: '#5555FF', // §9
  green: '#55FF55', // §a profit
  aqua: '#55FFFF', // §b
  red: '#FF5555', // §c loss
  pink: '#FF55FF', // §d
  yellow: '#FFFF55', // §e highlights, clickable
  white: '#FFFFFF', // §f
};

/**
 * The bright codes disappear on the light grey panels, so text that sits
 * directly on a panel uses deeper shades of the same hues. Anything on a dark
 * background (tables, readouts, tooltips, the page) uses MC above.
 */
export const ON_PANEL = {
  green: '#106F10',
  red: '#9A1515',
  gold: '#7A4D00',
  yellow: '#6B5B00',
  grey: '#555555',
};

/** SkyBlock rarity colours (names, slot borders). */
export const RARITY = {
  COMMON: '#FFFFFF',
  UNCOMMON: '#55FF55',
  RARE: '#5555FF',
  EPIC: '#AA00AA',
  LEGENDARY: '#FFAA00',
  MYTHIC: '#FF55FF',
  DIVINE: '#55FFFF',
  SPECIAL: '#FF5555',
  VERY_SPECIAL: '#FF5555',
  SUPREME: '#AA0000',
};

/** The same rarities, darkened for text that sits on a light panel. */
export const RARITY_ON_PANEL = {
  COMMON: '#3A3A3A',
  UNCOMMON: '#106F10',
  RARE: '#2525B8',
  EPIC: '#7A007A',
  LEGENDARY: '#7A4D00',
  MYTHIC: '#9C1F8F',
  DIVINE: '#00706F',
  SPECIAL: '#9A1515',
  VERY_SPECIAL: '#9A1515',
  SUPREME: '#7A0000',
};

/**
 * Fonts. The pixel font is for headings, buttons, tabs and numbers; body text
 * uses Geist so long descriptions stay easy to read. Monocraft is self-hosted
 * from /fonts (SIL OFL); Geist comes from @fontsource-variable/geist.
 */
export const FONTS = {
  pixel: "'Monocraft', 'Minecraftia', 'Press Start 2P', ui-monospace, monospace",
  body: "'Geist Variable', ui-sans-serif, system-ui, sans-serif",
};

/**
 * GUI scale, in whole multiples like Minecraft's "GUI Scale" setting. One
 * Minecraft pixel is `scale` CSS pixels, so bevels and slots stay crisp.
 * The largest breakpoint the viewport passes wins.
 */
export const GUI_SCALE = [
  { minWidth: 0, scale: 2 },
  { minWidth: 1700, scale: 3 },
];

/** Slot size in Minecraft pixels (vanilla is 18). Mobile keeps 40px for tapping. */
export const SLOT_MC_PX = 18;
export const SLOT_MIN_TOUCH_PX = 40;

/** Page backgrounds, picked by the background toggle in the header. */
export const BACKGROUNDS = {
  dark: { label: 'Deepslate', texture: 'textures/deepslate.png', tint: 'rgba(0, 0, 0, 0.45)' },
  light: { label: 'Dirt', texture: 'textures/dirt.png', tint: 'rgba(0, 0, 0, 0.55)' },
};

/** Icon pack used until the visitor picks another. Falls back to default per item. */
export const DEFAULT_ICON_PACK = 'furfsky';

/** Special icons for things that are not items. */
export const SPECIAL_ICONS = {
  COINS: 'GOLD_NUGGET',
  BAZAAR: 'EMERALD',
  AUCTIONS: 'GOLD_INGOT',
  ENCHANTED_BOOK: 'ENCHANTED_BOOK',
};

/**
 * Icon packs. Each turns a SkyBlock item id into candidate image URLs, best
 * first; if none loads, the UI shows the "?" placeholder. All icons are the
 * site's own, no third-party renderer. `hint.skull` is the item's skin
 * (pets, shards, talismans and every other player head), and `src` gives:
 *   src.head(skin)      the head drawn in 3D from that skin (lib/heads3d.js)
 *   src.vanilla(id)     the Minecraft texture Hypixel uses for the item's
 *                       material, blocks drawn in 3D (lib/vanilla.js)
 *   src.pack(id), src.packSkull(skin)   a FurfSky Reborn texture
 * Each returns a URL, undefined while it is still being drawn, or null.
 *
 * - default: what the game shows. Heads in 3D, everything else vanilla.
 * - furfsky: FurfSky Reborn's textures for regular items (bundled with the
 *   FurfSky team's permission, see lib/furfsky.js). Heads stay 3D, since the
 *   pack draws pets and other heads flat; its head texture is only used if a
 *   skin can't be loaded.
 */
export const ICON_PACKS = {
  default: {
    label: 'Hypixel default',
    urls: (id, hint, src) => (hint.skull ? [src.head(hint.skull), src.vanilla(id)] : [src.vanilla(id)]),
  },
  furfsky: {
    label: 'FurfSky Reborn',
    urls: (id, hint, src) =>
      hint.skull ? [src.head(hint.skull), src.packSkull(hint.skull), src.vanilla(id)] : [src.pack(id), src.vanilla(id)],
  },
};

// -----------------------------------------------------------------------------

/** Write the config above into CSS variables on :root. */
export function applyTheme(root = document.documentElement) {
  const set = (name, value) => root.style.setProperty(name, value);
  for (const [k, v] of Object.entries(PALETTE)) set(`--mc-${kebab(k)}`, v);
  for (const [k, v] of Object.entries(MC)) set(`--code-${kebab(k)}`, v);
  for (const [k, v] of Object.entries(ON_PANEL)) set(`--panel-${kebab(k)}`, v);
  for (const [k, v] of Object.entries(RARITY)) set(`--rarity-${k.toLowerCase()}`, v);
  for (const [k, v] of Object.entries(RARITY_ON_PANEL)) set(`--rarity-panel-${k.toLowerCase()}`, v);
  set('--font-pixel', FONTS.pixel);
  set('--font-body', FONTS.body);
  for (const [k, bg] of Object.entries(BACKGROUNDS)) {
    set(`--bg-${k}`, `linear-gradient(${bg.tint}, ${bg.tint}), url("${import.meta.env.BASE_URL}${bg.texture}")`);
  }
  applyScale(root);
  window.addEventListener('resize', () => applyScale(root), { passive: true });
}

function applyScale(root) {
  const width = window.innerWidth;
  const { scale } = GUI_SCALE.filter((s) => width >= s.minWidth).at(-1);
  root.style.setProperty('--px', `${scale}px`);
  root.style.setProperty('--slot', `${Math.max(SLOT_MC_PX * scale, width < 640 ? SLOT_MIN_TOUCH_PX : 0)}px`);
}

const kebab = (s) => s.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);
