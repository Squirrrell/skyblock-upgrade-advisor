// Generates the small pixel-art tiles the Minecraft theme uses (page
// backgrounds and the stone button face). They are drawn from seeded noise,
// not copied from Minecraft, so they can ship with the site.
// Usage: node scripts/make-textures.mjs   (writes web/public/textures/*.png)
import { mkdirSync, writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';

const OUT = new URL('../web/public/textures/', import.meta.url);
const SIZE = 16;

function crc32(buf) {
  let c;
  const table = [];
  for (let n = 0; n < 256; n++) {
    c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  let crc = 0xffffffff;
  for (const b of buf) crc = table[(crc ^ b) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

function png(pixels) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(SIZE, 0);
  ihdr.writeUInt32BE(SIZE, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // RGB
  const raw = Buffer.alloc(SIZE * (SIZE * 3 + 1));
  for (let y = 0; y < SIZE; y++) {
    raw[y * (SIZE * 3 + 1)] = 0;
    for (let x = 0; x < SIZE; x++) {
      const [r, g, b] = pixels[y * SIZE + x];
      const o = y * (SIZE * 3 + 1) + 1 + x * 3;
      raw[o] = r;
      raw[o + 1] = g;
      raw[o + 2] = b;
    }
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// Small deterministic PRNG so the tiles are the same on every build.
function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}

const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));

function speckle(palette, seed, weights) {
  const rand = rng(seed);
  const total = weights.reduce((a, b) => a + b, 0);
  return Array.from({ length: SIZE * SIZE }, () => {
    let r = rand() * total;
    for (let i = 0; i < palette.length; i++) {
      r -= weights[i];
      if (r <= 0) return hex(palette[i]);
    }
    return hex(palette[0]);
  });
}

// Deepslate: dark grey with horizontal streaks.
function deepslate() {
  const rand = rng(7);
  const shades = ['#2a2a30', '#303037', '#36363d', '#3d3d44', '#45454c'];
  const px = [];
  for (let y = 0; y < SIZE; y++) {
    const band = (y % 4 === 0 ? 1 : 0) + Math.floor(rand() * 2);
    for (let x = 0; x < SIZE; x++) {
      const n = Math.min(shades.length - 1, Math.max(0, band + Math.floor(rand() * 3) - 1 + (y % 4 === 3 ? -1 : 0)));
      px.push(hex(shades[n]));
    }
  }
  return px;
}

mkdirSync(OUT, { recursive: true });
const tiles = {
  'deepslate.png': deepslate(),
  'dirt.png': speckle(['#79553a', '#593d29', '#966c4a', '#6c4a33', '#b9855c'], 11, [5, 4, 3, 4, 1]),
  'stone.png': speckle(['#7f7f7f', '#747474', '#8a8a8a', '#6b6b6b', '#979797'], 23, [6, 4, 3, 2, 1]),
};
for (const [name, px] of Object.entries(tiles)) {
  writeFileSync(new URL(name, OUT), png(px));
  console.log(`wrote web/public/textures/${name}`);
}
