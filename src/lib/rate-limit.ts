import { getConfig } from "./repository/site-config";

const MAX_STORE_SIZE = 10_000;

const stores = new Map<string, Map<string, { count: number; resetAt: number }>>();
const intervals = new Map<string, ReturnType<typeof setInterval>>();

export interface RateLimitConfig {
  maxAttempts: number;
  windowMs: number;
}

export function getRateLimitConfig(
  maxKey: string,
  windowKey: string,
  defaultMax: number,
  defaultWindowSeconds: number,
): RateLimitConfig {
  const max = parseInt(getConfig(maxKey), 10);
  const windowSeconds = parseInt(getConfig(windowKey), 10);
  return {
    maxAttempts: Number.isFinite(max) && max > 0 ? max : defaultMax,
    windowMs: (Number.isFinite(windowSeconds) && windowSeconds > 0 ? windowSeconds : defaultWindowSeconds) * 1000,
  };
}

export function createRateLimiter(name: string) {
  if (!stores.has(name)) {
    stores.set(name, new Map());
  }
  const store = stores.get(name)!;

  if (!intervals.has(name)) {
    const interval = setInterval(() => {
      const now = Date.now();
      for (const [key, entry] of store) {
        if (now > entry.resetAt) store.delete(key);
      }
    }, 60_000);

    if (typeof interval.unref === "function") {
      interval.unref();
    }
    intervals.set(name, interval);
  }

  return {
    check(key: string, config: RateLimitConfig): boolean {
      const now = Date.now();
      const entry = store.get(key);
      if (!entry || now > entry.resetAt) {
        if (store.size >= MAX_STORE_SIZE) {
          let oldestKey: string | undefined;
          let oldestReset = Infinity;
          for (const [k, v] of store) {
            if (v.resetAt < oldestReset) {
              oldestReset = v.resetAt;
              oldestKey = k;
            }
          }
          if (oldestKey !== undefined) store.delete(oldestKey);
        }
        store.set(key, { count: 1, resetAt: now + config.windowMs });
        return true;
      }
      if (entry.count >= config.maxAttempts) return false;
      entry.count++;
      return true;
    },
    reset(): void {
      store.clear();
    },
  };
}
