/**
 * Client-side localStorage caching with two patterns:
 *
 * - Pattern A ("expiration"): the stored value IS the expiration timestamp (ms since epoch).
 *   Used for rate-limit cooldowns, cookie health, page-view debounce.
 *
 * - Pattern B ("cached value"): stores { value, exp } as a JSON blob in a single key.
 *   Used for config data like max upload file size.
 */

// ─── Pattern A: expiration timestamp ────────────────────────────────────

export function setExpiration(key: string, expiresAt: number): void {
  try {
    localStorage.setItem(key, String(expiresAt));
  } catch { /* storage unavailable */ }
}

export function setExpirationFromNow(key: string, ttlMs: number): void {
  setExpiration(key, Date.now() + ttlMs);
}

/** Returns remaining seconds before expiration. Returns 0 if expired or missing. */
export function getExpirationRemaining(key: string): number {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return 0;
    const exp = parseInt(raw, 10);
    if (!Number.isFinite(exp)) return 0;
    return Math.max(0, Math.ceil((exp - Date.now()) / 1000));
  } catch {
    return 0;
  }
}

export function isExpired(key: string): boolean {
  return getExpirationRemaining(key) <= 0;
}

// ─── Pattern B: value + expiration JSON blob ────────────────────────────

export function setCachedValue<T>(key: string, value: T, ttlMs: number): void {
  try {
    localStorage.setItem(key, JSON.stringify({ value, exp: Date.now() + ttlMs }));
  } catch { /* storage unavailable */ }
}

export function getCachedValue<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const entry = JSON.parse(raw);
    if (!entry || typeof entry.exp !== "number" || Date.now() > entry.exp) {
      localStorage.removeItem(key);
      return null;
    }
    return entry.value as T;
  } catch {
    return null;
  }
}
