import { describe, it, expect, vi, beforeEach } from "vitest";
import { submitQuestion } from "../actions";

const { mockCheck } = vi.hoisted(() => ({
  mockCheck: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  parseSession: vi.fn(() => Promise.resolve({ partyId: 1, type: "party" })),
}));

vi.mock("@/lib/repository/site-config", () => ({
  getConfig: vi.fn(() => ""),
}));

vi.mock("@/lib/rate-limit", () => ({
  createRateLimiter: () => ({ check: mockCheck, reset: vi.fn() }),
  getRateLimitConfig: vi.fn(() => ({ maxAttempts: 5, windowMs: 60_000 })),
}));

vi.mock("@/lib/repository/questions", () => ({
  create: vi.fn(),
}));

describe("submitQuestion — rate-limit response", () => {
  beforeEach(() => {
    mockCheck.mockReset();
  });

  it("returns cooldownUntil when rate limited", async () => {
    mockCheck.mockReturnValue(false);

    const formData = new FormData();
    formData.set("question", "What time is the ceremony?");

    const result = await submitQuestion(null, formData);

    expect(result.error).toMatch(/too many requests/i);
    expect(result.action).toBe("cooldown");
    expect(result.cooldownUntil).toBeTypeOf("number");
    expect(result.cooldownUntil).toBeGreaterThan(Date.now());
    expect(result.cooldownUntil).toBeLessThanOrEqual(Date.now() + 60_000);
  });

  it("does NOT return cooldownUntil when not rate limited", async () => {
    mockCheck.mockReturnValue(true);

    const formData = new FormData();
    formData.set("question", "What time is the ceremony?");

    const result = await submitQuestion(null, formData);

    expect(result.cooldownUntil).toBeUndefined();
  });
});
