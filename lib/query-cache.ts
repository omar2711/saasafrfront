/** Memory + bounded sessionStorage. Keys are session hashes, never bearer tokens. */
export class QueryCache {
  private entries = new Map<string, { scope: string; until: number; value: unknown; size?: number }>();
  private pending = new Map<string, { scope: string; promise: Promise<unknown> }>();
  private version = 0;
  private memorySize = 0;
  private storage?: Storage;
  private readonly prefix = 'afr:query:v1:';
  get revision() { return this.version; }
  setStorage(storage: Storage) { this.storage = storage; }

  private storageEntries() {
    const rows: [string, { scope: string; until: number; value: unknown }][] = [];
    try {
      for (let i = 0; this.storage && i < this.storage.length; i++) {
        const key = this.storage.key(i);
        if (key?.startsWith(this.prefix)) {
          try { rows.push([key, JSON.parse(this.storage.getItem(key) ?? 'null')]); }
          catch { /* malformed entries are not read */ }
        }
      }
    } catch { /* unavailable storage falls back to memory */ }
    return rows;
  }

  clear(scope?: string) {
    this.version++;
    for (const [key, entry] of this.entries) if (!scope || entry.scope === scope) {
      this.memorySize -= entry.size ?? 0; this.entries.delete(key);
    }
    for (const [key, entry] of this.pending) if (!scope || entry.scope === scope) this.pending.delete(key);
    if (!scope) {
      try {
        for (let i = (this.storage?.length ?? 0) - 1; i >= 0; i--) {
          const key = this.storage?.key(i);
          if (key?.startsWith(this.prefix)) this.storage?.removeItem(key);
        }
      } catch { /* unavailable storage */ }
      return;
    }
    for (const [key, entry] of this.storageEntries()) {
      if (!scope || entry?.scope === scope) try { this.storage?.removeItem(key); } catch { /* memory still cleared */ }
    }
  }

  async read<T>(key: string, scope: string, ttl: number, load: () => Promise<T>): Promise<T> {
    let cached = this.entries.get(key);
    if (cached?.scope !== scope) cached = undefined;
    if (!cached && this.storage) {
      try {
        const stored = JSON.parse(this.storage.getItem(this.prefix + key) ?? 'null');
        if (stored?.scope === scope && Number.isFinite(stored.until) && stored.until > Date.now()) cached = stored;
        else this.storage.removeItem(this.prefix + key);
      } catch { /* storage blocked/full or malformed; fetch normally */ }
    }
    if (cached && cached.until > Date.now()) return structuredClone(cached.value) as T;
    const existing = this.pending.get(key);
    if (existing?.scope === scope) return structuredClone(await existing.promise) as T;
    const version = this.version;
    const promise = load().then(value => {
      if (version === this.version) {
        const entry = { scope, until: Date.now() + ttl, value: structuredClone(value) };
        const serialized = JSON.stringify(entry);
        this.memorySize -= this.entries.get(key)?.size ?? 0;
        this.entries.delete(key);
        if (serialized.length <= 1000000) {
          while (this.entries.size >= 256 || this.memorySize + serialized.length > 5000000) {
            const oldestKey = this.entries.keys().next().value;
            if (oldestKey === undefined) break;
            this.memorySize -= this.entries.get(oldestKey)?.size ?? 0;
            this.entries.delete(oldestKey);
          }
          this.entries.set(key, { ...entry, size: serialized.length });
          this.memorySize += serialized.length;
        }
        if (this.storage) {
          try {
            // Avoid persisting large catalogs or exports; those can stay in memory.
            if (serialized.length <= 100000) {
              const stored = this.storageEntries();
              for (const [oldKey, old] of stored) if (!old || old.until <= Date.now()) this.storage.removeItem(oldKey);
              const fresh = stored.filter(([, old]) => old?.until > Date.now()).sort((a, b) => a[1].until - b[1].until);
              let size = fresh.reduce((bytes, [, old]) => bytes + JSON.stringify(old).length, 0);
              while (fresh.length >= 64 || size + serialized.length > 1000000) {
                const oldest = fresh.shift(); if (!oldest) break;
                this.storage.removeItem(oldest[0]); size -= JSON.stringify(oldest[1]).length;
              }
              this.storage.setItem(this.prefix + key, serialized);
            }
          } catch { /* quota failure never blocks a worker's operation */ }
        }
      }
      return value;
    });
    this.pending.set(key, { scope, promise });
    try { return structuredClone(await promise); }
    finally { if (this.pending.get(key)?.promise === promise) this.pending.delete(key); }
  }
}
