export function readCacheEntry(key, maxAgeMs) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.savedAt) return null;
    const ageMs = Math.max(0, Date.now() - parsed.savedAt);
    return {
      value: parsed.value,
      savedAt: parsed.savedAt,
      ageMs,
      isStale: ageMs > maxAgeMs,
    };
  } catch {
    return null;
  }
}

export function readCache(key, maxAgeMs) {
  const entry = readCacheEntry(key, maxAgeMs);
  return entry && !entry.isStale ? entry.value : null;
}

export function writeCache(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify({ savedAt: Date.now(), value }));
  } catch {
    // The page works without local storage.
  }
}
