import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock getConfig to control session timeout for cleanup tests
const mockGetConfig = vi.fn().mockReturnValue("24");
vi.mock("@/lib/repository/site-config", () => ({
  getConfig: (...args: unknown[]) => mockGetConfig(...args),
}));

beforeEach(() => {
  vi.clearAllMocks();
  mockGetConfig.mockReturnValue("24");
});

describe("session revocation", () => {
  describe("password change revocation", () => {
    it("marks session as revoked after password change", async () => {
      const { revokeSessionsByPasswordChange, isSessionRevokedByPasswordChange } = await import("@/lib/session-revocation");
      revokeSessionsByPasswordChange(1);
      expect(isSessionRevokedByPasswordChange(1, null)).toBe(true);
    });

    it("does not revoke unrelated users", async () => {
      const { revokeSessionsByPasswordChange, isSessionRevokedByPasswordChange } = await import("@/lib/session-revocation");
      revokeSessionsByPasswordChange(1);
      expect(isSessionRevokedByPasswordChange(2, null)).toBe(false);
    });

    it("revocation timestamp newer than session pwChangedAt means revoked", async () => {
      const { revokeSessionsByPasswordChange, isSessionRevokedByPasswordChange } = await import("@/lib/session-revocation");
      // Session was issued before the password change
      revokeSessionsByPasswordChange(1);
      expect(isSessionRevokedByPasswordChange(1, "2020-01-01T00:00:00Z")).toBe(true);
    });

    it("revocation timestamp older than session pwChangedAt means NOT revoked", async () => {
      const { revokeSessionsByPasswordChange, isSessionRevokedByPasswordChange } = await import("@/lib/session-revocation");
      // Session was issued after the password change
      const futureDate = new Date(Date.now() + 100_000).toISOString();
      revokeSessionsByPasswordChange(1);
      expect(isSessionRevokedByPasswordChange(1, futureDate)).toBe(false);
    });

    it("clearPasswordRevocation removes the revocation", async () => {
      const { revokeSessionsByPasswordChange, clearPasswordRevocation, isSessionRevokedByPasswordChange } = await import("@/lib/session-revocation");
      revokeSessionsByPasswordChange(1);
      expect(isSessionRevokedByPasswordChange(1, null)).toBe(true);
      clearPasswordRevocation(1);
      expect(isSessionRevokedByPasswordChange(1, null)).toBe(false);
    });

    it("returns false for unknown user", async () => {
      const { isSessionRevokedByPasswordChange } = await import("@/lib/session-revocation");
      expect(isSessionRevokedByPasswordChange(999, null)).toBe(false);
    });
  });

  describe("IP ban revocation", () => {
    it("marks IP as banned", async () => {
      const { revokeSessionsByIpBan, unrevokeSessionsByIpBan, isSessionRevokedByIpBan } = await import("@/lib/session-revocation");
      unrevokeSessionsByIpBan("20.0.0.1"); // ensure clean
      revokeSessionsByIpBan("20.0.0.1");
      expect(isSessionRevokedByIpBan("20.0.0.1")).toBe(true);
      unrevokeSessionsByIpBan("20.0.0.1"); // cleanup
    });

    it("does not flag unrelated IPs", async () => {
      const { revokeSessionsByIpBan, unrevokeSessionsByIpBan, isSessionRevokedByIpBan } = await import("@/lib/session-revocation");
      revokeSessionsByIpBan("20.0.0.2");
      expect(isSessionRevokedByIpBan("20.0.0.3")).toBe(false);
      unrevokeSessionsByIpBan("20.0.0.2"); // cleanup
    });

    it("unrevokeSessionsByIpBan removes the ban", async () => {
      const { revokeSessionsByIpBan, unrevokeSessionsByIpBan, isSessionRevokedByIpBan } = await import("@/lib/session-revocation");
      revokeSessionsByIpBan("20.0.0.4");
      expect(isSessionRevokedByIpBan("20.0.0.4")).toBe(true);
      unrevokeSessionsByIpBan("20.0.0.4");
      expect(isSessionRevokedByIpBan("20.0.0.4")).toBe(false);
    });
  });

  describe("isSessionRevoked (combined check)", () => {
    it("returns true when password is revoked", async () => {
      const { revokeSessionsByPasswordChange, isSessionRevoked } = await import("@/lib/session-revocation");
      revokeSessionsByPasswordChange(500);
      expect(isSessionRevoked({ userId: 500, pwChangedAt: null }, "10.0.0.1")).toBe(true);
      const { clearPasswordRevocation } = await import("@/lib/session-revocation");
      clearPasswordRevocation(500);
    });

    it("returns true when IP is banned", async () => {
      const { revokeSessionsByIpBan, isSessionRevoked } = await import("@/lib/session-revocation");
      revokeSessionsByIpBan("10.0.0.2");
      expect(isSessionRevoked({ userId: 501, pwChangedAt: null }, "10.0.0.2")).toBe(true);
      const { unrevokeSessionsByIpBan } = await import("@/lib/session-revocation");
      unrevokeSessionsByIpBan("10.0.0.2");
    });

    it("returns false when neither is revoked", async () => {
      const { isSessionRevoked, clearPasswordRevocation, unrevokeSessionsByIpBan } = await import("@/lib/session-revocation");
      // Explicitly ensure clean state — module-level Maps/Sets persist across tests
      clearPasswordRevocation(502);
      unrevokeSessionsByIpBan("10.0.0.3");
      expect(isSessionRevoked({ userId: 502, pwChangedAt: null }, "10.0.0.3")).toBe(false);
    });

    it("returns false when userId is undefined", async () => {
      const { isSessionRevoked, unrevokeSessionsByIpBan } = await import("@/lib/session-revocation");
      unrevokeSessionsByIpBan("10.0.0.4");
      expect(isSessionRevoked({ pwChangedAt: null }, "10.0.0.4")).toBe(false);
    });
  });
});
