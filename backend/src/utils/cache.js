/** Simple TTL in-memory cache */
class Cache {
  constructor(ttlMs = 5 * 60 * 1000) {
    this.store = new Map();
    this.ttlMs = ttlMs;
  }

  get(key) {
    const entry = this.store.get(key);
    if (!entry) return undefined;
    if (Date.now() - entry.ts > this.ttlMs) {
      this.store.delete(key);
      return undefined;
    }
    return entry.value;
  }

  set(key, value) {
    this.store.set(key, { value, ts: Date.now() });
  }

  async getOrFetch(key, fetchFn) {
    const cached = this.get(key);
    if (cached !== undefined) return cached;
    const value = await fetchFn();
    this.set(key, value);
    return value;
  }

  invalidate(key) {
    this.store.delete(key);
  }

  clear() {
    this.store.clear();
  }
}

// Shared instances
const mediaCache = new Cache(10 * 60 * 1000); // 10 min for media lists
const historyCache = new Cache(3 * 60 * 1000); // 3 min for watch history

module.exports = { Cache, mediaCache, historyCache };
