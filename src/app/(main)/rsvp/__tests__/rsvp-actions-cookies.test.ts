import { describe, it, expect, vi, beforeEach } from "vitest";
import { submitRsvp } from "../actions";

const { mockCheck } = vi.hoisted(() => ({
  mockCheck: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  validateSessionForMutation: vi.fn(() => Promise.resolve({ partyId: 1, type: "party" })),
}));

vi.mock("@/lib/repository/site-config", () => ({
  getConfig: vi.fn(() => ""),
}));

vi.mock("@/lib/rate-limit", () => ({
  createRateLimiter: () => ({ check: mockCheck, reset: vi.fn() }),
  getRateLimitConfig: vi.fn(() => ({ maxAttempts: 10, windowMs: 60_000 })),
}));

vi.mock("@/lib/repository/party", () => ({
  getPartyById: vi.fn(() => ({ id: 1 })),
}));

vi.mock("@/lib/repository/guests", () => ({
  getGuestById: vi.fn(() => ({ id: 1, party_id: 1, display_name: "Jane" })),
}));

vi.mock("@/lib/repository/rsvp", () => ({
  submitResponse: vi.fn(),
}));

describe("submitRsvp — rate-limit response", () => {
  beforeEach(() => {
    mockCheck.mockReset();
  });

  it("returns cooldownUntil when rate limited", async () => {
    mockCheck.mockReturnValue(false);

    const formData = new FormData();
    formData.set("member_id", "1");
    formData.set("attending_1", "yes");

    const result = await submitRsvp(null, formData);

    expect(result.error).toMatch(/too many submissions/i);
    expect(result.action).toBe("cooldown");
    expect(result.cooldownUntil).toBeTypeOf("number");
    expect(result.cooldownUntil).toBeGreaterThan(Date.now());
    expect(result.cooldownUntil).toBeLessThanOrEqual(Date.now() + 60_000);
  });

  it("does NOT return cooldownUntil when not rate limited", async () => {
    mockCheck.mockReturnValue(true);

    const formData = new FormData();
    formData.set("member_id", "1");
    formData.set("attending_1", "yes");

    const result = await submitRsvp(null, formData);

    expect(result.cooldownUntil).toBeUndefined();
  });
});
