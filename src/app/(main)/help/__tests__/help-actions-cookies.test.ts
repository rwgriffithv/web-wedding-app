import { describe, it, expect, vi, beforeEach } from "vitest";
import { submitQuestion } from "../actions";

const { mockCheck } = vi.hoisted(() => ({
  mockCheck: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  validateSessionInDb: vi.fn(() => Promise.resolve({ partyId: 1, type: "party" })),
  destroySession: vi.fn(),
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

describe("submitQuestion — session validation", () => {
  it("redirects to /login when session is null", async () => {
    const { validateSessionInDb } = await import("@/lib/auth");
    vi.mocked(validateSessionInDb).mockResolvedValueOnce(null);

    const result = await submitQuestion(null, new FormData());

    expect(result.action).toBe("redirect");
    expect(result.href).toBe("/login");
    expect(result.success).toBe(false);
  });

  it("redirects to /login when session has no partyId", async () => {
    const { validateSessionInDb } = await import("@/lib/auth");
    vi.mocked(validateSessionInDb).mockResolvedValueOnce({ partyId: undefined, type: "party" });

    const result = await submitQuestion(null, new FormData());

    expect(result.action).toBe("redirect");
    expect(result.href).toBe("/login");
    expect(result.success).toBe(false);
  });
});

describe("submitQuestion — form validation", () => {
  beforeEach(() => {
    mockCheck.mockReturnValue(true);
  });

  it("returns error when question is empty", async () => {
    const formData = new FormData();
    formData.set("question", "");

    const result = await submitQuestion(null, formData);

    expect(result.success).toBe(false);
    expect(result.error).toBe("Question is required.");
  });

  it("returns error when question is only whitespace", async () => {
    const formData = new FormData();
    formData.set("question", "   ");

    const result = await submitQuestion(null, formData);

    expect(result.success).toBe(false);
    expect(result.error).toBe("Question is required.");
  });
});

describe("submitQuestion — successful submission", () => {
  it("returns success on valid question", async () => {
    mockCheck.mockReturnValue(true);

    const formData = new FormData();
    formData.set("question", "What time is the ceremony?");

    const result = await submitQuestion(null, formData);

    expect(result.success).toBe(true);
    expect(result.error).toBeUndefined();
  });
});

describe("submitQuestion — error handling", () => {
  it("returns error when create throws", async () => {
    const { create } = await import("@/lib/repository/questions");
    vi.mocked(create).mockImplementationOnce(() => { throw new Error("db failure"); });
    mockCheck.mockReturnValue(true);

    const formData = new FormData();
    formData.set("question", "What time is the ceremony?");

    const result = await submitQuestion(null, formData);

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/Failed to submit question/i);
  });
});

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
