import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createRateLimiter } from "@/lib/rate-limit";

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("rate limiter", () => {
  it("allows requests within the limit", () => {
    const limiter = createRateLimiter("test-allow", 3, 60_000);
    limiter.reset();

    expect(limiter.check("user1")).toBe(true);
    expect(limiter.check("user1")).toBe(true);
    expect(limiter.check("user1")).toBe(true);
  });

  it("blocks after max attempts", () => {
    const limiter = createRateLimiter("test-block", 2, 60_000);
    limiter.reset();

    expect(limiter.check("user1")).toBe(true);
    expect(limiter.check("user1")).toBe(true);
    expect(limiter.check("user1")).toBe(false);
  });

  it("resets after window expires", () => {
    const limiter = createRateLimiter("test-reset", 1, 10_000);
    limiter.reset();

    expect(limiter.check("user1")).toBe(true);
    expect(limiter.check("user1")).toBe(false);

    vi.advanceTimersByTime(10_001);

    expect(limiter.check("user1")).toBe(true);
  });

  it("different keys are independent", () => {
    const limiter = createRateLimiter("test-independent", 1, 60_000);
    limiter.reset();

    expect(limiter.check("user1")).toBe(true);
    expect(limiter.check("user1")).toBe(false);
    expect(limiter.check("user2")).toBe(true);
  });

  it("clears store when max size exceeded", () => {
    const limiter = createRateLimiter("test-maxsize", 5, 60_000);
    limiter.reset();

    for (let i = 0; i < 10_001; i++) {
      limiter.check(`key-${i}`);
    }

    expect(limiter.check("key-0")).toBe(true);
  });

  it("uses getConfig callback when no explicit config provided", () => {
    let callCount = 0;
    const getConfig = () => {
      callCount++;
      return { maxAttempts: 2, windowMs: 60_000 };
    };
    const limiter = createRateLimiter("test-getconfig", 5, 60_000, getConfig);
    limiter.reset();

    expect(limiter.check("user1")).toBe(true);
    expect(limiter.check("user1")).toBe(true);
    expect(limiter.check("user1")).toBe(false);
    expect(callCount).toBe(3);
  });

  it("explicit config overrides getConfig callback", () => {
    const getConfig = () => ({ maxAttempts: 1, windowMs: 60_000 });
    const limiter = createRateLimiter("test-override", 5, 60_000, getConfig);
    limiter.reset();

    // Explicit config allows 3 attempts
    expect(limiter.check("user1", { maxAttempts: 3, windowMs: 60_000 })).toBe(true);
    expect(limiter.check("user1", { maxAttempts: 3, windowMs: 60_000 })).toBe(true);
    expect(limiter.check("user1", { maxAttempts: 3, windowMs: 60_000 })).toBe(true);
    expect(limiter.check("user1", { maxAttempts: 3, windowMs: 60_000 })).toBe(false);
  });

  it("falls back to defaults when no getConfig and no explicit config", () => {
    const limiter = createRateLimiter("test-fallback", 2, 60_000);
    limiter.reset();

    expect(limiter.check("user1")).toBe(true);
    expect(limiter.check("user1")).toBe(true);
    expect(limiter.check("user1")).toBe(false);
  });

  it("different named limiters are independent", () => {
    const limiterA = createRateLimiter("test-named-a", 1, 60_000);
    const limiterB = createRateLimiter("test-named-b", 2, 60_000);
    limiterA.reset();
    limiterB.reset();

    limiterA.check("shared-key");
    expect(limiterA.check("shared-key")).toBe(false);
    // limiterB should not be affected
    expect(limiterB.check("shared-key")).toBe(true);
  });

  it("reset clears only the specific limiter", () => {
    const limiterA = createRateLimiter("test-reset-a", 1, 60_000);
    const limiterB = createRateLimiter("test-reset-b", 1, 60_000);
    limiterA.reset();
    limiterB.reset();

    limiterA.check("key1");
    limiterB.check("key1");

    limiterA.reset();

    expect(limiterA.check("key1")).toBe(true);
    expect(limiterB.check("key1")).toBe(false);
  });

  it("cleanup interval removes expired entries", () => {
    const limiter = createRateLimiter("test-cleanup", 10, 60_000);
    limiter.reset();

    limiter.check("key1");
    limiter.check("key2");

    // Advance past the window
    vi.advanceTimersByTime(60_001);

    // The cleanup interval fires every 60s — advance to trigger it
    vi.advanceTimersByTime(60_000);

    // Entries should be cleaned up, allowing fresh checks
    expect(limiter.check("key1")).toBe(true);
    expect(limiter.check("key2")).toBe(true);
  });

  it("returns true for first request to a new key", () => {
    const limiter = createRateLimiter("test-first", 5, 60_000);
    limiter.reset();

    expect(limiter.check("brand-new-key")).toBe(true);
  });

  it("window is per-entry, not global", () => {
    const limiter = createRateLimiter("test-window", 2, 10_000);
    limiter.reset();

    // key1: exhaust at T=0 (window expires at T=10_000)
    expect(limiter.check("key1")).toBe(true);
    expect(limiter.check("key1")).toBe(true);
    expect(limiter.check("key1")).toBe(false); // blocked

    // Advance 1ms, then exhaust key2 (window expires at T=10_001)
    vi.advanceTimersByTime(1);
    expect(limiter.check("key2")).toBe(true);
    expect(limiter.check("key2")).toBe(true);
    expect(limiter.check("key2")).toBe(false); // blocked

    // Advance to T=10_001 — key1 expired, key2 still within window
    vi.advanceTimersByTime(10_000);

    // key1 expired → new entry allowed
    expect(limiter.check("key1")).toBe(true);
    // key2 still within its window → still blocked
    expect(limiter.check("key2")).toBe(false);
  });

  it("config override with different window per key", () => {
    const limiter = createRateLimiter("test-window-override", 1, 60_000);
    limiter.reset();

    limiter.check("short-window", { maxAttempts: 1, windowMs: 5_000 });
    limiter.check("long-window", { maxAttempts: 1, windowMs: 60_000 });

    // Both blocked at first
    expect(limiter.check("short-window")).toBe(false);
    expect(limiter.check("long-window")).toBe(false);

    // Advance past short window but not long
    vi.advanceTimersByTime(5_001);

    // Short window key is available again (new entry created with default config)
    expect(limiter.check("short-window")).toBe(true);
    // Long window key still blocked
    expect(limiter.check("long-window")).toBe(false);
  });
});
