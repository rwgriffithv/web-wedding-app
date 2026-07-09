const stores = new Map<string, Map<string, { count: number; resetAt: number }>>();

export function createRateLimiter(name: string, maxAttempts = 5, windowMs = 60_000) {
  if (!stores.has(name)) {
    stores.set(name, new Map());
  }
  const store = stores.get(name)!;

  const interval = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of store) {
      if (now > entry.resetAt) store.delete(key);
    }
  }, 60_000);

  if (typeof interval.unref === "function") {
    interval.unref();
  }

  return {
    check(key: string): boolean {
      const now = Date.now();
      const entry = store.get(key);
      if (!entry || now > entry.resetAt) {
        store.set(key, { count: 1, resetAt: now + windowMs });
        return true;
      }
      if (entry.count >= maxAttempts) return false;
      entry.count++;
      return true;
    },
  };
}
