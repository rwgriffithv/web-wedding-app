const MAX_STORE_SIZE = 10_000;

const stores = new Map<string, Map<string, { count: number; resetAt: number }>>();

interface RateLimitConfig {
  maxAttempts: number;
  windowMs: number;
}

export function createRateLimiter(
  name: string,
  defaultMaxAttempts = 5,
  defaultWindowMs = 60_000,
  getConfig?: () => RateLimitConfig,
) {
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
      const cfg = getConfig?.() ?? { maxAttempts: defaultMaxAttempts, windowMs: defaultWindowMs };
      const now = Date.now();
      const entry = store.get(key);
      if (!entry || now > entry.resetAt) {
        if (store.size >= MAX_STORE_SIZE) {
          const oldestKey = store.keys().next().value;
          if (oldestKey !== undefined) store.delete(oldestKey);
        }
        store.set(key, { count: 1, resetAt: now + cfg.windowMs });
        return true;
      }
      if (entry.count >= cfg.maxAttempts) return false;
      entry.count++;
      return true;
    },
  };
}
