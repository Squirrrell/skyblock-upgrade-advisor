// Builds the site's own item icons from Minecraft's official game files, so
// no third-party renderer is needed.
//
// Hypixel's item list gives every SkyBlock item a 1.8-era material name and
// data value (INK_SACK:3 is cocoa beans). XSeries' XMaterial table (MIT)
// turns those into today's names (minecraft-data, MIT, does the same for the
// numeric ids in inventory data), and the current client jar's item
// definitions and models say which textures each one uses: flat sprites with
// optional tinted layers, or the top and two sides of a block, which the
// browser draws as a 3D cube (lib/iso.js). Head items aren't handled here;
// the browser draws them from their skins.
//
// Mojang's textures are not committed: this writes them to web/public/mc/
// (git-ignored) when the site is built, and skips the work when that folder
// is already up to date for the current release.
// Usage: node scripts/build-icons.mjs [--force]
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { strFromU8, unzipSync } from 'fflate';

const ROOT = new URL('..', import.meta.url);
const CACHE = new URL('.cache/', ROOT);
const OUT = new URL('web/public/mc/', ROOT);
const XMATERIAL = 'https://raw.githubusercontent.com/CryptoMorin/XSeries/master/core/src/main/java/com/cryptomorin/xseries/XMaterial.java';
const LEGACY_IDS = 'https://raw.githubusercontent.com/PrismarineJS/minecraft-data/master/data/pc/common/legacy.json';

async function fetchOk(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} for ${url}`);
  return res;
}

/** A download kept in .cache/ so rebuilds don't fetch the 30 MB jar again. */
async function cached(name, url) {
  mkdirSync(CACHE, { recursive: true });
  const file = new URL(name, CACHE);
  if (existsSync(file)) return readFileSync(file);
  const bytes = Buffer.from(await (await fetchOk(url)).arrayBuffer());
  writeFileSync(file, bytes);
  return bytes;
}

const indexFile = new URL('index.json', OUT);
let manifest;
try {
  manifest = await (await fetchOk('https://piston-meta.mojang.com/mc/game/version_manifest_v2.json')).json();
} catch (err) {
  // Offline: keep whatever icons were built last time.
  if (existsSync(indexFile)) {
    console.log(`mc icons: Mojang unreachable (${err.message}), keeping the existing icons`);
    process.exit(0);
  }
  throw err;
}
const version = process.env.MC_VERSION || manifest.latest.release;
if (!process.argv.includes('--force') && existsSync(indexFile)) {
  try {
    if (JSON.parse(readFileSync(indexFile, 'utf8')).version === version) {
      console.log(`mc icons: up to date for ${version}`);
      process.exit(0);
    }
  } catch {
    // rebuild
  }
}

const meta = await (await fetchOk(manifest.versions.find((v) => v.id === version).url)).json();
const jar = await cached(`client-${version}.jar`, meta.downloads.client.url);
const HEAD_SKINS = {
  skeleton: 'entity/skeleton/skeleton',
  wither_skeleton: 'entity/skeleton/wither_skeleton',
  zombie: 'entity/zombie/zombie',
  creeper: 'entity/creeper/creeper',
  player: 'entity/player/wide/steve',
  piglin: 'entity/piglin/piglin',
};
const wanted = new RegExp(
  `^assets/minecraft/(items/|models/(item|block)/|textures/(item|block)/|textures/(${Object.values(HEAD_SKINS).join('|')})\\.png$)`,
);
const files = unzipSync(new Uint8Array(jar), { filter: (f) => wanted.test(f.name) });
const json = (path) => (files[path] ? JSON.parse(strFromU8(files[path])) : null);
const bare = (ref) => String(ref).replace(/^minecraft:/, '');

// ------------------------------------------------------------------ legacy names

/** "LEGACY:data" -> modern name, from XMaterial's enum entries. */
async function legacyMap() {
  const src = (await cached('XMaterial.java', XMATERIAL)).toString('utf8');
  const map = {};
  // A bare entry (`PAPER,`) kept its 1.8 name, so it wins over entries that
  // only list that name as a legacy alias (SPLASH_POTION("POTION")).
  for (const m of src.matchAll(/^ {4}([A-Z0-9_]+)\s*[,;]/gm)) map[`${m[1]}:0`] = m[1];
  const named = [];
  for (const m of src.matchAll(/^ {4}([A-Z0-9_]+)\(([^)]*(?:\([^)]*\))?[^)]*)\)\s*[,;]/gm)) {
    const [, name, args] = m;
    // Beds: `supports(1, 12) ? 14 : 0` -- 1.8 is the value after the colon.
    const data = Number(/:\s*(\d+)\s*,/.exec(args)?.[1] ?? /^\s*(\d+)/.exec(args)?.[1] ?? 0);
    const legacy = [...args.matchAll(/"([A-Z0-9_]+)"/g)].map((x) => x[1]);
    for (const l of legacy) map[`${l}:${data}`] ??= name;
    named.push(name);
  }
  // Modern names work as keys too, for icon ids written that way.
  for (const name of named) map[`${name}:0`] ??= name;
  map['BED:0'] = 'RED_BED'; // 1.8 beds were red
  return map;
}

// ------------------------------------------------------------------ models

/** The first plain model an item definition shows, with its tints. */
function definitionModel(node) {
  if (!node || typeof node !== 'object') return null;
  const type = bare(node.type ?? '');
  if (type === 'model') return { model: node.model, tints: node.tints ?? [] };
  if (type === 'special') return { model: node.base, special: node.model, tints: [] };
  if (type === 'condition') return definitionModel(node.on_false) ?? definitionModel(node.on_true);
  if (type === 'select') return definitionModel(node.fallback) ?? definitionModel(node.cases?.[0]?.model);
  if (type === 'range_dispatch') return definitionModel(node.fallback) ?? definitionModel(node.entries?.[0]?.model);
  if (type === 'composite') return definitionModel(node.models?.[0]);
  return null;
}

function loadModel(ref) {
  let textures = {};
  let elements = null;
  const chain = [];
  for (let r = ref, i = 0; r && i < 12; i++) {
    const path = bare(r);
    chain.push(path);
    const model = json(`assets/minecraft/models/${path}.json`);
    if (!model) break;
    textures = { ...model.textures, ...textures };
    elements ??= model.elements ?? null;
    r = model.parent;
  }
  return { textures, elements, chain };
}

function texturePath(textures, ref) {
  // Newer models can write a texture as { sprite, force_translucent }.
  const sprite = (v) => (v && typeof v === 'object' ? v.sprite : v);
  let t = sprite(ref);
  for (let i = 0; i < 10 && typeof t === 'string' && t.startsWith('#'); i++) t = sprite(textures[t.slice(1)]);
  if (typeof t !== 'string') return null;
  const path = `assets/minecraft/textures/${bare(t)}.png`;
  return files[path] ? path : null;
}

const hex = (n) => `#${((n >>> 0) & 0xffffff).toString(16).padStart(6, '0')}`;

/** A tint as '#rrggbb', or 'dye:#rrggbb' when the item's own colour replaces it. */
function tintOf(t) {
  if (!t) return null;
  const type = bare(t.type ?? '');
  if (type === 'grass') return '#7cbd6b';
  if (type === 'dye') return `dye:${hex(t.default ?? -6265536)}`;
  const value = t.value ?? t.default;
  return value == null ? null : hex(value);
}

// ------------------------------------------------------------------ output

const textures = new Map(); // zip path -> short hash
function addTexture(path) {
  if (!textures.has(path)) textures.set(path, createHash('sha1').update(files[path]).digest('hex').slice(0, 10));
  return textures.get(path);
}

/** Icon spec: { f: layers } flat, { b: { t, l, r } } block faces, or { h: skin } head. */
function iconFor(name) {
  const def = definitionModel(json(`assets/minecraft/items/${name}.json`)?.model);
  if (!def) return null;
  const special = def.special ? bare(def.special.type ?? '') : null;
  if (special === 'head') {
    const skin = HEAD_SKINS[def.special.kind];
    const path = skin && `assets/minecraft/textures/${skin}.png`;
    return path && files[path] ? { h: addTexture(path) } : null;
  }
  const model = loadModel(def.model);
  const layers = (pairs) => pairs.filter(([p]) => p).map(([p, tint]) => (tint ? [addTexture(p), tint] : [addTexture(p)]));

  if (!model.elements || model.chain.some((p) => /generated$/.test(p))) {
    const out = [];
    for (let i = 0; i < 5; i++) {
      const p = texturePath(model.textures, model.textures[`layer${i}`]);
      if (p) out.push([p, tintOf(def.tints[i])]);
    }
    if (out.length) return { f: layers(out) };
  }
  if (model.elements) {
    const face = (dir) =>
      layers(
        model.elements
          .map((el) => el.faces?.[dir])
          .filter(Boolean)
          .map((f) => [texturePath(model.textures, f.texture), f.tintindex != null ? tintOf(def.tints[f.tintindex]) : null]),
      );
    const b = { t: face('up'), l: face('north'), r: face('east') };
    if (b.t.length || b.l.length) return { b };
  }
  // Chests, shields and other entity-drawn items: their particle texture.
  const particle = texturePath(model.textures, model.textures.particle);
  return particle ? { f: layers([[particle]]) } : null;
}

const map = await legacyMap();
// Inventory NBT stores numeric 1.8 ids ("351:3"); minecraft-data (MIT) maps
// those to modern names. Keys start with # to keep them apart.
const numeric = JSON.parse((await cached('legacy.json', LEGACY_IDS)).toString('utf8')).items;
for (const [key, name] of Object.entries(numeric)) map[`#${key}`] = bare(name).replace(/\[.*$/, '').toUpperCase();
const icons = {};
for (const modern of new Set(Object.values(map))) {
  const name = modern.toLowerCase();
  const icon = iconFor(name);
  if (icon) icons[name] = icon;
}
for (const key of Object.keys(map)) {
  const name = map[key].toLowerCase();
  if (icons[name]) map[key] = name;
  else delete map[key];
}

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });
for (const [path, hash] of textures) writeFileSync(new URL(`${hash}.png`, OUT), files[path]);
writeFileSync(indexFile, JSON.stringify({ version, map, icons }));
writeFileSync(
  new URL('NOTICE.txt', OUT),
  `Textures from Minecraft ${version} by Mojang Studios, used for item icons under the Minecraft Usage Guidelines.\nGenerated by scripts/build-icons.mjs; not part of this repository.\n`,
);
console.log(`mc icons: ${Object.keys(icons).length} icons, ${textures.size} textures, ${Object.keys(map).length} legacy names (${version})`);
