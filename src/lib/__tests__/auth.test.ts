import { describe, it, expect, vi } from "vitest";
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
