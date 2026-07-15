import { describe, it, expect, vi, beforeEach } from "vitest";
import { createSession, verifyPassword, hashPassword } from "../auth";

vi.mock("next/headers", () => ({
  cookies: vi.fn(),
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

describe("isAdmin", () => {
  it("returns false when no session", async () => {
    const mod = await import("next/headers");
    vi.mocked(mod.cookies).mockReturnValue({ get: () => undefined, set: vi.fn() } as never);

    const { isAdmin } = await import("../auth");
    expect(await isAdmin()).toBe(false);
  });

  it("returns true for admin session", async () => {
    const token = createSession({ userId: 2, type: "admin" });

    const mod = await import("next/headers");
    vi.mocked(mod.cookies).mockReturnValue({ get: () => ({ value: token }), set: vi.fn() } as never);

    const { isAdmin } = await import("../auth");
    expect(await isAdmin()).toBe(true);
  });

  it("rejects corrupted token", async () => {
    const mod = await import("next/headers");
    vi.mocked(mod.cookies).mockReturnValue({ get: () => ({ value: "not-a-valid-token" }), set: vi.fn() } as never);

    const { isAdmin } = await import("../auth");
    expect(await isAdmin()).toBe(false);
  });

  it("rejects token with tampered payload", async () => {
    const token = createSession({ userId: 2, type: "admin" });
    const decoded = Buffer.from(token, "base64url").toString();
    const lastDot = decoded.lastIndexOf(".");
    const payload = decoded.slice(0, lastDot);
    const sig = decoded.slice(lastDot + 1);
    const tampered = Buffer.from(payload + "X." + sig).toString("base64url");

    const mod = await import("next/headers");
    vi.mocked(mod.cookies).mockReturnValue({ get: () => ({ value: tampered }), set: vi.fn() } as never);

    const { isAdmin } = await import("../auth");
    expect(await isAdmin()).toBe(false);
  });
});

describe("parseSession (fast path)", () => {
  it("returns valid session without DB lookup", async () => {
    const token = createSession({ userId: 2, type: "admin" });
    const mod = await import("next/headers");
    vi.mocked(mod.cookies).mockReturnValue({ get: () => ({ value: token }), set: vi.fn() } as never);

    const { parseSession } = await import("../auth");
    const session = await parseSession();
    expect(session).not.toBeNull();
    expect(session?.type).toBe("admin");
  });

  it("returns session even for non-existent user (no DB check)", async () => {
    const token = createSession({ userId: 999, type: "admin" });
    const mod = await import("next/headers");
    vi.mocked(mod.cookies).mockReturnValue({ get: () => ({ value: token }), set: vi.fn() } as never);

    const { parseSession } = await import("../auth");
    const session = await parseSession();
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
    const hmac = crypto.createHmac("sha256", "rob-and-ana").update(expiredPayload).digest("hex");
    const expiredToken = Buffer.from(`${expiredPayload}.${hmac}`).toString("base64url");

    vi.mocked(mod.cookies).mockReturnValue({ get: () => ({ value: expiredToken }), set: vi.fn() } as never);

    const { parseSession } = await import("../auth");
    expect(await parseSession()).toBeNull();
  });
});

describe("validateSessionForMutation", () => {
  it("returns null when no session cookie", async () => {
    const mod = await import("next/headers");
    vi.mocked(mod.cookies).mockReturnValue({ get: () => undefined, set: vi.fn() } as never);

    const { validateSessionForMutation } = await import("../auth");
    expect(await validateSessionForMutation()).toBeNull();
  });

  it("returns null for invalid token", async () => {
    const mod = await import("next/headers");
    vi.mocked(mod.cookies).mockReturnValue({ get: () => ({ value: "bad-token" }), set: vi.fn() } as never);

    const { validateSessionForMutation } = await import("../auth");
    expect(await validateSessionForMutation()).toBeNull();
  });

  it("returns null when admin user no longer exists", async () => {
    const token = createSession({ userId: 999, type: "admin" });
    const mod = await import("next/headers");
    vi.mocked(mod.cookies).mockReturnValue({ get: () => ({ value: token }), set: vi.fn() } as never);

    const { validateSessionForMutation } = await import("../auth");
    expect(await validateSessionForMutation()).toBeNull();
  });

  it("returns null when user type doesn't match token", async () => {
    const token = createSession({ userId: 2, type: "party" });
    const mod = await import("next/headers");
    vi.mocked(mod.cookies).mockReturnValue({ get: () => ({ value: token }), set: vi.fn() } as never);

    const { validateSessionForMutation } = await import("../auth");
    expect(await validateSessionForMutation()).toBeNull();
  });

  it("returns null when password changed since token was issued", async () => {
    const token = createSession({ userId: 2, type: "admin", pwChangedAt: "old" });
    const mod = await import("next/headers");
    vi.mocked(mod.cookies).mockReturnValue({ get: () => ({ value: token }), set: vi.fn() } as never);

    const { validateSessionForMutation } = await import("../auth");
    expect(await validateSessionForMutation()).toBeNull();
  });

  it("returns session for valid admin", async () => {
    const token = createSession({ userId: 2, type: "admin" });
    const mod = await import("next/headers");
    vi.mocked(mod.cookies).mockReturnValue({ get: () => ({ value: token }), set: vi.fn() } as never);

    const { validateSessionForMutation } = await import("../auth");
    const session = await validateSessionForMutation();
    expect(session).not.toBeNull();
    expect(session?.type).toBe("admin");
    expect(session?.userId).toBe(2);
  });

  it("returns null for party session when party doesn't exist", async () => {
    const token = createSession({ partyId: 1, type: "party" });
    const mod = await import("next/headers");
    vi.mocked(mod.cookies).mockReturnValue({ get: () => ({ value: token }), set: vi.fn() } as never);

    const { validateSessionForMutation } = await import("../auth");
    expect(await validateSessionForMutation()).toBeNull();
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
