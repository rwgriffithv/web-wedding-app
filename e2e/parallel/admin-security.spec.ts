import { test, expect } from "@playwright/test";
import { loginAsAdmin } from "../utils/helpers";
import { seedViolations, flushTestIps } from "../utils/rate-limit-helpers";

test.afterEach(() => {
  flushTestIps();
});

test("admin security page shows rate limit violations section", async ({ page }) => {
  await loginAsAdmin(page);
  await page.goto("/admin/security");

  // Verify violations section is present
  await expect(page.getByText(/Rate Limit Violations/)).toBeVisible();
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

  // The IP should appear in the suspicious table with violation count
  const ipRow = tableSection.locator("tr").filter({ hasText: testIp });
  await expect(ipRow.getByText(testIp)).toBeVisible();
  await expect(ipRow.locator("td").nth(1)).toHaveText("12");

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
