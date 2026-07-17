import { describe, it, expect, vi, beforeEach } from "vitest";
import { submitRsvp } from "../actions";

const { mockCheck } = vi.hoisted(() => ({
  mockCheck: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  validateSessionInDb: vi.fn(() => Promise.resolve({ partyId: 1, type: "party" })),
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

describe("submitRsvp — session validation", () => {
  it("redirects to /login when session is null", async () => {
    const { validateSessionInDb } = await import("@/lib/auth");
    vi.mocked(validateSessionInDb).mockResolvedValueOnce(null);

    const result = await submitRsvp(null, new FormData());

    expect(result.action).toBe("redirect");
    expect(result.href).toBe("/login");
    expect(result.success).toBe(false);
  });

  it("returns error when session is admin type", async () => {
    const { validateSessionInDb } = await import("@/lib/auth");
    vi.mocked(validateSessionInDb).mockResolvedValueOnce({ partyId: null, type: "admin" });

    const result = await submitRsvp(null, new FormData());

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/not available for user logins/i);
  });

  it("returns error when session is viewer type", async () => {
    const { validateSessionInDb } = await import("@/lib/auth");
    vi.mocked(validateSessionInDb).mockResolvedValueOnce({ partyId: null, type: "viewer" });

    const result = await submitRsvp(null, new FormData());

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/not available for user logins/i);
  });
});

describe("submitRsvp — form validation", () => {
  it("returns error when member_id is missing", async () => {
    const formData = new FormData();
    formData.set("attending_1", "yes");

    const result = await submitRsvp(null, formData);

    expect(result.success).toBe(false);
    expect(result.error).toBe("Invalid member.");
  });

  it("returns error when member_id is not a number", async () => {
    const formData = new FormData();
    formData.set("member_id", "abc");
    formData.set("attending_abc", "yes");

    const result = await submitRsvp(null, formData);

    expect(result.success).toBe(false);
    expect(result.error).toBe("Invalid member.");
  });

  it("returns error when attending value is missing", async () => {
    const formData = new FormData();
    formData.set("member_id", "1");

    const result = await submitRsvp(null, formData);

    expect(result.success).toBe(false);
    expect(result.error).toBe("Attendance is required.");
  });

  it("returns error when attending value is invalid", async () => {
    const formData = new FormData();
    formData.set("member_id", "1");
    formData.set("attending_1", "maybe");

    const result = await submitRsvp(null, formData);

    expect(result.success).toBe(false);
    expect(result.error).toBe("Invalid attendance value.");
  });
});

describe("submitRsvp — party membership", () => {
  it("returns error when guest belongs to another party", async () => {
    const { getGuestById } = await import("@/lib/repository/guests");
    vi.mocked(getGuestById).mockReturnValueOnce({ id: 1, party_id: 99, display_name: "Other" });
    mockCheck.mockReturnValue(true);

    const formData = new FormData();
    formData.set("member_id", "1");
    formData.set("attending_1", "yes");

    const result = await submitRsvp(null, formData);

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/only RSVP for members of your party/i);
  });
});

describe("submitRsvp — successful submission", () => {
  it("returns success on valid RSVP", async () => {
    mockCheck.mockReturnValue(true);

    const formData = new FormData();
    formData.set("member_id", "1");
    formData.set("attending_1", "yes");

    const result = await submitRsvp(null, formData);

    expect(result.success).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it("returns success when declining attendance", async () => {
    mockCheck.mockReturnValue(true);

    const formData = new FormData();
    formData.set("member_id", "1");
    formData.set("attending_1", "no");

    const result = await submitRsvp(null, formData);

    expect(result.success).toBe(true);
  });
});

describe("submitRsvp — error handling", () => {
  it("returns error when submitResponse throws", async () => {
    const { submitResponse } = await import("@/lib/repository/rsvp");
    vi.mocked(submitResponse).mockImplementationOnce(() => { throw new Error("db failure"); });
    mockCheck.mockReturnValue(true);

    const formData = new FormData();
    formData.set("member_id", "1");
    formData.set("attending_1", "yes");

    const result = await submitRsvp(null, formData);

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/Failed to submit RSVP/i);
  });
});

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
