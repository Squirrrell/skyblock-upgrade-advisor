// Reads FurfSky Reborn resource packs: the copy bundled with the site
// (built by scripts/build-furfsky.mjs, with the FurfSky team's permission) or
// one the visitor picks from their own computer, read in the browser.
//
// Three layouts are understood:
//  - Catharsis .cats (the current FurfSky Reborn release, raw or inside a
//    .cats.zip): 1.21 item definitions at assets/skyblock/items/<id>.json
//    pointing at models and textures. Format: github.com/meowdding/cats-file-format
//  - OptiFine / MCPatcher CIT: .properties files matching
//    nbt.ExtraAttributes.id (exact ids, regex: and pattern: rules) or a
//    skull texture (nbt.SkullOwner...Value, how the pack retextures pets), with the
//    texture given by texture=, texture.<item>=, a local model json, or a
//    .png named like the properties file. This is the classic FurfSky
//    Reborn "FULL" zip.
//  - Firmament: assets/firmskyblock/models/item/<skyblock_id>.json, whose
//    layer0 texture points into assets/firmskyblock/textures/.
import { gunzipSync, unzip } from 'fflate';
import { skullHash } from '../../../shared/prices.js';

const decoder = new TextDecoder();

function unzipAsync(bytes) {
  return new Promise((resolve, reject) => {
    // Only text metadata and PNGs matter; skip sounds, shaders and the rest.
    unzip(bytes, { filter: (f) => /\.(properties|json|png|cats)$/i.test(f.name) }, (err, files) => (err ? reject(err) : resolve(files)));
  });
}

const dirname = (p) => p.slice(0, p.lastIndexOf('/') + 1);

function parseProperties(text) {
  const out = {};
  for (const line of text.split(/\r?\n/)) {
    const m = /^\s*([^#=\s][^=]*?)\s*=\s*(.*?)\s*$/.exec(line);
    if (m) out[m[1]] = m[2];
  }
  return out;
}

/** An id rule: exact string, or a RegExp for regex:/pattern: forms. */
function idMatcher(value) {
  if (!value) return null;
  const m = /^(i?)(regex|pattern):(.*)$/.exec(value);
  if (!m) return { exact: value.trim() };
  const [, insensitive, kind, body] = m;
  const source =
    kind === 'regex'
      ? body
      : body
          .replace(/[.+^${}()|[\]\\]/g, '\\$&')
          .replace(/\*/g, '.*')
          .replace(/\?/g, '.');
  try {
    return { re: new RegExp(`^(?:${source})$`, insensitive ? 'i' : '') };
  } catch {
    return null;
  }
}

/** Candidate zip paths for a texture name written in a properties or model file. */
function texturePaths(base, name) {
  if (!name) return [];
  const clean = name.replace(/^\.\//, '');
  const png = clean.endsWith('.png') ? clean : `${clean}.png`;
  const [ns, rest] = png.includes(':') ? png.split(':') : ['minecraft', png];
  return [base + png, `assets/${ns}/${rest}`, `assets/${ns}/textures/${rest}`, `assets/${ns}/mcpatcher/cit/${rest}`, `assets/${ns}/optifine/cit/${rest}`];
}

function resolveCitTexture(files, propsPath, props) {
  const base = dirname(propsPath);
  const names = [];
  // texture=, then texture.<item>= (overlays last).
  if (props.texture) names.push(props.texture);
  const keyed = Object.keys(props).filter((k) => k.startsWith('texture.'));
  keyed.sort((a, b) => a.endsWith('_overlay') - b.endsWith('_overlay'));
  for (const k of keyed) names.push(props[k]);
  // A model next to the properties file names its own texture.
  if (props.model) {
    const modelPath = [base + `${props.model.replace(/^\.\//, '')}.json`].find((p) => files[p]);
    if (modelPath) {
      try {
        const model = JSON.parse(decoder.decode(files[modelPath]));
        const tex = model?.textures?.layer0 ?? Object.values(model?.textures ?? {})[0];
        if (tex) names.unshift(tex);
      } catch {
        // ignore broken models
      }
    }
  }
  for (const name of names) {
    const hit = texturePaths(base, name).find((p) => files[p]);
    if (hit) return hit;
  }
  const sibling = propsPath.replace(/\.properties$/i, '.png');
  return files[sibling] ? sibling : null;
}

/** Collect CIT rules, best first: no name/lore conditions, then higher weight. */
function citRules(files) {
  const rules = [];
  let order = 0;
  for (const [path, bytes] of Object.entries(files)) {
    if (!path.toLowerCase().endsWith('.properties')) continue;
    const props = parseProperties(decoder.decode(bytes));
    const skull = skullHash(props['nbt.SkullOwner.Properties.textures.0.Value']);
    const matcher = skull ? { skull } : idMatcher(props['nbt.ExtraAttributes.id']);
    if (!matcher) continue;
    const texture = resolveCitTexture(files, path, props);
    if (!texture) continue;
    const conditional = Object.keys(props).some((k) => k.startsWith('nbt.') && k !== 'nbt.ExtraAttributes.id');
    rules.push({ ...matcher, texture, conditional, weight: Number(props.weight) || 0, order: order++ });
  }
  return rules.sort((a, b) => a.conditional - b.conditional || b.weight - a.weight || a.order - b.order);
}

function firmamentRules(files) {
  const prefix = 'assets/firmskyblock/models/item/';
  const rules = [];
  for (const [path, bytes] of Object.entries(files)) {
    if (!path.startsWith(prefix) || !path.endsWith('.json')) continue;
    let model;
    try {
      model = JSON.parse(decoder.decode(bytes));
    } catch {
      continue;
    }
    const layer = model?.textures?.layer0;
    if (!layer) continue;
    const [ns, rest] = layer.includes(':') ? layer.split(':') : ['minecraft', layer];
    const png = `assets/${ns}/textures/${rest}.png`;
    if (files[png]) rules.push({ exact: path.slice(prefix.length, -5).toUpperCase(), texture: png, conditional: false });
  }
  return rules;
}

// ------------------------------------------------------------------ .cats

/** Index a .cats archive: Map<path, () => bytes>, with each module's top folder dropped. */
function readCats(bytes) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (view.getUint32(0) !== 0x43415453) throw new Error('Not a .cats file');
  let pos = 5; // magic + version
  const entries = [];
  const walk = (prefix) => {
    const count = view.getUint16(pos);
    pos += 2;
    for (let i = 0; i < count; i++) {
      const type = view.getUint8(pos++);
      const len = view.getUint8(pos++);
      const name = decoder.decode(bytes.subarray(pos, pos + len));
      pos += len;
      if (type === 1) walk(prefix + name + '/');
      else {
        entries.push({ path: prefix + name, offset: view.getInt32(pos), size: view.getInt32(pos + 4), gzip: view.getUint8(pos + 8) === 0xfe });
        pos += 9;
      }
    }
  };
  walk('');
  const dataStart = pos;
  const files = new Map();
  for (const e of entries) {
    // FurfSky ships as many small packs ("item_item", "armor_icon", ...) inside one archive.
    const path = e.path.slice(e.path.indexOf('/') + 1);
    if (files.has(path)) continue;
    files.set(path, () => {
      const raw = bytes.subarray(dataStart + e.offset, dataStart + e.offset + e.size);
      return e.gzip ? gunzipSync(raw) : raw;
    });
  }
  return files;
}

/** The first plain model an item definition can show, skipping fallthrough branches. */
function definitionModel(node) {
  if (!node || typeof node !== 'object') return null;
  const type = String(node.type ?? '').replace(/^minecraft:/, '');
  if (type === 'model') return node.model ?? null;
  if (type === 'condition') return definitionModel(node.on_false) ?? definitionModel(node.on_true);
  if (type === 'select') return definitionModel(node.fallback) ?? definitionModel(node.cases?.[0]?.model);
  if (type === 'range_dispatch') return definitionModel(node.fallback) ?? definitionModel(node.entries?.[0]?.model);
  if (type === 'composite') return definitionModel(node.models?.[0]);
  return null;
}

function resourcePath(ref, kind, ext) {
  const [ns, rest] = ref.includes(':') ? ref.split(':') : ['minecraft', ref];
  return 'assets/' + ns + '/' + kind + '/' + rest + ext;
}

function catsRules(files) {
  const json = (path) => {
    const read = files.get(path);
    if (!read) return null;
    try {
      return JSON.parse(decoder.decode(read()));
    } catch {
      return null;
    }
  };
  const textureOf = (modelRef, depth = 0) => {
    const model = depth < 5 && json(resourcePath(modelRef, 'models', '.json'));
    if (!model) return null;
    const tex = model.textures ?? {};
    const ref = tex.layer0 ?? Object.values(tex).find((v) => typeof v === 'string' && !v.startsWith('#'));
    const png = ref && resourcePath(ref, 'textures', '.png');
    if (png && files.has(png)) return png;
    return model.parent ? textureOf(model.parent, depth + 1) : null;
  };
  const rules = [];
  for (const path of files.keys()) {
    const m = /^assets\/skyblock\/items\/([^/]+)\.json$/.exec(path);
    if (!m) continue;
    const modelRef = definitionModel(json(path)?.model);
    const texture = modelRef && textureOf(modelRef);
    if (texture) rules.push({ exact: m[1].toUpperCase(), texture });
  }
  return rules;
}

// ------------------------------------------------------------------ loading

function buildLookup(rules, readTexture) {
  const exact = new Map();
  const skulls = new Map(); // skull texture hash -> texture path
  const patterns = [];
  for (const r of rules) {
    if (r.skull) {
      if (!skulls.has(r.skull)) skulls.set(r.skull, r.texture);
    } else if (r.exact) {
      if (!exact.has(r.exact)) exact.set(r.exact, r.texture);
    } else patterns.push(r);
  }

  const urls = new Map(); // texture path -> object URL
  const resolved = new Map(); // id -> texture path | null
  const urlFor = (path) => {
    if (!urls.has(path)) urls.set(path, URL.createObjectURL(new Blob([readTexture(path)], { type: 'image/png' })));
    return urls.get(path);
  };

  return {
    /** Number of item, skull and pattern textures. */
    size: exact.size + skulls.size + patterns.length,
    get(id) {
      if (!id) return undefined;
      if (!resolved.has(id)) resolved.set(id, exact.get(id) ?? patterns.find((p) => p.re.test(id))?.texture ?? null);
      const path = resolved.get(id);
      return path ? urlFor(path) : undefined;
    },
    /** Texture for a player-head item, by its skull texture hash. */
    getSkull(hash) {
      const path = hash && skulls.get(hash);
      return path ? urlFor(path) : undefined;
    },
    has(id) {
      return Boolean(this.get(id));
    },
    revoke() {
      for (const url of urls.values()) URL.revokeObjectURL(url);
      urls.clear();
    },
  };
}

/**
 * The texture rules in a pack (a .zip, a .cats.zip or raw .cats bytes), plus
 * read(path) for a texture's PNG bytes. Runs in Node too, for the build script.
 */
export async function readPackRules(bytes) {
  if (bytes[0] === 0x43 && bytes[1] === 0x41 && bytes[2] === 0x54 && bytes[3] === 0x53) return catsPack(bytes);
  const files = await unzipAsync(bytes);
  if (files['pack.cats']) return catsPack(files['pack.cats']);
  return { rules: [...firmamentRules(files), ...citRules(files)], read: (path) => files[path] };
}

function catsPack(bytes) {
  const files = readCats(bytes);
  return { rules: catsRules(files), read: (path) => files.get(path)() };
}

/**
 * Turn a pack (File or Blob: a .zip, a .cats.zip or a raw .cats) into a
 * lookup with get(id) -> object URL. Exact ids are a map lookup; regex and
 * pattern rules are tried after that and the answer is cached. Object URLs
 * are made on first use. Animated textures (tall strips of frames) show their
 * first frame because slot images crop to a square from the top.
 */
export async function loadPackTextures(file) {
  const { rules, read } = await readPackRules(new Uint8Array(await file.arrayBuffer()));
  return buildLookup(rules, read);
}

/**
 * The bundled textures: index.json from scripts/build-furfsky.mjs maps ids
 * and skull hashes to PNG names in the same folder, fetched by the browser
 * only when an icon is shown.
 */
export function bundledLookup(index, base) {
  const url = (name) => (name ? base + name + '.png' : undefined);
  const patterns = (index.patterns ?? []).map(([source, flags, name]) => ({ re: new RegExp(source, flags), name }));
  const resolved = new Map();
  return {
    size: Object.keys(index.items).length + Object.keys(index.skulls).length + patterns.length,
    get(id) {
      if (!id) return undefined;
      if (!resolved.has(id)) resolved.set(id, index.items[id] ?? patterns.find((p) => p.re.test(id))?.name ?? null);
      return url(resolved.get(id));
    },
    getSkull: (hash) => url(hash && index.skulls[hash]),
    has(id) {
      return Boolean(this.get(id));
    },
    revoke() {},
  };
}

/** Several packs as one lookup; earlier packs win. */
export function combinePacks(packs) {
  const list = packs.filter(Boolean);
  return {
    size: list.reduce((n, p) => n + p.size, 0),
    get: (id) => list.reduce((hit, p) => hit ?? p.get(id), undefined),
    getSkull: (hash) => list.reduce((hit, p) => hit ?? p.getSkull(hash), undefined),
    has(id) {
      return Boolean(this.get(id));
    },
    revoke: () => list.forEach((p) => p.revoke()),
  };
}
