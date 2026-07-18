import { test, expect } from "@playwright/test";
import { loginAsAdmin, loginAsParty } from "../utils/helpers";
import { getPageViewsByUsername, setPageViewDebounce } from "../utils/db-helpers";

const PARTY_USERNAME = "DEMO-1234";
const SEED_DEBOUNCE = 15;

test.describe("Page view tracking", () => {
  test.describe.configure({ mode: "serial" });

  test("page views are tracked on client-side navigation", async ({ page }) => {
    // --- Initialize: set debounce to 0 (count every nav), clear browser state ---
    setPageViewDebounce(0);
    await page.context().clearCookies();

    try {
      await loginAsParty(page);
      await expect(page).toHaveURL(/\/home/);

      // Wait for initial page view server action to complete
      await page.waitForTimeout(1000);
      const before = getPageViewsByUsername(PARTY_USERNAME);

      // Navigate between pages via client-side links
      await page.getByRole("link", { name: "RSVP" }).click();
      await expect(page).toHaveURL(/\/rsvp/);

      await page.getByRole("link", { name: "Guide" }).click();
      await expect(page).toHaveURL(/\/guide/);

      await page.getByRole("link", { name: "Home" }).click();
      await expect(page).toHaveURL(/\/home/);

      // Allow server actions to complete
      await page.waitForTimeout(1000);

      const after = getPageViewsByUsername(PARTY_USERNAME);
      expect(after).toBeGreaterThan(before);

      // Verify admin dashboard activity table reflects the count
      await page.context().clearCookies();
      await loginAsAdmin(page);
      await page.goto("/admin/users");
      await page.locator("summary").filter({ hasText: "Activity" }).click();
      const activityRow = page.locator(".activity-table tbody tr").filter({ hasText: "Demo Family" });
      await expect(activityRow.locator("td").nth(2)).toHaveText(String(after));
    } finally {
      // --- Cleanup: restore seed config ---
      setPageViewDebounce(SEED_DEBOUNCE);
    }
  });

  test("page view debounce prevents duplicate counts", async ({ page }) => {
    // --- Initialize: set debounce to 15 (default), clear browser state ---
    setPageViewDebounce(SEED_DEBOUNCE);
    await page.context().clearCookies();

    try {
      await loginAsParty(page);
      await expect(page).toHaveURL(/\/home/);

      // Wait for initial page view server action to complete
      await page.waitForTimeout(1000);
      const before = getPageViewsByUsername(PARTY_USERNAME);

      // Navigate rapidly — debounce should prevent additional counts
      await page.getByRole("link", { name: "RSVP" }).click();
      await expect(page).toHaveURL(/\/rsvp/);

      await page.getByRole("link", { name: "Guide" }).click();
      await expect(page).toHaveURL(/\/guide/);

      await page.waitForTimeout(1000);

      const after = getPageViewsByUsername(PARTY_USERNAME);
      // Only 1 additional page view due to 15-minute debounce
      expect(after - before).toBeLessThanOrEqual(1);
    } finally {
      // --- Cleanup: restore seed config ---
      setPageViewDebounce(SEED_DEBOUNCE);
    }
  });
});
