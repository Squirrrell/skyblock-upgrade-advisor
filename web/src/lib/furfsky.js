// Reads a FurfSky Reborn resource pack zip that the visitor picks from their
// own computer. Everything happens in the browser; nothing is uploaded.
//
// Two layouts are understood:
//  - OptiFine / MCPatcher CIT: .properties files matching
//    nbt.ExtraAttributes.id (exact ids, regex: and pattern: rules) or a
//    skull texture (nbt.SkullOwner...Value, how the pack retextures pets), with the
//    texture given by texture=, texture.<item>=, a local model json, or a
//    .png named like the properties file. This is the classic FurfSky
//    Reborn "FULL" zip.
//  - Firmament: assets/firmskyblock/models/item/<skyblock_id>.json, whose
//    layer0 texture points into assets/firmskyblock/textures/.
import { unzip } from 'fflate';
import { skullHash } from '../../../shared/prices.js';

const decoder = new TextDecoder();

function unzipAsync(bytes) {
  return new Promise((resolve, reject) => {
    // Only text metadata and PNGs matter; skip sounds, shaders and the rest.
    unzip(bytes, { filter: (f) => /\.(properties|json|png)$/i.test(f.name) }, (err, files) => (err ? reject(err) : resolve(files)));
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

/**
 * Turn a pack zip (File or Blob) into a lookup with get(id) -> object URL.
 * Exact ids are a map lookup; regex and pattern rules are tried after that
 * and the answer is cached. Object URLs are made on first use. Animated
 * textures (tall strips of frames) show their first frame because slot
 * images crop to a square from the top.
 */
export async function loadPackTextures(file) {
  const files = await unzipAsync(new Uint8Array(await file.arrayBuffer()));
  const rules = [...firmamentRules(files), ...citRules(files)];

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
    if (!urls.has(path)) urls.set(path, URL.createObjectURL(new Blob([files[path]], { type: 'image/png' })));
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
