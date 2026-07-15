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
      const { banIp, getBannedIps } = await import("@/lib/repository/ip-bans");
      banIp("192.168.1.1", "manual");

      const banned = getBannedIps();
      expect(banned).toHaveLength(1);
      expect(banned[0].ip_address).toBe("192.168.1.1");
      expect(banned[0].reason).toBe("manual");
      expect(banned[0].unbanned_at).toBeNull();
    });

    it("inserts a banned IP with custom reason", async () => {
      const { banIp, getBannedIps } = await import("@/lib/repository/ip-bans");
      banIp("10.0.0.1", "auto:rate-limit-threshold");

      const banned = getBannedIps();
      expect(banned[0].reason).toBe("auto:rate-limit-threshold");
    });

    it("throws on duplicate active ban", async () => {
      const { banIp } = await import("@/lib/repository/ip-bans");
      banIp("192.168.1.2", "manual");
      expect(() => banIp("192.168.1.2", "manual")).toThrow();
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
      const { banIp, unbanIp, isIpBanned, getBannedIps } = await import("@/lib/repository/ip-bans");
      banIp("192.168.1.4", "manual");
      const banned = getBannedIps();
      unbanIp(banned[0].id);
      expect(isIpBanned("192.168.1.4")).toBe(false);
    });
  });

  describe("unbanIp", () => {
    it("sets unbanned_at timestamp", async () => {
      const { banIp, unbanIp, getBannedIps } = await import("@/lib/repository/ip-bans");
      banIp("192.168.1.5", "manual");
      const banned = getBannedIps();
      unbanIp(banned[0].id);

      const all = db.prepare("SELECT * FROM banned_ips WHERE id = ?").get(banned[0].id) as { unbanned_at: string | null };
      expect(all.unbanned_at).not.toBeNull();
    });

    it("unbanned IP no longer in getBannedIps", async () => {
      const { banIp, unbanIp, getBannedIps } = await import("@/lib/repository/ip-bans");
      banIp("192.168.1.6", "manual");
      banIp("192.168.1.7", "manual");
      const banned = getBannedIps();
      unbanIp(banned[0].id);

      const active = getBannedIps();
      expect(active).toHaveLength(1);
    });
  });

  describe("getBannedIps", () => {
    it("returns empty array when no bans", async () => {
      const { getBannedIps } = await import("@/lib/repository/ip-bans");
      expect(getBannedIps()).toHaveLength(0);
    });

    it("returns only active bans ordered by banned_at DESC", async () => {
      const { banIp, unbanIp, getBannedIps } = await import("@/lib/repository/ip-bans");
      banIp("192.168.1.10", "manual");
      banIp("192.168.1.11", "manual");
      banIp("192.168.1.12", "manual");

      const banned = getBannedIps();
      expect(banned).toHaveLength(3);

      unbanIp(banned[1].id);
      expect(getBannedIps()).toHaveLength(2);
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
      vi.mocked(siteConfig.getConfig).mockRestore();
    });
  });

  describe("getSuspiciousIps", () => {
    it("returns empty array when no violations", async () => {
      const { getSuspiciousIps } = await import("@/lib/repository/ip-bans");
      expect(getSuspiciousIps(5)).toHaveLength(0);
    });

    it("returns IPs at or above threshold", async () => {
      const { recordRateLimitViolation, getSuspiciousIps } = await import("@/lib/repository/ip-bans");
      for (let i = 0; i < 5; i++) recordRateLimitViolation("192.168.1.80");
      for (let i = 0; i < 2; i++) recordRateLimitViolation("192.168.1.81");

      const suspicious = getSuspiciousIps(5);
      expect(suspicious).toHaveLength(1);
      expect(suspicious[0].ip_address).toBe("192.168.1.80");
      expect(suspicious[0].violation_count).toBe(5);
    });

    it("excludes banned IPs", async () => {
      const { banIp, recordRateLimitViolation, getSuspiciousIps } = await import("@/lib/repository/ip-bans");
      for (let i = 0; i < 5; i++) recordRateLimitViolation("192.168.1.82");
      banIp("192.168.1.82", "manual");

      expect(getSuspiciousIps(5)).toHaveLength(0);
    });

    it("orders by violation_count DESC", async () => {
      const { recordRateLimitViolation, getSuspiciousIps } = await import("@/lib/repository/ip-bans");
      for (let i = 0; i < 3; i++) recordRateLimitViolation("192.168.1.83");
      for (let i = 0; i < 10; i++) recordRateLimitViolation("192.168.1.84");
      for (let i = 0; i < 5; i++) recordRateLimitViolation("192.168.1.85");

      const suspicious = getSuspiciousIps(2);
      expect(suspicious[0].ip_address).toBe("192.168.1.84");
      expect(suspicious[1].ip_address).toBe("192.168.1.85");
      expect(suspicious[2].ip_address).toBe("192.168.1.83");
    });

    it("includes last_violated_at timestamp", async () => {
      const { recordRateLimitViolation, getSuspiciousIps } = await import("@/lib/repository/ip-bans");
      recordRateLimitViolation("192.168.1.86");

      const suspicious = getSuspiciousIps(1);
      expect(suspicious[0].last_violated_at).toBeTruthy();
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

  describe("getRateLimitViolations", () => {
    it("returns empty array when no violations", async () => {
      const { getRateLimitViolations } = await import("@/lib/repository/ip-bans");
      expect(getRateLimitViolations(3600)).toHaveLength(0);
    });

    it("groups violations by IP and returns counts", async () => {
      const { recordRateLimitViolation, getRateLimitViolations } = await import("@/lib/repository/ip-bans");
      for (let i = 0; i < 3; i++) recordRateLimitViolation("192.168.1.70");
      for (let i = 0; i < 5; i++) recordRateLimitViolation("192.168.1.71");

      const violations = getRateLimitViolations(3600);
      expect(violations).toHaveLength(2);
      expect(violations[0].ip_address).toBe("192.168.1.71");
      expect(violations[0].violation_count).toBe(5);
      expect(violations[1].ip_address).toBe("192.168.1.70");
      expect(violations[1].violation_count).toBe(3);
    });

    it("orders by violation_count DESC", async () => {
      const { recordRateLimitViolation, getRateLimitViolations } = await import("@/lib/repository/ip-bans");
      for (let i = 0; i < 2; i++) recordRateLimitViolation("192.168.1.72");
      for (let i = 0; i < 10; i++) recordRateLimitViolation("192.168.1.73");
      for (let i = 0; i < 5; i++) recordRateLimitViolation("192.168.1.74");

      const violations = getRateLimitViolations(3600);
      expect(violations[0].ip_address).toBe("192.168.1.73");
      expect(violations[1].ip_address).toBe("192.168.1.74");
      expect(violations[2].ip_address).toBe("192.168.1.72");
    });

    it("excludes banned IPs", async () => {
      const { banIp, recordRateLimitViolation, getRateLimitViolations } = await import("@/lib/repository/ip-bans");
      for (let i = 0; i < 3; i++) recordRateLimitViolation("192.168.1.75");
      for (let i = 0; i < 3; i++) recordRateLimitViolation("192.168.1.76");
      banIp("192.168.1.75", "manual");

      const violations = getRateLimitViolations(3600);
      expect(violations).toHaveLength(1);
      expect(violations[0].ip_address).toBe("192.168.1.76");
    });

    it("includes last_violated_at timestamp", async () => {
      const { recordRateLimitViolation, getRateLimitViolations } = await import("@/lib/repository/ip-bans");
      recordRateLimitViolation("192.168.1.77");

      const violations = getRateLimitViolations(3600);
      expect(violations[0].last_violated_at).toBeTruthy();
      expect(new Date(violations[0].last_violated_at).getTime()).toBeGreaterThan(0);
    });

    it("excludes violations older than the window", async () => {
      const { recordRateLimitViolation, getRateLimitViolations } = await import("@/lib/repository/ip-bans");
      recordRateLimitViolation("192.168.1.78");

      // Insert an old violation directly
      db.prepare("INSERT INTO rate_limit_violations (ip_address, violated_at) VALUES (?, datetime('now', '-7200 seconds'))").run("192.168.1.78");

      const violations = getRateLimitViolations(3600);
      expect(violations).toHaveLength(1);
      expect(violations[0].ip_address).toBe("192.168.1.78");
      expect(violations[0].violation_count).toBe(1);
    });
  });
});
