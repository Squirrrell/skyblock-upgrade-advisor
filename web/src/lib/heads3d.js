// 3D heads for every player-head item (pets, shards, talismans...), drawn
// from the item's skin like the game's inventory and pet menu. Skins come from
// Mojang's texture server, which allows cross-origin reads, so this needs no
// third-party renderer.
import { drawHead, loadImage } from './iso.js';

const cache = new Map(); // skin url -> data URL | null (failed) | Promise

/** Skin URL for a textures.minecraft.net hash. */
export const skinUrl = (hash) => `https://textures.minecraft.net/texture/${hash}`;

// A page like the bestiary asks for hundreds of skins at once, and Mojang's
// texture server drops some of a burst like that. So skins load a few at a
// time, and a failed one is retried before it counts as missing.
const PARALLEL = 6;
const RETRIES = 2;
let running = 0;
const waiting = [];

function nextLoad() {
  while (running < PARALLEL && waiting.length) {
    const job = waiting.shift();
    running++;
    job().finally(() => {
      running--;
      nextLoad();
    });
  }
}

function queuedLoad(url) {
  return new Promise((resolve, reject) => {
    const attempt = (left) =>
      loadImage(url).then(resolve, (err) =>
        left > 0 ? new Promise((r) => setTimeout(r, 400 * (RETRIES - left + 1))).then(() => attempt(left - 1)) : reject(err),
      );
    waiting.push(() => attempt(RETRIES));
    nextLoad();
  });
}

/**
 * The 3D head for a skin (a texture hash or a full URL), or undefined while
 * it is being drawn (onReady is called once it is), or null if the skin
 * can't be loaded.
 */
export function renderedHead(skin, onReady) {
  if (!skin || typeof document === 'undefined') return null;
  const url = skin.includes('/') ? skin : skinUrl(skin);
  const hit = cache.get(url);
  if (typeof hit === 'string' || hit === null) return hit;
  if (!hit) {
    cache.set(
      url,
      queuedLoad(url)
        .then((img) => cache.set(url, drawHead(img)))
        .catch(() => cache.set(url, null))
        .finally(() => onReady?.()),
    );
  }
  return undefined;
}

/** Shown in the slot while an icon is being drawn: a clear 1x1 pixel. */
export const PENDING_ICON = 'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==';
