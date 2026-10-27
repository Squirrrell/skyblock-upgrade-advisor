// Item icon state: which pack is selected, textures from a loaded FurfSky
// pack, and per-item hints (skull texture, rarity, glint) from the item index.
import { useSyncExternalStore } from 'react';
import { DEFAULT_ICON_PACK, ICON_PACKS, SPECIAL_ICONS } from '../theme.js';
import { STATIC_MODE } from './api.js';
import { loadItems } from './data.js';
import { bundledLookup, combinePacks, loadPackTextures } from './furfsky.js';
import { PENDING_ICON, renderedHead } from './heads3d.js';
import { loadSavedPacks, savePacks } from './packStore.js';
import { vanillaIcon } from './vanilla.js';

let pack = readPack();
let packTextures = null; // { get(id), getSkull(hash) } once a FurfSky pack is loaded
let packInfo = null; // { names, count, source: 'minecraft' | 'saved' | 'picked' | 'bundled' }
let packLoading = false;
let items = null; // Map<id, item> from the item index
// { pets: { TYPE: hash }, shards: { SHARD_X: hash } }, from scripts/build-heads.mjs.
// The skins their 3D heads are drawn from.
let heads = null;
const listeners = new Set();

function readPack() {
  try {
    const saved = localStorage.getItem('iconPack');
    return ICON_PACKS[saved] ? saved : DEFAULT_ICON_PACK;
  } catch {
    return DEFAULT_ICON_PACK;
  }
}

function emit() {
  version++;
  for (const l of listeners) l();
}
let version = 0;

const subscribe = (fn) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};

/** Re-render when the pack, pack textures or item hints change. */
export function useIcons() {
  useSyncExternalStore(subscribe, () => version);
  return { pack, packInfo, packLoading };
}

export function setIconPack(next) {
  if (!ICON_PACKS[next]) return;
  pack = next;
  try {
    localStorage.setItem('iconPack', next);
  } catch {
    // private mode: the choice lasts for this visit
  }
  emit();
}

export function setPackTextures(map, info) {
  packTextures?.revoke?.();
  packTextures = map;
  packInfo = info;
  emit();
}

/**
 * Load FurfSky pack files ([{ name, blob }]) as the icon textures. The newer
 * .cats release goes first so it wins over the older FULL zip.
 */
export async function loadPackFiles(files, source) {
  packLoading = true;
  emit();
  try {
    const ordered = [...files].sort((a, b) => /.cats/i.test(b.name) - /.cats/i.test(a.name));
    const packs = await Promise.all(ordered.map((f) => loadPackTextures(f.blob).catch(() => null)));
    const combined = combinePacks(packs);
    if (!combined.size) {
      setPackTextures(null, null);
      return 0;
    }
    setPackTextures(combined, { names: ordered.map((f) => f.name), count: combined.size, source });
    if (source === 'picked') await savePacks(ordered);
    return combined.size;
  } finally {
    packLoading = false;
    emit();
  }
}

/** The FurfSky textures bundled with the site (scripts/build-furfsky.mjs). */
async function loadBundledPack() {
  const base = `${import.meta.env.BASE_URL}furfsky/`;
  const res = await fetch(`${base}index.json`);
  if (!res.ok) return;
  const index = await res.json();
  const lookup = bundledLookup(index, base);
  if (lookup.size) setPackTextures(lookup, { names: index.packs ?? ['FurfSky Reborn'], count: lookup.size, source: 'bundled' });
}

// FurfSky textures load by themselves. A pack in your Minecraft folder (local
// server) or one you picked earlier wins; otherwise the bundled copy is used.
async function autoLoadPacks() {
  if (!STATIC_MODE) {
    try {
      const list = await (await fetch('/api/packs')).json();
      if (list.packs?.length) {
        const files = await Promise.all(
          list.packs.map(async (p) => {
            const res = await fetch(p.url);
            return res.ok ? { name: p.name, blob: await res.blob() } : null;
          }),
        );
        if (files.some(Boolean)) return loadPackFiles(files.filter(Boolean), 'minecraft');
      }
    } catch {
      // no local packs: fall through to anything saved in the browser
    }
  }
  const saved = await loadSavedPacks();
  if (saved.length && (await loadPackFiles(saved, 'saved'))) return;
  await loadBundledPack();
}
autoLoadPacks().catch(() => {});

// Item hints load once, in the background; icons re-render when they arrive.
loadItems()
  .then((map) => {
    items = map;
    emit();
  })
  .catch(() => {});

fetch(`${import.meta.env.BASE_URL}heads.json`, { cache: 'no-cache' })
  .then((r) => (r.ok ? r.json() : null))
  .then((data) => {
    heads = data;
    emit();
  })
  .catch(() => {});

const PET_ID = /^PET_(.+)_(COMMON|UNCOMMON|RARE|EPIC|LEGENDARY|MYTHIC)$/;

/** Skull texture for pets, shards and essences, which are not in the item index. */
function headHash(id) {
  const pet = PET_ID.exec(id);
  if (pet) return heads?.pets?.[pet[1]] ?? null;
  return heads?.shards?.[id] ?? heads?.items?.[id] ?? null;
}

/** What we know about an item: display name, rarity, glint, skull texture, material. */
export function itemInfo(id) {
  const item = items?.get(id);
  return {
    name: item?.name ?? null,
    tier: item?.tier ?? null,
    glowing: Boolean(item?.glowing) || id?.startsWith('ENCHANTMENT_'),
    skull: item?.skull ?? headHash(id),
    // Shards shown as a plain item (Obsidian Defender: obsidian) use its modern name.
    mat: item?.mat ?? (heads?.models?.[id] ? `${heads.models[id].toUpperCase()}:0` : null),
    color: item?.color ?? null,
  };
}

/** The Minecraft material an id is drawn with: the item's own, or the id itself (WHEAT, CHEST...). */
function materialKey(id, hint) {
  if (hint.mat) return hint.mat;
  if (id.startsWith('ENCHANTMENT_')) return 'ENCHANTED_BOOK:0';
  return `${SPECIAL_ICONS[id] ?? id}:0`;
}

/** Candidate image URLs for an item in the selected pack, best first. */
export function iconUrls(id, extraHint = {}) {
  if (!id) return [];
  const info = itemInfo(id);
  // extraHint (an inventory item's own skin, material and dye) wins over the item index.
  const hint = { skull: info.skull, mat: info.mat, color: info.color, isPet: PET_ID.test(id) };
  for (const [k, v] of Object.entries(extraHint)) if (v != null) hint[k] = v;
  const src = {
    head: (skin) => renderedHead(skin, emit),
    vanilla: () => {
      const own = vanillaIcon(materialKey(id, hint), hint.color, emit);
      // An inventory item's own material first, then the item index's.
      return own === null && info.mat && info.mat !== hint.mat ? vanillaIcon(info.mat, hint.color, emit) : own;
    },
    pack: () => packTextures?.get(id) ?? null,
    packSkull: (skin) => packTextures?.getSkull?.(skin) ?? null,
  };
  const out = [];
  for (const url of ICON_PACKS[pack].urls(id, hint, src)) {
    // Still drawing the best icon: show an empty slot rather than a worse one.
    if (url === undefined) return out.length ? out : [PENDING_ICON];
    if (url) out.push(url);
  }
  return out;
}
