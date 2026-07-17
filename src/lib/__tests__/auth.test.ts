import crypto from "crypto";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createSession, verifyPassword, hashPassword } from "../auth";
import {
  revokeSessionsByPasswordChange,
  clearPasswordRevocation,
  revokeSessionsByIpBan,
  unrevokeSessionsByIpBan,
} from "../session-revocation";

const mockHeaders = vi.fn();
const mockRedirect = vi.fn();

vi.mock("next/headers", () => ({
  cookies: vi.fn(),
  headers: (...args: unknown[]) => mockHeaders(...args),
}));

vi.mock("next/navigation", () => ({
  redirect: (...args: unknown[]) => {
    mockRedirect(...args);
    throw new Error("NEXT_REDIRECT");
  },
}));

vi.mock("../repository/users", () => ({
  getUserById: vi.fn().mockImplementation((id: number) => {
    if (id === 2) return { id: 2, username: "admin", type: "admin", display_name: "Admin", party_id: null, created_at: "", last_login_at: null, total_page_views: 0, password_changed_at: null, last_page_view_at: null };
    return undefined;
  }),
  getUserWithPassword: vi.fn(),
  getPartyUserWithPassword: vi.fn(),
  recordLogin: vi.fn(),
  incrementPageViews: vi.fn(),
}));

vi.mock("../repository/party", () => ({
  getPartyById: vi.fn(),
  getPartyByCode: vi.fn(),
}));

const mockGetConfig = vi.fn();

vi.mock("../repository/site-config", () => ({
  getConfig: (...args: unknown[]) => mockGetConfig(...args),
}));

describe("auth", () => {
  it("creates a signed session token from a user", () => {
    const token = createSession({ userId: 1, type: "admin" });
    const decoded = Buffer.from(token, "base64url").toString();
    expect(decoded).toContain(".");
    const [payload] = decoded.split(".");
    const parsed = JSON.parse(payload);
    expect(parsed).toEqual({ userId: 1, type: "admin" });
  });

  it("token contains no raw JSON characters", () => {
    const token = createSession({ userId: 1, type: "admin" });
    expect(token).not.toMatch(/[{}":,]/);
  });

  it("hashes and verifies passwords", () => {
    const hash = hashPassword("my-password");
    expect(hash).toContain(":");
    expect(verifyPassword("my-password", hash)).toBe(true);
    expect(verifyPassword("wrong-password", hash)).toBe(false);
  });

  it("rejects invalid password format", () => {
    expect(verifyPassword("any", "invalid-format")).toBe(false);
  });

  it("rejects empty password against hash", () => {
    const hash = hashPassword("secret");
    expect(verifyPassword("", hash)).toBe(false);
  });
});

describe("verifyTokenInCookie (fast path)", () => {
  it("returns valid session without DB lookup", async () => {
    const token = createSession({ userId: 2, type: "admin" });
    const mod = await import("next/headers");
    vi.mocked(mod.cookies).mockReturnValue({ get: () => ({ value: token }), set: vi.fn() } as never);

    const { verifyTokenInCookie } = await import("../auth");
    const session = await verifyTokenInCookie();
    expect(session).not.toBeNull();
    expect(session?.type).toBe("admin");
  });

  it("returns session even for non-existent user (no DB check)", async () => {
    const token = createSession({ userId: 999, type: "admin" });
    const mod = await import("next/headers");
    vi.mocked(mod.cookies).mockReturnValue({ get: () => ({ value: token }), set: vi.fn() } as never);

    const { verifyTokenInCookie } = await import("../auth");
    const session = await verifyTokenInCookie();
    expect(session).not.toBeNull();
    expect(session?.userId).toBe(999);
  });

  it("returns null for expired token", async () => {
    const mod = await import("next/headers");
    const token = createSession({ userId: 2, type: "admin" });
    const decoded = Buffer.from(token, "base64url").toString();
    const lastDot = decoded.lastIndexOf(".");
    const payloadObj = JSON.parse(decoded.slice(0, lastDot));
    payloadObj.exp = Date.now() - 10_000;
    const expiredPayload = JSON.stringify(payloadObj);
    const crypto = await import("crypto");
    // Secret must match vitest.config.ts SESSION_SECRET ("test-secret-key-not-for-production-ok")
    const hmac = crypto.createHmac("sha256", "test-secret-key-not-for-production-ok").update(expiredPayload).digest("hex");
    const expiredToken = Buffer.from(`${expiredPayload}.${hmac}`).toString("base64url");

    vi.mocked(mod.cookies).mockReturnValue({ get: () => ({ value: expiredToken }), set: vi.fn() } as never);

    const { verifyTokenInCookie } = await import("../auth");
    expect(await verifyTokenInCookie()).toBeNull();
  });
});

describe("validateSessionInDb", () => {
  it("returns null when no session cookie", async () => {
    const mod = await import("next/headers");
    vi.mocked(mod.cookies).mockReturnValue({ get: () => undefined, set: vi.fn() } as never);

    const { validateSessionInDb } = await import("../auth");
    expect(await validateSessionInDb()).toBeNull();
  });

  it("returns null for invalid token", async () => {
    const mod = await import("next/headers");
    vi.mocked(mod.cookies).mockReturnValue({ get: () => ({ value: "bad-token" }), set: vi.fn() } as never);

    const { validateSessionInDb } = await import("../auth");
    expect(await validateSessionInDb()).toBeNull();
  });

  it("returns null when admin user no longer exists", async () => {
    const token = createSession({ userId: 999, type: "admin" });
    const mod = await import("next/headers");
    vi.mocked(mod.cookies).mockReturnValue({ get: () => ({ value: token }), set: vi.fn() } as never);

    const { validateSessionInDb } = await import("../auth");
    expect(await validateSessionInDb()).toBeNull();
  });

  it("returns null when user type doesn't match token", async () => {
    const token = createSession({ userId: 2, type: "party" });
    const mod = await import("next/headers");
    vi.mocked(mod.cookies).mockReturnValue({ get: () => ({ value: token }), set: vi.fn() } as never);

    const { validateSessionInDb } = await import("../auth");
    expect(await validateSessionInDb()).toBeNull();
  });

  it("returns null when password changed since token was issued", async () => {
    const token = createSession({ userId: 2, type: "admin", pwChangedAt: "old" });
    const mod = await import("next/headers");
    vi.mocked(mod.cookies).mockReturnValue({ get: () => ({ value: token }), set: vi.fn() } as never);

    const { validateSessionInDb } = await import("../auth");
    expect(await validateSessionInDb()).toBeNull();
  });

  it("returns session for valid admin", async () => {
    const token = createSession({ userId: 2, type: "admin" });
    const mod = await import("next/headers");
    vi.mocked(mod.cookies).mockReturnValue({ get: () => ({ value: token }), set: vi.fn() } as never);
    mockHeaders.mockReturnValue({ get: () => null });

    const { validateSessionInDb } = await import("../auth");
    const session = await validateSessionInDb();
    expect(session).not.toBeNull();
    expect(session?.type).toBe("admin");
    expect(session?.userId).toBe(2);
  });

  it("returns null for party session when party doesn't exist", async () => {
    const token = createSession({ partyId: 1, type: "party" });
    const mod = await import("next/headers");
    vi.mocked(mod.cookies).mockReturnValue({ get: () => ({ value: token }), set: vi.fn() } as never);

    const { validateSessionInDb } = await import("../auth");
    expect(await validateSessionInDb()).toBeNull();
  });
});

describe("getSessionMaxSeconds", () => {
  beforeEach(() => {
    mockGetConfig.mockReset();
  });

  it("returns 24h in seconds for default config", async () => {
    mockGetConfig.mockReturnValue("24");
    const { getSessionMaxSeconds } = await import("../auth");
    expect(getSessionMaxSeconds()).toBe(24 * 60 * 60);
  });

  it("returns configured value in seconds", async () => {
    mockGetConfig.mockReturnValue("8");
    const { getSessionMaxSeconds } = await import("../auth");
    expect(getSessionMaxSeconds()).toBe(8 * 60 * 60);
  });

  it("clamps values above 24 to 24h", async () => {
    mockGetConfig.mockReturnValue("48");
    const { getSessionMaxSeconds } = await import("../auth");
    expect(getSessionMaxSeconds()).toBe(24 * 60 * 60);
  });

  it("clamps 0 to 24h default", async () => {
    mockGetConfig.mockReturnValue("0");
    const { getSessionMaxSeconds } = await import("../auth");
    expect(getSessionMaxSeconds()).toBe(24 * 60 * 60);
  });

  it("falls back to 24h for empty string", async () => {
    mockGetConfig.mockReturnValue("");
    const { getSessionMaxSeconds } = await import("../auth");
    expect(getSessionMaxSeconds()).toBe(24 * 60 * 60);
  });

  it("falls back to 24h for NaN", async () => {
    mockGetConfig.mockReturnValue("abc");
    const { getSessionMaxSeconds } = await import("../auth");
    expect(getSessionMaxSeconds()).toBe(24 * 60 * 60);
  });

  it("falls back to 24h for negative values", async () => {
    mockGetConfig.mockReturnValue("-5");
    const { getSessionMaxSeconds } = await import("../auth");
    expect(getSessionMaxSeconds()).toBe(24 * 60 * 60);
  });

  it("accepts minimum value of 1", async () => {
    mockGetConfig.mockReturnValue("1");
    const { getSessionMaxSeconds } = await import("../auth");
    expect(getSessionMaxSeconds()).toBe(1 * 60 * 60);
  });

  it("handles decimal hours like 0.5", async () => {
    mockGetConfig.mockReturnValue("0.5");
    const { getSessionMaxSeconds } = await import("../auth");
    expect(getSessionMaxSeconds()).toBe(0.5 * 60 * 60);
  });

  it("handles decimal hours like 1.5", async () => {
    mockGetConfig.mockReturnValue("1.5");
    const { getSessionMaxSeconds } = await import("../auth");
    expect(getSessionMaxSeconds()).toBe(1.5 * 60 * 60);
  });

  it("clamps decimal above 24 to 24h", async () => {
    mockGetConfig.mockReturnValue("25.5");
    const { getSessionMaxSeconds } = await import("../auth");
    expect(getSessionMaxSeconds()).toBe(24 * 60 * 60);
  });

  it("clamps sub-second values to minimum 1 second", async () => {
    mockGetConfig.mockReturnValue("0.0001");
    const { getSessionMaxSeconds } = await import("../auth");
    expect(getSessionMaxSeconds()).toBe(1);
  });
});

describe("requireAdminSessionOrNull (revocation)", () => {
  beforeEach(() => {
    clearPasswordRevocation(2);
    unrevokeSessionsByIpBan("10.0.0.9");
  });

  it("returns null when IP is banned", async () => {
    revokeSessionsByIpBan("10.0.0.9");
    mockHeaders.mockReturnValue({ get: (h: string) => h === "cf-connecting-ip" ? "10.0.0.9" : undefined });

    const token = createSession({ userId: 2, type: "admin" });
    const mod = await import("next/headers");
    vi.mocked(mod.cookies).mockReturnValue({ get: () => ({ value: token }), set: vi.fn() } as never);

    const { requireAdminSessionOrNull } = await import("../auth");
    expect(await requireAdminSessionOrNull()).toBeNull();
  });

  it("returns null when password changed after session", async () => {
    revokeSessionsByPasswordChange(2);
    mockHeaders.mockReturnValue({ get: () => undefined });

    const token = createSession({ userId: 2, type: "admin" });
    const mod = await import("next/headers");
    vi.mocked(mod.cookies).mockReturnValue({ get: () => ({ value: token }), set: vi.fn() } as never);

    const { requireAdminSessionOrNull } = await import("../auth");
    expect(await requireAdminSessionOrNull()).toBeNull();
  });
});

describe("requireSession", () => {
  beforeEach(() => {
    mockHeaders.mockReturnValue({ get: () => undefined });
  });

  it("returns null when no cookie", async () => {
    const mod = await import("next/headers");
    vi.mocked(mod.cookies).mockReturnValue({ get: () => undefined, set: vi.fn() } as never);

    const { requireSession } = await import("../auth");
    expect(await requireSession()).toBeNull();
  });

  it("returns session for valid party token", async () => {
    const token = createSession({ partyId: 1, type: "party" });
    const mod = await import("next/headers");
    vi.mocked(mod.cookies).mockReturnValue({ get: () => ({ value: token }), set: vi.fn() } as never);

    const { requireSession } = await import("../auth");
    const session = await requireSession();
    expect(session).not.toBeNull();
    expect(session?.type).toBe("party");
  });

  it("returns null when session is revoked by IP ban", async () => {
    revokeSessionsByIpBan("10.0.0.5");
    mockHeaders.mockReturnValue({ get: (h: string) => h === "x-real-ip" ? "10.0.0.5" : undefined });

    const token = createSession({ userId: 2, type: "admin" });
    const mod = await import("next/headers");
    vi.mocked(mod.cookies).mockReturnValue({ get: () => ({ value: token }), set: vi.fn() } as never);

    const { requireSession } = await import("../auth");
    expect(await requireSession()).toBeNull();
    unrevokeSessionsByIpBan("10.0.0.5");
  });
});

describe("verifyToken", () => {
  const SECRET = "test-secret-key-not-for-production-ok";

  it("returns null for empty string", async () => {
    const { verifyToken } = await import("../auth");
    expect(verifyToken("")).toBeNull();
  });

  it("returns null for malformed base64", async () => {
    const { verifyToken } = await import("../auth");
    expect(verifyToken("not-valid-base64!!")).toBeNull();
  });

  it("returns null for token missing dot separator", async () => {
    const payload = JSON.stringify({ userId: 1, type: "admin" });
    const token = Buffer.from(payload).toString("base64url");
    const { verifyToken } = await import("../auth");
    expect(verifyToken(token)).toBeNull();
  });

  it("returns null for tampered HMAC", async () => {
    const payload = JSON.stringify({ userId: 1, type: "admin" });
    const hmac = crypto.createHmac("sha256", SECRET).update(payload).digest("hex");
    const tampered = hmac.slice(0, 2) + "ff" + hmac.slice(4);
    const token = Buffer.from(`${payload}.${tampered}`).toString("base64url");
    const { verifyToken } = await import("../auth");
    expect(verifyToken(token)).toBeNull();
  });

  it("returns null for expired token", async () => {
    const payload = JSON.stringify({ userId: 1, type: "admin", exp: Date.now() - 10_000 });
    const hmac = crypto.createHmac("sha256", SECRET).update(payload).digest("hex");
    const token = Buffer.from(`${payload}.${hmac}`).toString("base64url");
    const { verifyToken } = await import("../auth");
    expect(verifyToken(token)).toBeNull();
  });

  it("returns valid session for a properly signed, non-expired token", async () => {
    const token = createSession({ userId: 1, type: "admin" });
    const { verifyToken } = await import("../auth");
    const session = verifyToken(token);
    expect(session).not.toBeNull();
    expect(session?.userId).toBe(1);
    expect(session?.type).toBe("admin");
  });

  it("returns session with correct userId, type, partyId fields", async () => {
    const token = createSession({ userId: 5, type: "party", partyId: 3 });
    const { verifyToken } = await import("../auth");
    const session = verifyToken(token);
    expect(session).not.toBeNull();
    expect(session?.userId).toBe(5);
    expect(session?.type).toBe("party");
    expect(session?.partyId).toBe(3);
  });
});

describe("requireSessionOrRedirect", () => {
  beforeEach(() => {
    mockRedirect.mockReset();
    mockHeaders.mockReturnValue({ get: () => undefined });
    clearPasswordRevocation(2);
  });

  it("redirects to /login when no session", async () => {
    const mod = await import("next/headers");
    vi.mocked(mod.cookies).mockReturnValue({ get: () => undefined, set: vi.fn() } as never);

    const { requireSessionOrRedirect } = await import("../auth");
    await expect(requireSessionOrRedirect()).rejects.toThrow("NEXT_REDIRECT");
    expect(mockRedirect).toHaveBeenCalledWith("/login");
  });

  it("redirects to /login when session is revoked", async () => {
    revokeSessionsByIpBan("10.0.0.5");
    mockHeaders.mockReturnValue({ get: (h: string) => h === "cf-connecting-ip" ? "10.0.0.5" : undefined });

    const token = createSession({ userId: 2, type: "admin" });
    const mod = await import("next/headers");
    vi.mocked(mod.cookies).mockReturnValue({ get: () => ({ value: token }), set: vi.fn() } as never);

    const { requireSessionOrRedirect } = await import("../auth");
    await expect(requireSessionOrRedirect()).rejects.toThrow("NEXT_REDIRECT");
    expect(mockRedirect).toHaveBeenCalledWith("/login");
    unrevokeSessionsByIpBan("10.0.0.5");
  });

  it("redirects to /home when session type doesn't match", async () => {
    const token = createSession({ userId: 2, type: "admin" });
    const mod = await import("next/headers");
    vi.mocked(mod.cookies).mockReturnValue({ get: () => ({ value: token }), set: vi.fn() } as never);

    const { requireSessionOrRedirect } = await import("../auth");
    await expect(requireSessionOrRedirect({ type: "party" })).rejects.toThrow("NEXT_REDIRECT");
    expect(mockRedirect).toHaveBeenCalledWith("/home");
  });

  it("returns session when valid and type matches", async () => {
    const token = createSession({ userId: 2, type: "admin" });
    const mod = await import("next/headers");
    vi.mocked(mod.cookies).mockReturnValue({ get: () => ({ value: token }), set: vi.fn() } as never);

    const { requireSessionOrRedirect } = await import("../auth");
    const session = await requireSessionOrRedirect({ type: "admin" });
    expect(session).not.toBeNull();
    expect(session.type).toBe("admin");
    expect(session.userId).toBe(2);
    expect(mockRedirect).not.toHaveBeenCalled();
  });

  it("returns session when valid and no type constraint", async () => {
    const token = createSession({ userId: 2, type: "admin" });
    const mod = await import("next/headers");
    vi.mocked(mod.cookies).mockReturnValue({ get: () => ({ value: token }), set: vi.fn() } as never);

    const { requireSessionOrRedirect } = await import("../auth");
    const session = await requireSessionOrRedirect();
    expect(session).not.toBeNull();
    expect(session.type).toBe("admin");
    expect(mockRedirect).not.toHaveBeenCalled();
  });
});
