// Keeps the visitor's own FurfSky pack files in IndexedDB, so a pack picked
// once loads by itself on every later visit. Only this browser can read it.
const DB = 'skyblock-advisor';
const STORE = 'packs';
const KEY = 'furfsky';

function open() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function run(mode, fn) {
  const db = await open();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, mode);
    const req = fn(tx.objectStore(STORE));
    tx.oncomplete = () => resolve(req?.result);
    tx.onerror = () => reject(tx.error);
  }).finally(() => db.close());
}

/** Saved packs as [{ name, blob }], or [] when nothing is saved or storage is blocked. */
export async function loadSavedPacks() {
  try {
    return (await run('readonly', (s) => s.get(KEY))) ?? [];
  } catch {
    return [];
  }
}

export async function savePacks(packs) {
  try {
    await run('readwrite', (s) => s.put(packs, KEY));
    return true;
  } catch {
    return false;
  }
}

export async function forgetPacks() {
  try {
    await run('readwrite', (s) => s.delete(KEY));
  } catch {
    // nothing to forget
  }
}
