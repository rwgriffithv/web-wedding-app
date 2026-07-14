import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createRateLimiter } from "@/lib/rate-limit";

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

const cfg = (maxAttempts: number, windowMs: number) => ({ maxAttempts, windowMs });

describe("rate limiter", () => {
  it("allows requests within the limit", () => {
    const limiter = createRateLimiter("test-allow");
    limiter.reset();

    expect(limiter.check("user1", cfg(3, 60_000))).toBe(true);
    expect(limiter.check("user1", cfg(3, 60_000))).toBe(true);
    expect(limiter.check("user1", cfg(3, 60_000))).toBe(true);
  });

  it("blocks after max attempts", () => {
    const limiter = createRateLimiter("test-block");
    limiter.reset();

    expect(limiter.check("user1", cfg(2, 60_000))).toBe(true);
    expect(limiter.check("user1", cfg(2, 60_000))).toBe(true);
    expect(limiter.check("user1", cfg(2, 60_000))).toBe(false);
  });

  it("resets after window expires", () => {
    const limiter = createRateLimiter("test-reset");
    limiter.reset();

    expect(limiter.check("user1", cfg(1, 10_000))).toBe(true);
    expect(limiter.check("user1", cfg(1, 10_000))).toBe(false);

    vi.advanceTimersByTime(10_001);

    expect(limiter.check("user1", cfg(1, 10_000))).toBe(true);
  });

  it("different keys are independent", () => {
    const limiter = createRateLimiter("test-independent");
    limiter.reset();

    expect(limiter.check("user1", cfg(1, 60_000))).toBe(true);
    expect(limiter.check("user1", cfg(1, 60_000))).toBe(false);
    expect(limiter.check("user2", cfg(1, 60_000))).toBe(true);
  });

  it("clears store when max size exceeded", () => {
    const limiter = createRateLimiter("test-maxsize");
    limiter.reset();

    for (let i = 0; i < 10_001; i++) {
      limiter.check(`key-${i}`, cfg(5, 60_000));
    }

    expect(limiter.check("key-0", cfg(5, 60_000))).toBe(true);
  });

  it("different named limiters are independent", () => {
    const limiterA = createRateLimiter("test-named-a");
    const limiterB = createRateLimiter("test-named-b");
    limiterA.reset();
    limiterB.reset();

    limiterA.check("shared-key", cfg(1, 60_000));
    expect(limiterA.check("shared-key", cfg(1, 60_000))).toBe(false);
    // limiterB should not be affected
    expect(limiterB.check("shared-key", cfg(2, 60_000))).toBe(true);
  });

  it("reset clears only the specific limiter", () => {
    const limiterA = createRateLimiter("test-reset-a");
    const limiterB = createRateLimiter("test-reset-b");
    limiterA.reset();
    limiterB.reset();

    limiterA.check("key1", cfg(1, 60_000));
    limiterB.check("key1", cfg(1, 60_000));

    limiterA.reset();

    expect(limiterA.check("key1", cfg(1, 60_000))).toBe(true);
    expect(limiterB.check("key1", cfg(1, 60_000))).toBe(false);
  });

  it("cleanup interval removes expired entries", () => {
    const limiter = createRateLimiter("test-cleanup");
    limiter.reset();

    limiter.check("key1", cfg(10, 60_000));
    limiter.check("key2", cfg(10, 60_000));

    // Advance past the window
    vi.advanceTimersByTime(60_001);

    // The cleanup interval fires every 60s — advance to trigger it
    vi.advanceTimersByTime(60_000);

    // Entries should be cleaned up, allowing fresh checks
    expect(limiter.check("key1", cfg(10, 60_000))).toBe(true);
    expect(limiter.check("key2", cfg(10, 60_000))).toBe(true);
  });

  it("returns true for first request to a new key", () => {
    const limiter = createRateLimiter("test-first");
    limiter.reset();

    expect(limiter.check("brand-new-key", cfg(5, 60_000))).toBe(true);
  });

  it("window is per-entry, not global", () => {
    const limiter = createRateLimiter("test-window");
    limiter.reset();

    // key1: exhaust at T=0 (window expires at T=10_000)
    expect(limiter.check("key1", cfg(2, 10_000))).toBe(true);
    expect(limiter.check("key1", cfg(2, 10_000))).toBe(true);
    expect(limiter.check("key1", cfg(2, 10_000))).toBe(false); // blocked

    // Advance 1ms, then exhaust key2 (window expires at T=10_001)
    vi.advanceTimersByTime(1);
    expect(limiter.check("key2", cfg(2, 10_000))).toBe(true);
    expect(limiter.check("key2", cfg(2, 10_000))).toBe(true);
    expect(limiter.check("key2", cfg(2, 10_000))).toBe(false); // blocked

    // Advance to T=10_001 — key1 expired, key2 still within window
    vi.advanceTimersByTime(10_000);

    // key1 expired → new entry allowed
    expect(limiter.check("key1", cfg(2, 10_000))).toBe(true);
    // key2 still within its window → still blocked
    expect(limiter.check("key2", cfg(2, 10_000))).toBe(false);
  });

  it("config override with different window per key", () => {
    const limiter = createRateLimiter("test-window-override");
    limiter.reset();

    limiter.check("short-window", cfg(1, 5_000));
    limiter.check("long-window", cfg(1, 60_000));

    // Both blocked at first
    expect(limiter.check("short-window", cfg(1, 5_000))).toBe(false);
    expect(limiter.check("long-window", cfg(1, 60_000))).toBe(false);

    // Advance past short window but not long
    vi.advanceTimersByTime(5_001);

    // Short window key is available again (new entry created)
    expect(limiter.check("short-window", cfg(1, 5_000))).toBe(true);
    // Long window key still blocked
    expect(limiter.check("long-window", cfg(1, 60_000))).toBe(false);
  });
});
