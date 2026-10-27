// Item icon state: which pack is selected, textures from a loaded FurfSky
// pack, and per-item hints (skull texture, rarity, glint) from the item index.
import { useSyncExternalStore } from 'react';
import { ICON_PACKS } from '../theme.js';
import { dataUrl, loadItems } from './data.js';

let pack = readPack();
let packTextures = null; // { get(id) -> objectURL } once a FurfSky zip is loaded
let packInfo = null; // { name, count }
let items = null; // Map<id, item> from the item index
let shardIds = null; // Map<SHARD_X, ATTRIBUTE_SHARD_Y;1>
let heads = null; // { pets: { TYPE: hash }, shards: { SHARD_X: hash } }, from scripts/build-heads.mjs
const listeners = new Set();

function readPack() {
  try {
    const saved = localStorage.getItem('iconPack');
    return ICON_PACKS[saved] ? saved : 'default';
  } catch {
    return 'default';
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
  return { pack, packInfo };
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

// Item hints load once, in the background; icons re-render when they arrive.
loadItems()
  .then((map) => {
    items = map;
    emit();
  })
  .catch(() => {});

fetch(dataUrl('attribute_shards.json'))
  .then((r) => (r.ok ? r.json() : null))
  .then((data) => {
    if (!data?.attributes) return;
    shardIds = new Map(data.attributes.map((a) => [a.bazaarName, a.internalName]));
    emit();
  })
  .catch(() => {});

fetch(`${import.meta.env.BASE_URL}heads.json`)
  .then((r) => (r.ok ? r.json() : null))
  .then((data) => {
    heads = data;
    emit();
  })
  .catch(() => {});

const PET_ID = /^PET_(.+)_(COMMON|UNCOMMON|RARE|EPIC|LEGENDARY|MYTHIC)$/;

/** Skull texture for pets and shards, which are not in the item index. */
function headHash(id) {
  const pet = PET_ID.exec(id);
  if (pet) return heads?.pets?.[pet[1]] ?? null;
  return heads?.shards?.[id] ?? null;
}

/** What we know about an item: display name, rarity, glint, skull texture. */
export function itemInfo(id) {
  const item = items?.get(id);
  return {
    name: item?.name ?? null,
    tier: item?.tier ?? null,
    glowing: Boolean(item?.glowing) || id?.startsWith('ENCHANTMENT_'),
    skull: item?.skull ?? headHash(id),
  };
}

/** Candidate image URLs for an item in the selected pack, best first. */
export function iconUrls(id, extraHint = {}) {
  if (!id) return [];
  const info = itemInfo(id);
  const hint = { skull: info.skull, shardInternal: shardIds?.get(id), ...extraHint };
  return ICON_PACKS[pack].urls(id, hint, packTextures);
}
