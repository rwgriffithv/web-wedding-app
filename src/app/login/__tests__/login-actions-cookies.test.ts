import { describe, it, expect, vi, beforeEach } from "vitest";
import { login, loginByPartyCode } from "../actions";

const { mockCheck, mockIsIpBanned } = vi.hoisted(() => ({
  mockCheck: vi.fn(),
  mockIsIpBanned: vi.fn(() => false),
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
}));

vi.mock("@/lib/ip", () => ({
  getClientIp: vi.fn(() => Promise.resolve("10.0.0.99")),
}));

vi.mock("@/lib/repository/site-config", () => ({
  getConfig: vi.fn((key: string) => {
    const cfg: Record<string, string> = {
      rate_limit_max_attempts: "2",
      rate_limit_window_seconds: "60",
      auto_ban_login_threshold: "5",
      auto_ban_window_seconds: "3600",
      session_max_hours: "24",
    };
    return cfg[key] ?? "";
  }),
}));

vi.mock("@/lib/rate-limit", () => ({
  createRateLimiter: () => ({ check: mockCheck, reset: vi.fn() }),
  getRateLimitConfig: vi.fn(() => ({ maxAttempts: 2, windowMs: 60_000 })),
}));

vi.mock("@/lib/repository/ip-bans", () => ({
  isIpBanned: () => mockIsIpBanned(),
  recordRateLimitViolation: vi.fn(),
  getViolationCount: vi.fn(() => 0),
  banIp: vi.fn(),
  deleteOldViolations: vi.fn(),
  getAutoBanConfig: vi.fn(() => ({ threshold: 5, windowSeconds: 3600 })),
}));

vi.mock("@/lib/repository/users", () => ({
  getUserWithPassword: vi.fn(() => null),
  getPartyUserWithPassword: vi.fn(() => null),
  recordLogin: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  createSession: vi.fn(() => "mock-session"),
  verifyPassword: vi.fn(() => false),
  SESSION_COOKIE: "session",
}));

vi.mock("@/lib/repository/party", () => ({
  getPartyByCode: vi.fn(() => null),
}));

vi.mock("@/lib/repository/guests", () => ({
  getGuestsByPartyId: vi.fn(() => []),
}));

describe("login actions — rate-limit response", () => {
  beforeEach(() => {
    mockCheck.mockReset();
    mockIsIpBanned.mockReset();
    mockIsIpBanned.mockReturnValue(false);
  });

  it("login returns cooldownUntil when rate limited", async () => {
    mockCheck.mockReturnValue(false);

    const formData = new FormData();
    formData.set("username", "admin");
    formData.set("password", "wrong");

    const result = await login(formData);

    expect(result.error).toMatch(/too many attempts/i);
    expect(result.action).toBe("cooldown");
    expect(result.cooldownUntil).toBeTypeOf("number");
    expect(result.cooldownUntil).toBeGreaterThan(Date.now());
    expect(result.cooldownUntil).toBeLessThanOrEqual(Date.now() + 60_000);
  });

  it("login does NOT return cooldownUntil when not rate limited", async () => {
    mockCheck.mockReturnValue(true);

    const formData = new FormData();
    formData.set("username", "admin");
    formData.set("password", "wrong");

    const result = await login(formData);

    expect(result.cooldownUntil).toBeUndefined();
  });

  it("loginByPartyCode returns cooldownUntil when rate limited", async () => {
    mockCheck.mockReturnValue(false);

    const formData = new FormData();
    formData.set("code", "SMITH-1234");

    const result = await loginByPartyCode(formData);

    expect(result.error).toMatch(/too many attempts/i);
    expect(result.action).toBe("cooldown");
    expect(result.cooldownUntil).toBeTypeOf("number");
    expect(result.cooldownUntil).toBeGreaterThan(Date.now());
    expect(result.cooldownUntil).toBeLessThanOrEqual(Date.now() + 60_000);
  });

  it("login returns banned error when auto-ban triggers on rate limit", async () => {
    mockCheck.mockReturnValue(false);
    mockIsIpBanned.mockReturnValueOnce(false).mockReturnValueOnce(true);

    const formData = new FormData();
    formData.set("username", "admin");
    formData.set("password", "wrong");

    const result = await login(formData);

    expect(result.error).toMatch(/banned/i);
    expect(result.action).toBe("refresh");
    expect(result.cooldownUntil).toBeUndefined();
  });

  it("loginByPartyCode returns banned error when auto-ban triggers on rate limit", async () => {
    mockCheck.mockReturnValue(false);
    mockIsIpBanned.mockReturnValueOnce(false).mockReturnValueOnce(true);

    const formData = new FormData();
    formData.set("code", "SMITH-1234");

    const result = await loginByPartyCode(formData);

    expect(result.error).toMatch(/banned/i);
    expect(result.action).toBe("refresh");
    expect(result.cooldownUntil).toBeUndefined();
  });
});
