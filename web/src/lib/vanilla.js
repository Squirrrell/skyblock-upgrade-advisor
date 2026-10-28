// Icons for regular (non-head) items, from the textures that
// scripts/build-icons.mjs extracts into /mc/: Hypixel's SkyBlock pack for
// items that have an item_model, Minecraft's own for the rest. An item's Hypixel material and
// data value ("INK_SACK:3") pick the icon: a flat sprite, layered and tinted
// (leather armor takes the item's dye colour), or a block drawn as a 3D cube.
import { renderedHead } from './heads3d.js';
import { drawCubes, drawFlat, loadImage, tile } from './iso.js';

const BASE = `${import.meta.env.BASE_URL}mc/`;
let index = null; // { map, icons } once loaded
let loading = null;
const drawn = new Map(); // name|color -> data URL | null | Promise

function loadIndex(onReady) {
  // no-cache: revalidate, so a rebuilt index is never mixed with old textures.
  loading ??= fetch(`${BASE}index.json`, { cache: 'no-cache' })
    .then((r) => (r.ok ? r.json() : { map: {}, icons: {} }))
    .catch(() => ({ map: {}, icons: {} }))
    .then((data) => {
      index = data;
    });
  // Every caller hears when it is ready, not only the first.
  if (onReady) loading.then(onReady);
}

const fileUrl = (hash) => `${BASE}${hash}.png`;

/**
 * A glyph from Hypixel's pack font for a character ("e068"):
 * { url, x, y, cols, rows } on its bitmap sheet, null if the pack has none,
 * or undefined while the index loads (onReady is called after).
 */
export function packGlyph(code, onReady) {
  if (!index) {
    loadIndex(onReady);
    return undefined;
  }
  const g = index.glyphs?.[code];
  return g ? { url: fileUrl(g[0]), x: g[1], y: g[2], cols: g[3], rows: g[4] } : null;
}

/** "R,G,B" from the Hypixel item list as a CSS colour. */
const rgb = (color) => (color ? `rgb(${color})` : null);

async function draw(spec, color) {
  const layer = async ([hash, tint]) => ({
    img: await loadImage(fileUrl(hash)),
    tint: tint?.startsWith('dye:') ? (rgb(color) ?? tint.slice(4)) : tint,
  });
  const layers = (list) => Promise.all(list.map(layer));
  if (spec.f) return drawFlat(await layers(spec.f));
  const [t, l, r] = await Promise.all([layers(spec.b.t), layers(spec.b.l), layers(spec.b.r)]);
  const face = (ls) => (ls.length ? (shade) => tile(ls, shade) : null);
  return drawCubes([{ top: face(t), left: face(l), right: face(r) }], { pad: 6 });
}

/**
 * Icon URL for an item: its Hypixel pack model ("hypixel_skyblock:item/..."),
 * else its material key ("INK_SACK:3", or a name like "WHEAT:0"). Returns
 * undefined while it loads (onReady is called after), or null if there is none.
 */
export function vanillaIcon(key, color, onReady, model = null, itemId = null) {
  if (typeof document === 'undefined') return null;
  if (!index) {
    loadIndex(onReady);
    return undefined;
  }
  let name = model && index.models?.[model] ? model : null;
  // Paper items Hypixel's list gives no model, matched to the pack by name.
  if (!name && itemId && index.models?.[`#${itemId}`]) name = `#${itemId}`;
  if (!name) {
    const [material] = key.split(':');
    name = index.map[key] ?? index.map[`${material}:0`] ?? (index.icons[material.toLowerCase()] ? material.toLowerCase() : null);
  }
  const spec = name && (index.models?.[name] ?? index.icons[name]);
  if (!spec) return null;
  if (spec.h) return renderedHead(fileUrl(spec.h), onReady);
  // A single untinted sprite needs no drawing.
  if (spec.f?.length === 1 && !spec.f[0][1]) return fileUrl(spec.f[0][0]);

  const id = `${name}|${color ?? ''}`;
  const hit = drawn.get(id);
  if (typeof hit === 'string' || hit === null) return hit;
  if (!hit) {
    drawn.set(
      id,
      draw(spec, color)
        .then((url) => drawn.set(id, url))
        .catch(() => drawn.set(id, null))
        .finally(() => onReady?.()),
    );
  }
  return undefined;
}
