import { describe, it, expect, vi, beforeAll, beforeEach, afterAll } from "vitest";
import { createTestDb, truncateAll } from "@/test/db-test-utils";
import { createRateLimiter } from "@/lib/rate-limit";
import type Database from "better-sqlite3";

let db: Database.Database;

vi.mock("@/lib/db", () => ({
  getDb: () => db,
}));

const defaultSiteConfig: Record<string, string> = {
  rate_limit_max_attempts: "5",
  rate_limit_window_seconds: "60",
  auto_ban_login_threshold: "5",
  auto_ban_window_seconds: "3600",
};

vi.mock("@/lib/repository/site-config", () => ({
  getConfig: vi.fn((key: string) => defaultSiteConfig[key] ?? ""),
}));

beforeAll(() => {
  db = createTestDb();
});
beforeEach(() => {
  truncateAll(db);
});
afterAll(() => {
  db.close();
});

/**
 * Simulates the login flow's rate-limit → violation → auto-ban chain.
 *
 * This is the core logic from src/app/login/actions.ts:
 *   if (!rateLimiter.check(key, rlConfig)) {
 *     recordRateLimitViolation(ip);
 *     tryAutoBan(ip);
 *   }
 *
 * We replicate tryAutoBan inline to keep the test self-contained.
 */
async function simulateLoginAttempt(
  limiter: ReturnType<typeof createRateLimiter>,
  ip: string,
  username: string,
) {
  const { getConfig } = await import("@/lib/repository/site-config");
  const maxAttempts = parseInt(getConfig("rate_limit_max_attempts"), 10) || 5;
  const windowSeconds = parseInt(getConfig("rate_limit_window_seconds"), 10) || 60;

  const { recordRateLimitViolation, getViolationCount, isIpBanned, banIp } = await import("@/lib/repository/ip-bans");

  const rlConfig = { maxAttempts, windowMs: windowSeconds * 1000 };
  const key = `${ip}:login`;
  const blocked = !limiter.check(key, rlConfig);

  if (blocked) {
    recordRateLimitViolation(ip);

    const threshold = parseInt(getConfig("auto_ban_login_threshold"), 10) || 5;
    const autoBanWindow = parseInt(getConfig("auto_ban_window_seconds"), 10) || 3600;
    const violationCount = getViolationCount(ip, autoBanWindow);

    if (violationCount >= threshold && !isIpBanned(ip)) {
      banIp(ip, "auto:rate-limit-threshold");
    }
  }

  return { blocked };
}

describe("rate-limit → violation → auto-ban chain", () => {
  it("does NOT record violations for bad logins within rate limit", async () => {
    const { getViolationCount } = await import("@/lib/repository/ip-bans");
    const limiter = createRateLimiter("test-chain-no-violation");
    limiter.reset();

    const ip = "10.0.0.1";
    const username = "testuser";

    // Make 5 bad logins (within default limit of 5)
    for (let i = 0; i < 5; i++) {
      const result = await simulateLoginAttempt(limiter, ip, username);
      expect(result.blocked).toBe(false);
    }

    // Zero violations should be recorded
    expect(getViolationCount(ip, 3600)).toBe(0);
  });

  it("records ONE violation when rate limit is first exceeded", async () => {
    const { getViolationCount, isIpBanned } = await import("@/lib/repository/ip-bans");
    const limiter = createRateLimiter("test-chain-first-violation");
    limiter.reset();

    const ip = "10.0.0.2";
    const username = "testuser";

    // First 5 allowed
    for (let i = 0; i < 5; i++) {
      const result = await simulateLoginAttempt(limiter, ip, username);
      expect(result.blocked).toBe(false);
    }

    // 6th is blocked → 1 violation recorded
    const result = await simulateLoginAttempt(limiter, ip, username);
    expect(result.blocked).toBe(true);
    expect(getViolationCount(ip, 3600)).toBe(1);

    // Not banned yet (threshold is 5)
    expect(isIpBanned(ip)).toBe(false);
  });

  it("does NOT ban until violation threshold is reached", async () => {
    const { getViolationCount, isIpBanned } = await import("@/lib/repository/ip-bans");
    const limiter = createRateLimiter("test-chain-threshold");
    limiter.reset();

    const ip = "10.0.0.3";
    const username = "testuser";

    // Accumulate 4 violations (need 4 windows of lockouts)
    for (let v = 0; v < 4; v++) {
      // Exhaust rate limit: 5 allowed + 1 blocked = 1 violation per window
      for (let i = 0; i < 6; i++) {
        await simulateLoginAttempt(limiter, ip, username);
      }
      // Reset the window so next loop creates a new lockout
      limiter.reset();
    }

    expect(getViolationCount(ip, 3600)).toBe(4);
    expect(isIpBanned(ip)).toBe(false);
  });

  it("bans IP after exactly 5 violations (default threshold)", async () => {
    const { getViolationCount, isIpBanned } = await import("@/lib/repository/ip-bans");
    const limiter = createRateLimiter("test-chain-exact-ban");
    limiter.reset();

    const ip = "10.0.0.4";
    const username = "testuser";

    // Accumulate exactly 5 violations
    for (let v = 0; v < 5; v++) {
      for (let i = 0; i < 6; i++) {
        await simulateLoginAttempt(limiter, ip, username);
      }
      limiter.reset();
    }

    expect(getViolationCount(ip, 3600)).toBe(5);
    expect(isIpBanned(ip)).toBe(true);
  });

  it("requires 30 bad logins to get banned (5 per lockout × 5 lockouts)", async () => {
    const { isIpBanned } = await import("@/lib/repository/ip-bans");
    const limiter = createRateLimiter("test-chain-multiplication");
    limiter.reset();

    const ip = "10.0.0.5";
    const username = "testuser";
    let totalAttempts = 0;

    // With defaults: 5 max attempts → 5 allowed per window, 6th blocked = 1 violation
    // 5 violations needed → 5 windows × 6 attempts = 30 attempts
    for (let v = 0; v < 5; v++) {
      for (let i = 0; i < 6; i++) {
        await simulateLoginAttempt(limiter, ip, username);
        totalAttempts++;
      }
      limiter.reset();
    }

    // After 30 bad logins, IP should be banned
    expect(isIpBanned(ip)).toBe(true);
    expect(totalAttempts).toBe(30);
  });

  it("login attempts share a single rate limit bucket per IP", async () => {
    const { getViolationCount } = await import("@/lib/repository/ip-bans");
    const limiter = createRateLimiter("test-chain-shared-bucket");
    limiter.reset();

    const ip = "10.0.0.6";

    // Try 3 bad logins with username A (within limit of 5)
    for (let i = 0; i < 3; i++) {
      const result = await simulateLoginAttempt(limiter, ip, "userA");
      expect(result.blocked).toBe(false);
    }

    // Try 3 bad logins with username B (shared bucket, now at 6 of 5 → blocked on 3rd)
    let blockedCount = 0;
    for (let i = 0; i < 3; i++) {
      const result = await simulateLoginAttempt(limiter, ip, "userB");
      if (result.blocked) blockedCount++;
    }

    // At least one should be blocked since attempts share a bucket
    expect(blockedCount).toBeGreaterThan(0);
  });

  it("different IPs get independent violation counts", async () => {
    const { getViolationCount, isIpBanned } = await import("@/lib/repository/ip-bans");
    const limiter = createRateLimiter("test-chain-ip-isolation");
    limiter.reset();

    const username = "testuser";

    // Ban IP A with 5 violations
    for (let v = 0; v < 5; v++) {
      for (let i = 0; i < 6; i++) {
        await simulateLoginAttempt(limiter, "10.0.0.7", username);
      }
      limiter.reset();
    }

    // IP B has zero violations
    expect(getViolationCount("10.0.0.8", 3600)).toBe(0);
    expect(isIpBanned("10.0.0.8")).toBe(false);

    // IP A is banned
    expect(isIpBanned("10.0.0.7")).toBe(true);
  });

  it("getViolationCount respects the time window (old violations excluded)", async () => {
    const { recordRateLimitViolation, getViolationCount, isIpBanned } = await import("@/lib/repository/ip-bans");

    const ip = "10.0.0.9";

    // Insert 4 violations that are old (outside 1-hour window)
    for (let i = 0; i < 4; i++) {
      db.prepare(
        "INSERT INTO rate_limit_violations (ip_address, violated_at) VALUES (?, datetime('now', '-7200 seconds'))"
      ).run(ip);
    }

    // Add 1 fresh violation
    recordRateLimitViolation(ip);

    // 5 total violations, but 4 are outside the 1-hour window
    // getViolationCount with 3600s window should only count 1
    expect(getViolationCount(ip, 3600)).toBe(1);

    // Not banned — 1 violation is far below the threshold of 5
    expect(isIpBanned(ip)).toBe(false);
  });
});
