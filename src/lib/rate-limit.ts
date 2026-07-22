import type { RateLimitConfig } from "./site-config";

export { getRateLimitConfig } from "./site-config";
export type { RateLimitConfig } from "./site-config";

/** Result of a rate-limit check. */
export interface RateLimitResult {
  /** Whether the request is allowed. */
  allowed: boolean;
  /** Milliseconds until the rate-limit window resets. 0 when allowed. */
  retryAfterMs: number;
}

const MAX_STORE_SIZE = 10_000;

const stores = new Map<string, Map<string, { count: number; resetAt: number }>>();
const intervals = new Map<string, ReturnType<typeof setInterval>>();

export function createRateLimiter(name: string) {
  let store = stores.get(name);
  if (!store) {
    store = new Map();
    stores.set(name, store);
  }

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
    check(key: string, config: RateLimitConfig): RateLimitResult {
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
        return { allowed: true, retryAfterMs: 0 };
      }
      if (entry.count >= config.maxAttempts) {
        return { allowed: false, retryAfterMs: Math.ceil((entry.resetAt - now) / 1000) * 1000 };
      }
      entry.count++;
      return { allowed: true, retryAfterMs: 0 };
    },
    reset(): void {
      store.clear();
    },
  };
}
