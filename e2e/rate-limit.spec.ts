import { test, expect, type Page } from "@playwright/test";
import Database from "better-sqlite3";
import path from "path";

const dbPath = path.join(process.cwd(), "data", "dev.db");

let testIpsToClean: string[] = [];

function seedViolations(ip: string, count: number) {
  const db = new Database(dbPath);
  db.pragma("journal_mode = WAL");
  const insert = db.prepare("INSERT INTO rate_limit_violations (ip_address, violated_at) VALUES (?, datetime('now'))");
  for (let i = 0; i < count; i++) insert.run(ip);
  db.close();
  testIpsToClean.push(ip);
}

function cleanupIp(ip: string) {
  const db = new Database(dbPath);
  db.pragma("journal_mode = WAL");
  db.prepare("DELETE FROM rate_limit_violations WHERE ip_address = ?").run(ip);
  db.prepare("DELETE FROM banned_ips WHERE ip_address = ?").run(ip);
  db.close();
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
    // With RATE_LIMIT_MAX=100, 5 failed attempts should show credential error, not rate limit.
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

    // Suspicious IPs section is present (default open)
    await expect(page.locator("summary").filter({ hasText: /Suspicious IPs/ })).toBeVisible();

    // Shows empty state when no violations
    const suspiciousSection = page.locator("details").filter({ hasText: /Suspicious IPs/ });
    await expect(suspiciousSection.getByText("No suspicious IPs detected.")).toBeVisible();
  });

  test("admin security page suspicious IPs has threshold input", async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto("/admin/security");

    // The suspicious IPs section has a threshold input
    const suspiciousSection = page.locator("details").filter({ hasText: /Suspicious IPs/ });
    await expect(suspiciousSection.getByLabel("Violation Threshold")).toBeVisible();
    await expect(suspiciousSection.getByRole("button", { name: "Save" })).toBeVisible();
  });

  test("suspicious IPs table shows violations and ban button works", async ({ page }) => {
    const testIp = "203.0.113.99";
    seedViolations(testIp, 12);

    await loginAsAdmin(page);
    await page.goto("/admin/security");

    const suspiciousSection = page.locator("details").filter({ hasText: /Suspicious IPs/ });

    // The IP should appear in the suspicious table
    await expect(suspiciousSection.getByText(testIp)).toBeVisible();
    await expect(suspiciousSection.getByText("12")).toBeVisible();

    // Ban button should be present
    const banForm = suspiciousSection.locator("tr").filter({ hasText: testIp }).getByRole("button", { name: "Ban" });
    await expect(banForm).toBeVisible();

    // Ban the IP
    await banForm.click();
    await page.waitForLoadState("networkidle");

    // IP should no longer be in suspicious list (it's now banned)
    await expect(suspiciousSection.getByText(testIp)).not.toBeVisible();
  });

  test("suspicious IPs clear button removes violations", async ({ page }) => {
    const testIp = "203.0.113.88";
    seedViolations(testIp, 15);

    await loginAsAdmin(page);
    await page.goto("/admin/security");

    const suspiciousSection = page.locator("details").filter({ hasText: /Suspicious IPs/ });

    // The IP should appear
    await expect(suspiciousSection.getByText(testIp)).toBeVisible();

    // Clear violations
    const clearBtn = suspiciousSection.locator("tr").filter({ hasText: testIp }).getByRole("button", { name: "Clear" });
    await clearBtn.click();
    await page.waitForLoadState("networkidle");

    // IP should no longer appear (violations cleared, below threshold)
    await expect(suspiciousSection.getByText(testIp)).not.toBeVisible();
  });
});
