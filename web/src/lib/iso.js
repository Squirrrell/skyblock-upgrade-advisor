// Draws item icons the way Minecraft's inventory does: heads and blocks as an
// isometric cube (top, the face on the left, the side on the right, with the
// GUI's face shading) and flat sprites with tinted layers. Pixels stay sharp.

export const SIZE = 128;
const C = Math.cos(Math.PI / 6);
const S = 0.5;
// How much darker each face is, like inventory item lighting.
const SHADE = { top: 0, left: 0.2, right: 0.38 };

const images = new Map(); // url -> Promise<HTMLImageElement>

export function loadImage(url) {
  if (!images.has(url)) {
    images.set(
      url,
      new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => resolve(img);
        img.onerror = () => {
          images.delete(url);
          reject(new Error(`Could not load ${url}`));
        };
        img.src = url;
      }),
    );
  }
  return images.get(url);
}

function canvas(w, h = w) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  return [c, ctx];
}

/**
 * One square tile from layers of { img, sx, sy, size, tint }: each layer is
 * cut from its image (animated strips use their first frame), multiplied by
 * its tint colour, then the whole tile is darkened by `shade`.
 */
export function tile(layers, shade = 0) {
  const n = layers[0]?.size ?? 16;
  const [c, ctx] = canvas(n);
  for (const { img, sx = 0, sy = 0, size = img.width, tint } of layers) {
    if (!tint) {
      ctx.drawImage(img, sx, sy, size, size, 0, 0, n, n);
      continue;
    }
    const [t, tctx] = canvas(n);
    tctx.drawImage(img, sx, sy, size, size, 0, 0, n, n);
    tctx.globalCompositeOperation = 'multiply';
    tctx.fillStyle = tint;
    tctx.fillRect(0, 0, n, n);
    tctx.globalCompositeOperation = 'destination-in';
    tctx.drawImage(img, sx, sy, size, size, 0, 0, n, n);
    ctx.drawImage(t, 0, 0);
  }
  if (shade) {
    ctx.globalCompositeOperation = 'source-atop';
    ctx.fillStyle = `rgb(0 0 0 / ${shade})`;
    ctx.fillRect(0, 0, n, n);
  }
  return c;
}

/**
 * Draw cubes onto one canvas. Each cube is { lo, hi, top, left, right } with
 * the corners in unit-cube space and the faces as tiles (or functions that
 * take a shade and return a tile). `pad` is the space kept around the cube.
 */
export function drawCubes(cubes, { pad = 2, grow = 1 } = {}) {
  const [c, ctx] = canvas(SIZE);
  // Fit the largest cube's projected box (width 2C, height 2) in the canvas.
  const L = (SIZE - pad * 2) / (2 * grow);
  const ox = SIZE / 2;
  const oy = (SIZE - 2 * L * grow) / 2 + (grow - 1) * L;
  const P = (x, y, z) => [ox + (x - z) * C * L, oy + (x + z) * S * L + (1 - y) * L];
  const face = (img, o, u, v) => {
    const n = img.width;
    ctx.setTransform((u[0] - o[0]) / n, (u[1] - o[1]) / n, (v[0] - o[0]) / n, (v[1] - o[1]) / n, o[0], o[1]);
    ctx.drawImage(img, 0, 0);
  };
  const shaded = (f, s) => (typeof f === 'function' ? f(s) : f);
  for (const { lo = 0, hi = 1, top, left, right } of cubes) {
    if (top) face(shaded(top, SHADE.top), P(lo, hi, lo), P(hi, hi, lo), P(lo, hi, hi));
    if (left) face(shaded(left, SHADE.left), P(lo, hi, hi), P(hi, hi, hi), P(lo, lo, hi));
    if (right) face(shaded(right, SHADE.right), P(hi, hi, hi), P(hi, hi, lo), P(hi, lo, hi));
  }
  return c.toDataURL('image/png');
}

/** A flat sprite from tinted layers, scaled up with sharp pixels. */
export function drawFlat(layers) {
  const t = tile(layers);
  const [c, ctx] = canvas(SIZE);
  ctx.drawImage(t, 0, 0, SIZE, SIZE);
  return c.toDataURL('image/png');
}

/** A Minecraft head from a 64x64 (or old 64x32) skin: base cube plus the hat layer. */
export function drawHead(skin) {
  // Skin regions of the 8x8 head faces; the hat layer sits 32px to the right.
  const faces = (dx) => ({
    top: (s) => tile([{ img: skin, sx: 8 + dx, sy: 0, size: 8 }], s),
    left: (s) => tile([{ img: skin, sx: 8 + dx, sy: 8, size: 8 }], s),
    right: (s) => tile([{ img: skin, sx: 16 + dx, sy: 8, size: 8 }], s),
  });
  return drawCubes(
    [
      { lo: 0, hi: 1, ...faces(0) },
      { lo: -1 / 16, hi: 1 + 1 / 16, ...faces(32) },
    ],
    { grow: 1.125 },
  );
}
