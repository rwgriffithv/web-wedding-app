import { describe, it, expect, vi, beforeEach } from "vitest";
import { createRateLimiter } from "@/lib/rate-limit";

beforeEach(() => {
  vi.useFakeTimers();
  return () => vi.useRealTimers();
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
});
