import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import Database from "better-sqlite3";
import { DDL } from "@/lib/schema";
import { createSession, verifyPassword, hashPassword } from "./auth";
import type { Guest } from "./db";

vi.mock("next/headers", () => ({
  cookies: vi.fn(),
}));

let testDb: Database.Database | null = null;

vi.mock("@/lib/db", () => ({
  getDb: () => testDb,
}));

describe("auth", () => {
  it("creates a signed session token from a guest", () => {
    const guest: Guest = { id: 1, username: "admin", password: "hashed", display_name: "Admin", type: "admin", created_at: "2026-01-01" };
    const token = createSession({ guestId: guest.id, type: "admin" });
    expect(token).toContain(".");
    const [payload] = token.split(".");
    const decoded = JSON.parse(payload);
    expect(decoded).toEqual({ guestId: 1, type: "admin" });
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

describe("getCurrentGuest", () => {
  beforeAll(() => {
    testDb = new Database(":memory:");
    testDb.exec(DDL);
    testDb.prepare("INSERT INTO guests (id, username, password, display_name, type) VALUES (1, 'testuser', 'hash', 'Test User', 'guest')").run();
  });

  afterAll(() => {
    testDb?.close();
    testDb = null;
  });

  it("returns null when no session cookie", async () => {
    const mod = await import("next/headers");
    vi.mocked(mod.cookies).mockReturnValue({ get: () => undefined, set: vi.fn() } as never);

    const { getCurrentGuest } = await import("./auth");
    expect(await getCurrentGuest()).toBeNull();
  });

  it("returns null for tampered session cookie", async () => {
    const mod = await import("next/headers");
    const fakeSig = "a".repeat(64);
    vi.mocked(mod.cookies).mockReturnValue({ get: () => ({ value: `{"guestId":1}.${fakeSig}` }), set: vi.fn() } as never);

    const { getCurrentGuest } = await import("./auth");
    expect(await getCurrentGuest()).toBeNull();
  });

  it("returns guest for valid session token", async () => {
    const guest: Guest = { id: 1, username: "testuser", password: "hash", display_name: "Test User", type: "guest", created_at: "2026-01-01" };
    const token = createSession({ guestId: guest.id, type: guest.type as "admin" | "guest" | "party" });

    const mod = await import("next/headers");
    vi.mocked(mod.cookies).mockReturnValue({ get: () => ({ value: token }), set: vi.fn() } as never);

    const { getCurrentGuest } = await import("./auth");
    const result = await getCurrentGuest();
    expect(result).not.toBeNull();
    expect(result!.id).toBe(1);
    expect(result!.username).toBe("testuser");
  });
});

describe("isAdmin", () => {
  it("returns false when no session", async () => {
    const mod = await import("next/headers");
    vi.mocked(mod.cookies).mockReturnValue({ get: () => undefined, set: vi.fn() } as never);

    const { isAdmin } = await import("./auth");
    expect(await isAdmin()).toBe(false);
  });

  it("returns true for admin session", async () => {
    const admin: Guest = { id: 2, username: "admin", password: "hash", display_name: "Admin", type: "admin", created_at: "2026-01-01" };
    const token = createSession({ guestId: admin.id, type: admin.type as "admin" | "guest" | "party" });

    const mod = await import("next/headers");
    vi.mocked(mod.cookies).mockReturnValue({ get: () => ({ value: token }), set: vi.fn() } as never);

    const { isAdmin } = await import("./auth");
    expect(await isAdmin()).toBe(true);
  });
});
