// Draws a 3D head from a skin texture, the way pets look in the game's pet
// menu: an isometric cube showing the top, the face and the head's left
// side, plus the slightly larger hat layer, with sharp pixels and the GUI's
// face shading. Skins come from Mojang's texture server, which allows
// cross-origin reads, so this works without any third-party renderer.

const SIZE = 128;
const C = Math.cos(Math.PI / 6);
const S = 0.5;
// Brightness per face, like inventory item lighting.
const SHADE = { top: 0, front: 0.2, side: 0.38 };
// Skin regions (x, y) of the 8x8 head faces; the hat layer sits 32px right.
const FACES = { top: [8, 0], front: [8, 8], side: [16, 8] };

const cache = new Map(); // hash -> data URL | null (failed) | Promise

function loadSkin(hash) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = `https://textures.minecraft.net/texture/${hash}`;
  });
}

function draw(skin) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = SIZE;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;

  // Unit cube, hat 1/16 bigger on every side. Edge length fits the cube's
  // projected bounding box (width 2C, height 2 with the hat) into the canvas.
  const L = (SIZE - 4) / (2 * 1.125);
  const ox = SIZE / 2;
  const oy = (SIZE - 2 * L * 1.125) / 2;
  const P = (x, y, z) => [ox + (x - z) * C * L, oy + (x + z) * S * L + (1 - y) * L];

  // One shaded 8x8 face, mapped onto a parallelogram: origin, u edge, v edge.
  const face = (sx, sy, shade, o, u, v) => {
    const tile = document.createElement('canvas');
    tile.width = tile.height = 8;
    const t = tile.getContext('2d');
    t.drawImage(skin, sx, sy, 8, 8, 0, 0, 8, 8);
    if (shade) {
      t.globalCompositeOperation = 'source-atop';
      t.fillStyle = `rgb(0 0 0 / ${shade})`;
      t.fillRect(0, 0, 8, 8);
    }
    ctx.setTransform((u[0] - o[0]) / 8, (u[1] - o[1]) / 8, (v[0] - o[0]) / 8, (v[1] - o[1]) / 8, o[0], o[1]);
    ctx.drawImage(tile, 0, 0);
  };

  const cube = (lo, hi, dx) => {
    // Top: u along x, v toward the face (z).
    face(FACES.top[0] + dx, FACES.top[1], SHADE.top, P(lo, hi, lo), P(hi, hi, lo), P(lo, hi, hi));
    // Face (z = hi): u along x, v down.
    face(FACES.front[0] + dx, FACES.front[1], SHADE.front, P(lo, hi, hi), P(hi, hi, hi), P(lo, lo, hi));
    // Head's left side (x = hi): u from the face edge toward the back.
    face(FACES.side[0] + dx, FACES.side[1], SHADE.side, P(hi, hi, hi), P(hi, hi, lo), P(hi, lo, hi));
  };

  cube(0, 1, 0);
  // Old 64x32 skins have no transparent hat layer to speak of; draw it anyway,
  // empty pixels stay empty.
  cube(-1 / 16, 1 + 1 / 16, 32);
  return canvas.toDataURL('image/png');
}

/**
 * The 3D head for a skin texture hash, or undefined while it is being drawn
 * (onReady is called once it is). Returns null if the skin can't be loaded.
 */
export function renderedHead(hash, onReady) {
  if (!hash || typeof document === 'undefined') return null;
  const hit = cache.get(hash);
  if (typeof hit === 'string' || hit === null) return hit;
  if (!hit) {
    cache.set(
      hash,
      loadSkin(hash)
        .then((skin) => cache.set(hash, draw(skin)))
        .catch(() => cache.set(hash, null))
        .finally(() => onReady?.()),
    );
  }
  return undefined;
}

/** Shown in the slot while a head is being drawn: a clear 1x1 pixel. */
export const PENDING_HEAD = 'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==';
