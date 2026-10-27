// Icons for regular (non-head) items, from the Minecraft textures that
// scripts/build-icons.mjs extracts into /mc/. An item's Hypixel material and
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
      onReady?.();
    });
}

const fileUrl = (hash) => `${BASE}${hash}.png`;

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
 * Icon URL for a material key ("INK_SACK:3", or a name like "WHEAT:0"), or
 * undefined while it loads (onReady is called after), or null if there is none.
 */
export function vanillaIcon(key, color, onReady) {
  if (typeof document === 'undefined') return null;
  if (!index) {
    loadIndex(onReady);
    return undefined;
  }
  const [material] = key.split(':');
  const name = index.map[key] ?? index.map[`${material}:0`] ?? (index.icons[material.toLowerCase()] ? material.toLowerCase() : null);
  const spec = name && index.icons[name];
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
