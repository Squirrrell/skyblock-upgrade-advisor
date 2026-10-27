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
// SkyBlock's own items (fishing nets, reforge stones...) are drawn by
// Hypixel's official SkyBlock resource pack, which Hypixel publishes at
// api.hypixel.net/v2/resources/packs. Each item's `item_model` in Hypixel's
// item list points into it, and it is read the same way as Mojang's files.
//
// Neither Mojang's nor Hypixel's textures are committed: this writes them to
// web/public/mc/ (git-ignored) when the site is built, and skips the work when
// that folder is already up to date for the current release and pack.
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
const mcVersion = process.env.MC_VERSION || manifest.latest.release;

// Hypixel's SkyBlock pack (newest pack format) and its item list. Without
// them the icons fall back to the vanilla materials.
let hypixelPack = null;
let hypixelItems = [];
try {
  const packs = await (await fetchOk('https://api.hypixel.net/v2/resources/packs')).json();
  const sb = packs.packs?.find((p) => p.id === 'SkyBlock');
  hypixelPack = sb?.versions?.slice().sort((a, b) => b.packFormat - a.packFormat)[0] ?? null;
  hypixelItems = (await (await fetchOk('https://api.hypixel.net/v2/resources/skyblock/items')).json()).items ?? [];
} catch (err) {
  console.warn(`mc icons: Hypixel pack unavailable (${err.message}), using vanilla textures only`);
}
const version = hypixelPack ? `${mcVersion}+hypixel.${hypixelPack.hash.slice(0, 8)}` : mcVersion;
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

const meta = await (await fetchOk(manifest.versions.find((v) => v.id === mcVersion).url)).json();
const jar = await cached(`client-${mcVersion}.jar`, meta.downloads.client.url);
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
if (hypixelPack) {
  const zip = await cached(`hypixel-skyblock-${hypixelPack.hash}.zip`, hypixelPack.url);
  Object.assign(files, unzipSync(new Uint8Array(zip), { filter: (f) => /^assets\/hypixel_skyblock\/(items|models|textures)\//.test(f.name) }));
}
const json = (path) => {
  try {
    return files[path] ? JSON.parse(strFromU8(files[path])) : null;
  } catch {
    return null;
  }
};
const bare = (ref) => String(ref).replace(/^minecraft:/, '');
/** "ns:path" (minecraft by default) -> its file in the merged packs. */
const resource = (ref, kind, ext) => {
  const [ns, path] = String(ref).includes(':') ? String(ref).split(':') : ['minecraft', String(ref)];
  return `assets/${ns}/${kind}/${path}${ext}`;
};

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
    chain.push(bare(r));
    const model = json(resource(r, 'models', '.json'));
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
  const path = resource(t, 'textures', '.png');
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

/**
 * Icon spec for an item definition ("wheat", or "hypixel_skyblock:item/..."):
 * { f: layers } flat, { b: { t, l, r } } block faces, or { h: skin } head.
 */
function iconFor(ref) {
  // Normally { model: {...} }; a few of Hypixel's files are the model node itself.
  const root = json(resource(ref, 'items', '.json'));
  const def = definitionModel(root?.model && typeof root.model === 'object' ? root.model : root);
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

// SkyBlock items drawn by Hypixel's pack, keyed by their item_model. A few
// placeholder-paper items have no item_model but a definition of the same
// name in the pack (SAFARI_BELT -> .../safari_belt.json); those are keyed "#ID".
const models = {};
const byName = new Map();
for (const path of Object.keys(files)) {
  const m = /^assets\/hypixel_skyblock\/items\/(.+)\.json$/.exec(path);
  if (m) byName.set(m[1].split('/').pop().toUpperCase(), `hypixel_skyblock:${m[1]}`);
}
for (const item of hypixelItems) {
  const ref = item.item_model ?? (item.material === 'PAPER' ? byName.get(item.id) : null);
  const key = item.item_model ? ref : `#${item.id}`;
  if (!ref || key in models) continue;
  const icon = iconFor(ref);
  if (icon) models[key] = icon;
}

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });
for (const [path, hash] of textures) writeFileSync(new URL(`${hash}.png`, OUT), files[path]);
writeFileSync(indexFile, JSON.stringify({ version, map, icons, models }));
writeFileSync(
  new URL('NOTICE.txt', OUT),
  `Textures from Minecraft ${mcVersion} by Mojang Studios, used for item icons under the Minecraft Usage Guidelines,\nand from Hypixel's SkyBlock resource pack (api.hypixel.net/v2/resources/packs), by Hypixel Inc.\nGenerated by scripts/build-icons.mjs; not part of this repository.\n`,
);
const withModel = hypixelItems.filter((i) => i.item_model).length;
console.log(
  `mc icons: ${Object.keys(icons).length} icons, ${Object.keys(models).length}/${withModel} SkyBlock item models, ${textures.size} textures, ${Object.keys(map).length} legacy names (${version})`,
);
