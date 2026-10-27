// 3D heads for every player-head item (pets, shards, talismans...), drawn
// from the item's skin like the game's inventory and pet menu. Skins come from
// Mojang's texture server, which allows cross-origin reads, so this needs no
// third-party renderer.
import { drawHead, loadImage } from './iso.js';

const cache = new Map(); // skin url -> data URL | null (failed) | Promise

/** Skin URL for a textures.minecraft.net hash. */
export const skinUrl = (hash) => `https://textures.minecraft.net/texture/${hash}`;

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
      loadImage(url)
        .then((img) => cache.set(url, drawHead(img)))
        .catch(() => cache.set(url, null))
        .finally(() => onReady?.()),
    );
  }
  return undefined;
}

/** Shown in the slot while an icon is being drawn: a clear 1x1 pixel. */
export const PENDING_ICON = 'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==';
