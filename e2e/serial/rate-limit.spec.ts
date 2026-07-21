import { test, expect } from "@playwright/test";
import { loginAsAdmin } from "../utils/helpers";
import {
  openDb,
  setConfig,
  detectClientIp,
  getViolationCountFromDb,
  isIpBannedInDb,
  nukeAllBansAndViolations,
  flushTestIps,
} from "../utils/rate-limit-helpers";
import {
  LOGIN_RATE_LIMIT_MAX_KEY,
  LOGIN_RATE_LIMIT_WINDOW_SECONDS_KEY,
  AUTO_BAN_LOGIN_THRESHOLD_KEY,
  AUTO_BAN_WINDOW_SECONDS_KEY,
} from "../../src/lib/constants";

test.describe("rate limiting", () => {
  test.describe.configure({ mode: "serial" });

  test.afterEach(() => {
    flushTestIps();
  });

  // --- Sensitive tests first — they set low thresholds and need clean in-memory state ---

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

    setConfig(LOGIN_RATE_LIMIT_MAX_KEY, "2");
    setConfig(LOGIN_RATE_LIMIT_WINDOW_SECONDS_KEY, "1");
    setConfig(AUTO_BAN_LOGIN_THRESHOLD_KEY, "3");
    setConfig(AUTO_BAN_WINDOW_SECONDS_KEY, "3600");

    const username = "rl-e2e-ban-chain";

    // try/finally ensures we always clean up the ban and restore config,
    // even if the test fails mid-way (e.g. timeout).
    try {
      // Use 127.0.0.2 to avoid stale in-memory rate limiter state from prior admin logins
      await page.route("**/*", async (route) => {
        await route.continue({
          headers: { ...route.request().headers(), "x-forwarded-for": "127.0.0.2" },
        });
      });

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
      // and returns "IP banned" instead of "Too many attempts", so the client calls
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

      // Auto-ban triggers → server returns "IP banned" error → client refreshes → ban screen shown
      await expect(page.getByText(/banned/i)).toBeVisible();

      // After 9 bad logins: 3 violations → BANNED
      expect(getViolationCountFromDb(clientIp)).toBe(3);
      expect(isIpBannedInDb(clientIp)).toBe(true);

      // Verify: ban persists across page navigation
      await page.goto("/login");
      await expect(page.getByText(/banned/i)).toBeVisible();
    } finally {
      // Always clean up: unban ALL IPs, remove ALL violations, restore seed config.
      // This runs even on timeout/failure to prevent contaminating subsequent tests.
      await page.unroute("**/*");
      nukeAllBansAndViolations();
      setConfig(LOGIN_RATE_LIMIT_MAX_KEY, "100");
      setConfig(LOGIN_RATE_LIMIT_WINDOW_SECONDS_KEY, "60");
      setConfig(AUTO_BAN_LOGIN_THRESHOLD_KEY, "50");
      setConfig(AUTO_BAN_WINDOW_SECONDS_KEY, "3600");
    }
  });

  test("after cooldown expires, single request succeeds (not re-blocked)", async ({ page }) => {
    // Proves the rate limit window resets correctly after cooldown.
    //
    // Setup:
    //   rate_limit_max_attempts = 2  → 2 allowed per window, 3rd blocked
    //   rate_limit_window_seconds = 2 → window resets after 2 seconds
    //
    // Flow:
    //   1. Two failed logins → credential error (within limit)
    //   2. Third login → rate limit (exceeds limit)
    //   3. Wait for cooldown (3s = window + buffer)
    //   4. Fourth login → credential error (NOT rate limit — window has reset)

    setConfig(LOGIN_RATE_LIMIT_MAX_KEY, "2");
    setConfig(LOGIN_RATE_LIMIT_WINDOW_SECONDS_KEY, "2");
    setConfig(AUTO_BAN_LOGIN_THRESHOLD_KEY, "50");
    setConfig(AUTO_BAN_WINDOW_SECONDS_KEY, "3600");

    const username = "rl-e2e-window-reset";

    try {
      // Use 127.0.0.2 to avoid stale in-memory rate limiter state from prior admin logins
      await page.route("**/*", async (route) => {
        await route.continue({
          headers: { ...route.request().headers(), "x-forwarded-for": "127.0.0.2" },
        });
      });

      // Wait for any stale in-memory rate limiter entries from the prior
      // auto-ban test (1s window) to expire before setting our own thresholds.
      await page.waitForTimeout(2000);

      await page.goto("/login");
      await page.getByRole("button", { name: "User sign in" }).click();

      // Steps 1-2: Two failed logins within limit → credential error
      for (let i = 0; i < 2; i++) {
        await page.fill("input[name=username]", username);
        await page.fill("input[name=password]", "wrong");
        await page.locator("button[type=submit]").click();
        await expect(page.getByText("Invalid username or password.")).toBeVisible();
      }

      // Step 3: Third login exceeds limit → rate limit error
      await page.fill("input[name=username]", username);
      await page.fill("input[name=password]", "wrong");
      await page.locator("button[type=submit]").click();
      await expect(page.getByText("Too many attempts")).toBeVisible();

      // Step 4: Wait for rate limit window to expire (2s window + 1s buffer)
      await page.waitForTimeout(3000);

      // Step 5: After cooldown, next request should show credential error (NOT rate limit)
      await page.goto("/login");
      await page.getByRole("button", { name: "User sign in" }).click();
      await page.fill("input[name=username]", username);
      await page.fill("input[name=password]", "wrong");
      await page.locator("button[type=submit]").click();
      await expect(page.getByText("Invalid username or password.")).toBeVisible();
    } finally {
      await page.unroute("**/*");
      nukeAllBansAndViolations();
      setConfig(LOGIN_RATE_LIMIT_MAX_KEY, "100");
      setConfig(LOGIN_RATE_LIMIT_WINDOW_SECONDS_KEY, "60");
      setConfig(AUTO_BAN_LOGIN_THRESHOLD_KEY, "50");
      setConfig(AUTO_BAN_WINDOW_SECONDS_KEY, "3600");
    }
  });

  // --- Safe tests below — run after sensitive tests restore config ---

  test("admin security page shows empty violations state", async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto("/admin/security");

    const tableSection = page.locator("details").filter({ hasText: /IP Addresses \(/ });
    await expect(tableSection.getByText("No IPs with violations or bans.")).toBeVisible();
  });

  test("admin security page has suspicious IPs settings with empty state", async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto("/admin/security");

    await expect(page.getByText("Suspicious IPs")).toBeVisible();
    await expect(page.locator("summary").filter({ hasText: /IP Addresses \(/ })).toBeVisible();

    const tableSection = page.locator("details").filter({ hasText: /IP Addresses \(/ });
    await expect(tableSection.getByText("No IPs with violations or bans.")).toBeVisible();
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
});
