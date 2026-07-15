import { test, expect, type Page } from "@playwright/test";
import Database from "better-sqlite3";
import path from "path";

const dbPath = path.join(process.cwd(), "data", "dev.db");

let testIpsToClean: string[] = [];

function openDb() {
  const db = new Database(dbPath);
  db.pragma("journal_mode = WAL");
  return db;
}

function seedViolations(ip: string, count: number) {
  const db = openDb();
  const insert = db.prepare("INSERT INTO rate_limit_violations (ip_address, violated_at) VALUES (?, datetime('now'))");
  for (let i = 0; i < count; i++) insert.run(ip);
  db.close();
  testIpsToClean.push(ip);
}

function cleanupIp(ip: string) {
  const db = openDb();
  db.prepare("DELETE FROM rate_limit_violations WHERE ip_address = ?").run(ip);
  db.prepare("DELETE FROM banned_ips WHERE ip_address = ?").run(ip);
  db.close();
}

function getViolationCountFromDb(ip: string): number {
  const db = openDb();
  const row = db.prepare("SELECT COUNT(*) as cnt FROM rate_limit_violations WHERE ip_address = ?").get(ip) as { cnt: number };
  db.close();
  return row.cnt;
}

function isIpBannedInDb(ip: string): boolean {
  const db = openDb();
  const row = db.prepare("SELECT id FROM banned_ips WHERE ip_address = ? AND unbanned_at IS NULL").get(ip);
  db.close();
  return !!row;
}

function nukeAllBansAndViolations() {
  const db = openDb();
  db.prepare("DELETE FROM banned_ips").run();
  db.prepare("DELETE FROM rate_limit_violations").run();
  db.close();
}

function setConfig(key: string, value: string) {
  const db = openDb();
  db.prepare("INSERT OR REPLACE INTO site_config (key, value) VALUES (?, ?)").run(key, value);
  db.close();
}

/** Detect the real client IP from the DB by reading the most recent violation. */
function detectClientIp(): string {
  const db = openDb();
  const row = db.prepare("SELECT ip_address FROM rate_limit_violations ORDER BY id DESC LIMIT 1").get() as { ip_address: string } | undefined;
  db.close();
  if (!row) throw new Error(
    "Cannot detect client IP — no violations in DB. " +
    "The first rate-limited login attempt must succeed before detectClientIp() is called."
  );
  return row.ip_address;
}

async function loginAsAdmin(page: Page) {
  await page.goto("/login");
  await page.getByRole("button", { name: "User sign in" }).click();
  await page.fill("input[name=username]", "admin");
  await page.fill("input[name=password]", "admin");
  await page.locator("button[type=submit]").click();
  await page.waitForURL("/admin");
}

test.describe("rate limiting", () => {
  test.describe.configure({ mode: "serial" });

  test.afterEach(() => {
    for (const ip of testIpsToClean) cleanupIp(ip);
    testIpsToClean = [];
  });

  test("multiple failed login attempts show credential error, not rate limit", async ({ page }) => {
    // With RATE_LIMIT_MAX=100 (seed), 5 failed attempts should show credential error, not rate limit.
    // This verifies the login flow works correctly under normal use.
    await page.goto("/login");
    await page.getByRole("button", { name: "User sign in" }).click();

    for (let i = 0; i < 5; i++) {
      await page.fill("input[name=username]", "wrong-user");
      await page.fill("input[name=password]", "wrong");
      await page.locator("button[type=submit]").click();
      await expect(page.getByText("Invalid username or password.")).toBeVisible();
    }
  });

  test("party code login shows credential error for invalid codes", async ({ page }) => {
    await page.goto("/");

    for (let i = 0; i < 3; i++) {
      await page.fill("input[name=code]", "WRONG-CODE");
      await page.getByRole("button", { name: "Continue with Party Code" }).click();
      await expect(page.getByText(/invalid party code/i)).toBeVisible();
    }
  });

  test("different usernames get independent rate limit buckets", async ({ page }) => {
    // Verify that rate limiting one username doesn't affect another.
    await page.goto("/login");
    await page.getByRole("button", { name: "User sign in" }).click();

    // Exhaust attempts for user A
    for (let i = 0; i < 5; i++) {
      await page.fill("input[name=username]", "rl-isolation-a");
      await page.fill("input[name=password]", "wrong");
      await page.locator("button[type=submit]").click();
      await expect(page.getByText("Invalid username or password.")).toBeVisible();
    }

    // User B should not be affected
    await page.fill("input[name=username]", "rl-isolation-b");
    await page.fill("input[name=password]", "wrong");
    await page.locator("button[type=submit]").click();
    await expect(page.getByText("Invalid username or password.")).toBeVisible();
  });

  test("admin security page shows rate limit violations section", async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto("/admin/security");

    // Verify violations section is present
    await expect(page.getByText(/Rate Limit Violations/)).toBeVisible();
  });

  test("admin security page shows empty violations state", async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto("/admin/security");

    // Should show empty violations state (scoped to violations section, not any admin-table)
    const violationsSection = page.locator("details").filter({ hasText: "Rate Limit Violations" });
    await expect(violationsSection.getByText("No rate limit violations recorded.")).toBeVisible();
  });

  test("admin security page has ban ip section", async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto("/admin/security");

    // The ban-ip section summary is present
    await expect(page.locator("summary").filter({ hasText: "Ban IP" })).toBeVisible();
  });

  test("admin security page has session settings section", async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto("/admin/security");

    // Open the Session & Tracking section (collapsed by default)
    await page.locator("summary").filter({ hasText: "Session & Tracking" }).click();

    // Session expiry input is present with default value
    await expect(page.getByLabel("Session Expiry (hours)")).toBeVisible();

    // Page view debounce input is present with default value
    await expect(page.getByLabel("Page View Debounce (minutes)")).toBeVisible();
  });

  test("admin security page session settings has save button", async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto("/admin/security");

    // Open the Session & Tracking section (collapsed by default)
    await page.locator("summary").filter({ hasText: "Session & Tracking" }).click();

    // The session settings section has a Save button
    const sessionSection = page.locator("details").filter({ hasText: "Session & Tracking" });
    await expect(sessionSection.getByRole("button", { name: "Save" })).toBeVisible();
  });

  test("admin security page has suspicious IPs section", async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto("/admin/security");

    // Both suspicious IPs sections are present: config (collapsed) and table (open)
    await expect(page.locator("summary").getByText("Suspicious IPs Settings", { exact: true })).toBeVisible();
    await expect(page.locator("summary").filter({ hasText: /Suspicious IPs \(/ })).toBeVisible();

    // Shows empty state when no violations
    const tableSection = page.locator("details").filter({ hasText: /Suspicious IPs \(/ });
    await expect(tableSection.getByText("No suspicious IPs detected.")).toBeVisible();
  });

  test("admin security page suspicious IPs has threshold input", async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto("/admin/security");

    // The config section is collapsed — expand it
    const configSummary = page.locator("summary").getByText("Suspicious IPs Settings", { exact: true });
    await configSummary.click();

    // The config section has a threshold input
    const configSection = page.locator("details").filter({ hasText: "Violation Threshold" });
    await expect(configSection.getByLabel("Violation Threshold")).toBeVisible();
    await expect(configSection.getByRole("button", { name: "Save" })).toBeVisible();
  });

  test("suspicious IPs table shows violations and ban button works", async ({ page }) => {
    const testIp = "203.0.113.99";
    seedViolations(testIp, 12);

    await loginAsAdmin(page);
    await page.goto("/admin/security");

    const tableSection = page.locator("details").filter({ hasText: /Suspicious IPs \(/ });

    // The IP should appear in the suspicious table
    await expect(tableSection.getByText(testIp)).toBeVisible();
    await expect(tableSection.getByText("12")).toBeVisible();

    // Ban button should be present
    const banForm = tableSection.locator("tr").filter({ hasText: testIp }).getByRole("button", { name: "Ban" });
    await expect(banForm).toBeVisible();

    // Ban the IP
    await banForm.click();
    await page.waitForLoadState("networkidle");

    // IP should no longer be in suspicious list (it's now banned)
    await expect(tableSection.getByText(testIp)).not.toBeVisible();
  });

  test("suspicious IPs clear button removes violations", async ({ page }) => {
    const testIp = "203.0.113.88";
    seedViolations(testIp, 15);

    await loginAsAdmin(page);
    await page.goto("/admin/security");

    const tableSection = page.locator("details").filter({ hasText: /Suspicious IPs \(/ });

    // The IP should appear
    await expect(tableSection.getByText(testIp)).toBeVisible();

    // Clear violations
    const clearBtn = tableSection.locator("tr").filter({ hasText: testIp }).getByRole("button", { name: "Clear" });
    await clearBtn.click();
    await page.waitForLoadState("networkidle");

    // IP should no longer appear (violations cleared, below threshold)
    await expect(tableSection.getByText(testIp)).not.toBeVisible();
  });

  test("bad logins within rate limit do NOT record violations in DB", async ({ page }) => {
    // Seed config: rate_limit_max_attempts=100. Making 5 bad logins with a unique
    // username should show "Invalid username or password" every time (credential error,
    // not rate limit error). No violation rows should appear in the database.
    const username = "rl-no-violation-check";

    // Record violation count before test
    const db = openDb();
    const before = db.prepare("SELECT COUNT(*) as cnt FROM rate_limit_violations").get() as { cnt: number };
    db.close();

    await page.goto("/login");
    await page.getByRole("button", { name: "User sign in" }).click();

    for (let i = 0; i < 5; i++) {
      await page.fill("input[name=username]", username);
      await page.fill("input[name=password]", "wrong");
      await page.locator("button[type=submit]").click();
      await expect(page.getByText("Invalid username or password.")).toBeVisible();
    }

    // Verify: no new violations recorded, IP not banned
    const db2 = openDb();
    const after = db2.prepare("SELECT COUNT(*) as cnt FROM rate_limit_violations").get() as { cnt: number };
    const banned = db2.prepare("SELECT id FROM banned_ips WHERE unbanned_at IS NULL").get();
    db2.close();
    expect(after.cnt).toBe(before.cnt);
    expect(banned).toBeUndefined();
  });

  test("auto-ban triggers only after enough rate limit violations, not per bad login (multiplication effect)", async ({ page }) => {
    // Override to LOW thresholds for fast testing:
    //   rate_limit_max_attempts = 2  → 2 allowed per window, 3rd blocked = 1 violation
    //   rate_limit_window_seconds = 1 → window resets after 1 second
    //   auto_ban_login_threshold = 3 → need 3 violations to auto-ban
    //
    // Expected flow:
    //   Window 1: attempts 1-2 allowed, attempt 3 blocked → 1 violation
    //   (wait 1s for window to reset)
    //   Window 2: attempts 4-5 allowed, attempt 6 blocked → 2 violations
    //   (wait 1s)
    //   Window 3: attempts 7-8 allowed, attempt 9 blocked → 3 violations → AUTO-BAN
    //
    // Total: 9 bad login attempts, but only 3 rate-limit lockouts → ban.
    // Without the rate-limit gate, 3 bad logins would trigger the ban — that is NOT the case.

    setConfig("rate_limit_max_attempts", "2");
    setConfig("rate_limit_window_seconds", "1");
    setConfig("auto_ban_login_threshold", "3");
    setConfig("auto_ban_window_seconds", "3600");

    const username = "rl-e2e-ban-chain";

    // try/finally ensures we always clean up the ban and restore config,
    // even if the test fails mid-way (e.g. timeout).
    try {
      await page.goto("/login");
      await page.getByRole("button", { name: "User sign in" }).click();

      // --- Window 1: 2 allowed + 1 blocked = 1 violation ---
      for (let i = 0; i < 2; i++) {
        await page.fill("input[name=username]", username);
        await page.fill("input[name=password]", "wrong");
        await page.locator("button[type=submit]").click();
        await expect(page.getByText("Invalid username or password.")).toBeVisible();
      }
      // 3rd attempt hits rate limit
      await page.fill("input[name=username]", username);
      await page.fill("input[name=password]", "wrong");
      await page.locator("button[type=submit]").click();
      await expect(page.getByText("Too many attempts")).toBeVisible();

      // Detect the real client IP (may be ::1 or 127.0.0.1 depending on environment)
      const clientIp = detectClientIp();

      // After 3 bad logins: 1 violation, NOT banned yet
      expect(getViolationCountFromDb(clientIp)).toBe(1);
      expect(isIpBannedInDb(clientIp)).toBe(false);

      // Wait for rate limit window to reset
      await page.waitForTimeout(1100);

      // --- Window 2: 2 allowed + 1 blocked = 2 violations ---
      await page.goto("/login");
      await page.getByRole("button", { name: "User sign in" }).click();
      for (let i = 0; i < 2; i++) {
        await page.fill("input[name=username]", username);
        await page.fill("input[name=password]", "wrong");
        await page.locator("button[type=submit]").click();
        await expect(page.getByText("Invalid username or password.")).toBeVisible();
      }
      await page.fill("input[name=username]", username);
      await page.fill("input[name=password]", "wrong");
      await page.locator("button[type=submit]").click();
      await expect(page.getByText("Too many attempts")).toBeVisible();

      // After 6 bad logins: 2 violations, still NOT banned
      expect(getViolationCountFromDb(clientIp)).toBe(2);
      expect(isIpBannedInDb(clientIp)).toBe(false);

      // Wait for rate limit window to reset
      await page.waitForTimeout(1100);

      // --- Window 3: 2 allowed + 1 blocked = 3 violations → AUTO-BAN ---
      // The 3rd attempt triggers the auto-ban. The server detects the IP is now banned
      // and returns "banned" instead of "Too many attempts", so the client calls
      // router.refresh() to immediately show the ban screen without requiring a manual refresh.
      await page.goto("/login");
      await page.getByRole("button", { name: "User sign in" }).click();
      for (let i = 0; i < 2; i++) {
        await page.fill("input[name=username]", username);
        await page.fill("input[name=password]", "wrong");
        await page.locator("button[type=submit]").click();
        await expect(page.getByText("Invalid username or password.")).toBeVisible();
      }
      await page.fill("input[name=username]", username);
      await page.fill("input[name=password]", "wrong");
      await page.locator("button[type=submit]").click();

      // Auto-ban triggers → server returns "banned" error → client refreshes → ban screen shown
      await expect(page.getByText("Your IP has been banned")).toBeVisible();

      // After 9 bad logins: 3 violations → BANNED
      expect(getViolationCountFromDb(clientIp)).toBe(3);
      expect(isIpBannedInDb(clientIp)).toBe(true);

      // Verify: ban persists across page navigation
      await page.goto("/login");
      await expect(page.getByText("Your IP has been banned")).toBeVisible();
    } finally {
      // Always clean up: unban ALL IPs, remove ALL violations, restore seed config.
      // This runs even on timeout/failure to prevent contaminating subsequent tests.
      nukeAllBansAndViolations();
      setConfig("rate_limit_max_attempts", "100");
      setConfig("rate_limit_window_seconds", "60");
      setConfig("auto_ban_login_threshold", "50");
      setConfig("auto_ban_window_seconds", "3600");
    }
  });
});
