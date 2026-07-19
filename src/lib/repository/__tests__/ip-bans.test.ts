import { describe, it, expect, vi, beforeAll, beforeEach, afterAll } from "vitest";
import { createTestDb, truncateAll } from "@/test/db-test-utils";
import type Database from "better-sqlite3";

let db: Database.Database;

vi.mock("@/lib/db", () => ({
  getDb: () => db,
}));

const defaultSiteConfig: Record<string, string> = {
  auto_ban_login_threshold: "5",
  auto_ban_window_seconds: "3600",
  suspicious_ip_threshold: "10",
};

vi.mock("@/lib/repository/site-config", () => ({
  getConfig: vi.fn((key: string) => defaultSiteConfig[key] ?? ""),
}));

beforeAll(() => { db = createTestDb(); });
beforeEach(() => { truncateAll(db); });
afterAll(() => { db.close(); });

describe("ip-bans repository", () => {
  describe("banIp", () => {
    it("inserts a banned IP with default reason", async () => {
      const { banIp } = await import("@/lib/repository/ip-bans");
      banIp("192.168.1.1", "manual");

      const banned = db.prepare("SELECT * FROM banned_ips WHERE ip_address = '192.168.1.1'").get() as { ip_address: string; reason: string; unbanned_at: string | null };
      expect(banned.ip_address).toBe("192.168.1.1");
      expect(banned.reason).toBe("manual");
      expect(banned.unbanned_at).toBeNull();
    });

    it("inserts a banned IP with custom reason", async () => {
      const { banIp } = await import("@/lib/repository/ip-bans");
      banIp("10.0.0.1", "auto:rate-limit-threshold");

      const banned = db.prepare("SELECT * FROM banned_ips WHERE ip_address = '10.0.0.1'").get() as { reason: string };
      expect(banned.reason).toBe("auto:rate-limit-threshold");
    });

    it("returns false on duplicate active ban", async () => {
      const { banIp } = await import("@/lib/repository/ip-bans");
      expect(banIp("192.168.1.2", "manual")).toBe(true);
      expect(banIp("192.168.1.2", "manual")).toBe(false);
    });
  });

  describe("isIpBanned", () => {
    it("returns false for unknown IP", async () => {
      const { isIpBanned } = await import("@/lib/repository/ip-bans");
      expect(isIpBanned("192.168.1.99")).toBe(false);
    });

    it("returns true for banned IP", async () => {
      const { banIp, isIpBanned } = await import("@/lib/repository/ip-bans");
      banIp("192.168.1.3", "manual");
      expect(isIpBanned("192.168.1.3")).toBe(true);
    });

    it("returns false after unbanning", async () => {
      const { banIp, unbanIp, isIpBanned } = await import("@/lib/repository/ip-bans");
      banIp("192.168.1.4", "manual");
      const ban = db.prepare("SELECT id FROM banned_ips WHERE ip_address = '192.168.1.4'").get() as { id: number };
      unbanIp(ban.id);
      expect(isIpBanned("192.168.1.4")).toBe(false);
    });
  });

  describe("unbanIp", () => {
    it("sets unbanned_at timestamp", async () => {
      const { banIp, unbanIp } = await import("@/lib/repository/ip-bans");
      banIp("192.168.1.5", "manual");
      const ban = db.prepare("SELECT id FROM banned_ips WHERE ip_address = '192.168.1.5'").get() as { id: number };
      unbanIp(ban.id);

      const all = db.prepare("SELECT * FROM banned_ips WHERE id = ?").get(ban.id) as { unbanned_at: string | null };
      expect(all.unbanned_at).not.toBeNull();
    });

    it("unbanned IP no longer counted as active", async () => {
      const { banIp, unbanIp, getBannedCount } = await import("@/lib/repository/ip-bans");
      banIp("192.168.1.6", "manual");
      banIp("192.168.1.7", "manual");
      const ban = db.prepare("SELECT id FROM banned_ips WHERE ip_address = '192.168.1.6'").get() as { id: number };
      unbanIp(ban.id);

      expect(getBannedCount()).toBe(1);
    });
  });

  describe("getBannedCount", () => {
    it("returns 0 when no bans", async () => {
      const { getBannedCount } = await import("@/lib/repository/ip-bans");
      expect(getBannedCount()).toBe(0);
    });

    it("returns correct count", async () => {
      const { banIp, getBannedCount } = await import("@/lib/repository/ip-bans");
      banIp("192.168.1.20", "manual");
      banIp("192.168.1.21", "manual");
      expect(getBannedCount()).toBe(2);
    });
  });

  describe("recordRateLimitViolation", () => {
    it("inserts a violation record", async () => {
      const { recordRateLimitViolation } = await import("@/lib/repository/ip-bans");
      recordRateLimitViolation("192.168.1.30");

      const row = db.prepare("SELECT COUNT(*) as cnt FROM rate_limit_violations WHERE ip_address = '192.168.1.30'").get() as { cnt: number };
      expect(row.cnt).toBe(1);
    });

    it("allows multiple violations for same IP", async () => {
      const { recordRateLimitViolation } = await import("@/lib/repository/ip-bans");
      recordRateLimitViolation("192.168.1.31");
      recordRateLimitViolation("192.168.1.31");
      recordRateLimitViolation("192.168.1.31");

      const row = db.prepare("SELECT COUNT(*) as cnt FROM rate_limit_violations WHERE ip_address = '192.168.1.31'").get() as { cnt: number };
      expect(row.cnt).toBe(3);
    });
  });

  describe("getViolationCount", () => {
    it("returns 0 for IP with no violations", async () => {
      const { getViolationCount } = await import("@/lib/repository/ip-bans");
      expect(getViolationCount("192.168.1.40", 3600)).toBe(0);
    });

    it("returns correct count within window", async () => {
      const { recordRateLimitViolation, getViolationCount } = await import("@/lib/repository/ip-bans");
      recordRateLimitViolation("192.168.1.41");
      recordRateLimitViolation("192.168.1.41");
      expect(getViolationCount("192.168.1.41", 3600)).toBe(2);
    });
  });

  describe("deleteOldViolations", () => {
    it("removes violations older than window", async () => {
      const { recordRateLimitViolation, deleteOldViolations } = await import("@/lib/repository/ip-bans");
      recordRateLimitViolation("192.168.1.50");

      // Insert an old violation directly
      db.prepare("INSERT INTO rate_limit_violations (ip_address, violated_at) VALUES (?, datetime('now', '-7200 seconds'))").run("192.168.1.50");

      const before = db.prepare("SELECT COUNT(*) as cnt FROM rate_limit_violations WHERE ip_address = '192.168.1.50'").get() as { cnt: number };
      expect(before.cnt).toBe(2);

      deleteOldViolations(3600);

      const after = db.prepare("SELECT COUNT(*) as cnt FROM rate_limit_violations WHERE ip_address = '192.168.1.50'").get() as { cnt: number };
      expect(after.cnt).toBe(1);
    });
  });

  describe("getSuspiciousIpCount", () => {
    it("returns 0 when no violations", async () => {
      const { getSuspiciousIpCount } = await import("@/lib/repository/ip-bans");
      expect(getSuspiciousIpCount(5)).toBe(0);
    });

    it("counts IPs above threshold", async () => {
      const { recordRateLimitViolation, getSuspiciousIpCount } = await import("@/lib/repository/ip-bans");
      for (let i = 0; i < 5; i++) recordRateLimitViolation("192.168.1.60");
      for (let i = 0; i < 3; i++) recordRateLimitViolation("192.168.1.61");

      expect(getSuspiciousIpCount(5)).toBe(1);
    });

    it("excludes already-banned IPs", async () => {
      const { banIp, recordRateLimitViolation, getSuspiciousIpCount } = await import("@/lib/repository/ip-bans");
      for (let i = 0; i < 5; i++) recordRateLimitViolation("192.168.1.62");
      banIp("192.168.1.62", "manual");

      expect(getSuspiciousIpCount(5)).toBe(0);
    });

    it("counts all violations regardless of time", async () => {
      const { recordRateLimitViolation, getSuspiciousIpCount } = await import("@/lib/repository/ip-bans");
      recordRateLimitViolation("192.168.1.63");
      // Insert an old violation directly
      db.prepare("INSERT INTO rate_limit_violations (ip_address, violated_at) VALUES (?, datetime('now', '-7200 seconds'))").run("192.168.1.63");

      expect(getSuspiciousIpCount(2)).toBe(1);
    });
  });

  describe("getAutoBanConfig", () => {
    it("returns parsed config values", async () => {
      const { getAutoBanConfig } = await import("@/lib/repository/ip-bans");
      const config = getAutoBanConfig();
      expect(config.threshold).toBe(5);
      expect(config.windowSeconds).toBe(3600);
    });
  });

  describe("getSuspiciousConfig", () => {
    it("returns default threshold when no config set", async () => {
      const { getSuspiciousConfig } = await import("@/lib/repository/ip-bans");
      const config = getSuspiciousConfig();
      expect(config.threshold).toBe(10);
    });

    it("returns custom threshold from config", async () => {
      const siteConfig = await import("@/lib/repository/site-config");
      vi.mocked(siteConfig.getConfig).mockImplementation((key: string) => {
        if (key === "suspicious_ip_threshold") return "20";
        return "";
      });
      const { getSuspiciousConfig } = await import("@/lib/repository/ip-bans");
      const config = getSuspiciousConfig();
      expect(config.threshold).toBe(20);
      vi.mocked(siteConfig.getConfig).mockReset();
    });
  });

  describe("tryAutoBan", () => {
    it("bans IP when violation count reaches threshold", async () => {
      const { recordRateLimitViolation, tryAutoBan, isIpBanned } = await import("@/lib/repository/ip-bans");
      for (let i = 0; i < 4; i++) recordRateLimitViolation("192.168.1.100");
      recordRateLimitViolation("192.168.1.100"); // 5th violation = threshold

      tryAutoBan("192.168.1.100");

      expect(isIpBanned("192.168.1.100")).toBe(true);
    });

    it("does not ban IP when violation count is below threshold", async () => {
      const { recordRateLimitViolation, tryAutoBan, isIpBanned } = await import("@/lib/repository/ip-bans");
      for (let i = 0; i < 4; i++) recordRateLimitViolation("192.168.1.101");

      tryAutoBan("192.168.1.101");

      expect(isIpBanned("192.168.1.101")).toBe(false);
    });

    it("does not re-ban IP that is already banned", async () => {
      const ipBans = await import("@/lib/repository/ip-bans");
      const banSpy = vi.spyOn(ipBans, "banIp");
      banSpy.mockClear();
      ipBans.banIp("192.168.1.102", "manual");
      expect(banSpy).toHaveBeenCalledTimes(1);
      for (let i = 0; i < 5; i++) ipBans.recordRateLimitViolation("192.168.1.102");

      ipBans.tryAutoBan("192.168.1.102");

      expect(ipBans.isIpBanned("192.168.1.102")).toBe(true);
      expect(banSpy).toHaveBeenCalledTimes(1);
      banSpy.mockRestore();
    });
  });

  describe("clearViolations", () => {
    it("removes all violations for an IP", async () => {
      const { recordRateLimitViolation, clearViolations, getViolationCount } = await import("@/lib/repository/ip-bans");
      for (let i = 0; i < 5; i++) recordRateLimitViolation("192.168.1.90");

      expect(getViolationCount("192.168.1.90", 86400)).toBe(5);
      clearViolations("192.168.1.90");
      expect(getViolationCount("192.168.1.90", 86400)).toBe(0);
    });

    it("does not affect other IPs", async () => {
      const { recordRateLimitViolation, clearViolations, getViolationCount } = await import("@/lib/repository/ip-bans");
      for (let i = 0; i < 3; i++) recordRateLimitViolation("192.168.1.91");
      for (let i = 0; i < 2; i++) recordRateLimitViolation("192.168.1.92");

      clearViolations("192.168.1.91");
      expect(getViolationCount("192.168.1.91", 86400)).toBe(0);
      expect(getViolationCount("192.168.1.92", 86400)).toBe(2);
    });
  });

});
