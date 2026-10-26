// localStorage can throw in private windows or when site data is blocked,
// so every access is wrapped. Only used for small conveniences.
export function load(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw == null ? fallback : JSON.parse(raw);
  } catch {
    return fallback;
  }
}

export function save(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore
  }
}

export function rememberSearch(name) {
  const list = load('recent', []).filter((n) => n.toLowerCase() !== name.toLowerCase());
  list.unshift(name);
  save('recent', list.slice(0, 6));
}
