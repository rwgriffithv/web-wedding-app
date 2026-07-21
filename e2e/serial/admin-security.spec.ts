import { test, expect } from "@playwright/test";
import { loginAsAdmin } from "../utils/helpers";
import { seedViolations, flushTestIps } from "../utils/rate-limit-helpers";

test.afterEach(() => {
  flushTestIps();
});

test("admin security page shows IP addresses section", async ({ page }) => {
  await loginAsAdmin(page);
  await page.goto("/admin/security");

  await expect(page.getByText(/IP Addresses/)).toBeVisible();
});

test("admin security page has ban ip section", async ({ page }) => {
  await loginAsAdmin(page);
  await page.goto("/admin/security");

  await expect(page.locator("summary").filter({ hasText: "Ban IP" })).toBeVisible();
});

test("admin security page has settings section with session fields", async ({ page }) => {
  await loginAsAdmin(page);
  await page.goto("/admin/security");

  await expect(page.getByLabel("Session Expiry (hours)")).toBeVisible();
  await expect(page.getByLabel("Page View Debounce (minutes)")).toBeVisible();
});

test("admin security page settings has single save button", async ({ page }) => {
  await loginAsAdmin(page);
  await page.goto("/admin/security");

  await expect(page.getByRole("button", { name: "Save Changes" })).toBeVisible();
});

test("admin security page settings has suspicious threshold input", async ({ page }) => {
  await loginAsAdmin(page);
  await page.goto("/admin/security");

  await expect(page.getByLabel("Violation Threshold")).toBeVisible();
});

test("admin security page settings has auto-ban fields", async ({ page }) => {
  await loginAsAdmin(page);
  await page.goto("/admin/security");

  await expect(page.getByLabel("Auto-Ban Threshold (lockouts)")).toBeVisible();
  await expect(page.getByLabel("Auto-Ban Window (seconds)")).toBeVisible();
});

test("admin security page settings has rate limit fields", async ({ page }) => {
  await loginAsAdmin(page);
  await page.goto("/admin/security");

  await expect(page.getByLabel("Rate Limit Max Attempts")).toBeVisible();
  await expect(page.getByLabel("Rate Limit Window (seconds)")).toBeVisible();
});

test("IP table shows suspicious IPs with ban button", async ({ page }) => {
  const testIp = "203.0.113.99";
  seedViolations(testIp, 12);

  await loginAsAdmin(page);
  await page.goto("/admin/security");

  const tableSection = page.locator("details").filter({ hasText: /IP Addresses \(/ });

  const ipRow = tableSection.locator("tr").filter({ hasText: testIp });
  await expect(ipRow.getByText(testIp)).toBeVisible();
  await expect(ipRow.locator("td").nth(3)).toHaveText("12");

  const banForm = tableSection.locator("tr").filter({ hasText: testIp }).getByRole("button", { name: "No" });
  await expect(banForm).toBeVisible();

  await banForm.click();
  await page.waitForLoadState("networkidle");

  await expect(tableSection.locator("tr").filter({ hasText: testIp }).getByRole("button", { name: "Yes" })).toBeVisible({ timeout: 10000 });
});

test("IP table clear button removes violations", async ({ page }) => {
  const testIp = "203.0.113.88";
  seedViolations(testIp, 15);

  await loginAsAdmin(page);
  await page.goto("/admin/security");

  const tableSection = page.locator("details").filter({ hasText: /IP Addresses \(/ });

  await expect(tableSection.getByText(testIp)).toBeVisible();

  const clearBtn = tableSection.locator("tr").filter({ hasText: testIp }).getByRole("button", { name: "Clear" });
  await clearBtn.click();
  await page.waitForLoadState("networkidle");

  await expect(tableSection.getByText(testIp)).not.toBeVisible();
});

test("banned IP appears in IP table with Unban button", async ({ page }) => {
  const testIp = "203.0.113.77";
  seedViolations(testIp, 5);

  await loginAsAdmin(page);
  await page.goto("/admin/security");

  const tableSection = page.locator("details").filter({ hasText: /IP Addresses \(/ });

  const ipRow = tableSection.locator("tr").filter({ hasText: testIp });
  await expect(ipRow.getByText(testIp)).toBeVisible();

  const banBtn = ipRow.getByRole("button", { name: "No" });
  await banBtn.click();
  await page.waitForLoadState("networkidle");

  const bannedRow = tableSection.locator("tr").filter({ hasText: testIp });
  await expect(bannedRow.getByRole("button", { name: "Yes" })).toBeVisible({ timeout: 10000 });

  const unbanBtn = bannedRow.getByRole("button", { name: "Yes" });
  await unbanBtn.click();
  await page.waitForLoadState("networkidle");

  await expect(tableSection.locator("tr").filter({ hasText: testIp }).getByRole("button", { name: "No" })).toBeVisible({ timeout: 10000 });
});
