import { describe, it, expect, beforeEach } from "vitest";
import {
  revokeSessionsByPasswordChange,
  clearPasswordRevocation,
  isSessionRevokedByPasswordChange,
  revokeSessionsByIpBan,
  unrevokeSessionsByIpBan,
  isSessionRevokedByIpBan,
} from "@/lib/session-revocation";

describe("session-revocation", () => {
  beforeEach(() => {
    // Clear state between tests by revoking then clearing
    clearPasswordRevocation(1);
    clearPasswordRevocation(2);
    unrevokeSessionsByIpBan("1.2.3.4");
    unrevokeSessionsByIpBan("5.6.7.8");
  });

  describe("password change revocation", () => {
    it("returns false when no revocation exists", () => {
      expect(isSessionRevokedByPasswordChange(1, null)).toBe(false);
    });

    it("returns true when session has no pwChangedAt", () => {
      revokeSessionsByPasswordChange(1);
      expect(isSessionRevokedByPasswordChange(1, null)).toBe(true);
    });

    it("returns true when revocation is newer than pwChangedAt", () => {
      revokeSessionsByPasswordChange(1);
      expect(isSessionRevokedByPasswordChange(1, "2020-01-01T00:00:00Z")).toBe(true);
    });

    it("returns false when pwChangedAt is newer than revocation", () => {
      const future = new Date(Date.now() + 10000).toISOString();
      revokeSessionsByPasswordChange(1);
      expect(isSessionRevokedByPasswordChange(1, future)).toBe(false);
    });

    it("clear removes the revocation", () => {
      revokeSessionsByPasswordChange(1);
      expect(isSessionRevokedByPasswordChange(1, null)).toBe(true);
      clearPasswordRevocation(1);
      expect(isSessionRevokedByPasswordChange(1, null)).toBe(false);
    });

    it("revocations are scoped per user", () => {
      revokeSessionsByPasswordChange(1);
      expect(isSessionRevokedByPasswordChange(1, null)).toBe(true);
      expect(isSessionRevokedByPasswordChange(2, null)).toBe(false);
    });
  });

  describe("IP ban revocation", () => {
    it("returns false for unbanned IP", () => {
      expect(isSessionRevokedByIpBan("1.2.3.4")).toBe(false);
    });

    it("returns true after banning", () => {
      revokeSessionsByIpBan("1.2.3.4");
      expect(isSessionRevokedByIpBan("1.2.3.4")).toBe(true);
    });

    it("unban clears the revocation", () => {
      revokeSessionsByIpBan("1.2.3.4");
      expect(isSessionRevokedByIpBan("1.2.3.4")).toBe(true);
      unrevokeSessionsByIpBan("1.2.3.4");
      expect(isSessionRevokedByIpBan("1.2.3.4")).toBe(false);
    });

    it("bans are scoped per IP", () => {
      revokeSessionsByIpBan("1.2.3.4");
      expect(isSessionRevokedByIpBan("1.2.3.4")).toBe(true);
      expect(isSessionRevokedByIpBan("5.6.7.8")).toBe(false);
    });
  });
});
