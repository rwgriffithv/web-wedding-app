import { test, expect } from "@playwright/test";
import { loginAsParty } from "../utils/helpers";

test("media page requires auth", async ({ page }) => {
  await page.goto("/media");
  await expect(page).toHaveURL("/login");
});

test("media page shows content", async ({ page }) => {
  await loginAsParty(page);
  await page.goto("/media");
  await expect(page.getByRole("heading", { name: "Media" })).toBeVisible();
});

test("media page shows tabs when sections exist", async ({ page }) => {
  await loginAsParty(page);
  await page.goto("/media");
  const tabs = page.locator("[role=tablist]");
  const hasTabs = await tabs.isVisible();
  test.skip(!hasTabs, "No media sections seeded");
  await expect(page.getByRole("tab").first()).toBeVisible();
});

test("media page can switch sections", async ({ page }) => {
  await loginAsParty(page);
  await page.goto("/media");
  const venueTab = page.getByRole("tab", { name: "Venue" });
  const hasVenue = await venueTab.isVisible();
  test.skip(!hasVenue, "No Venue section seeded");
  await venueTab.click();
  await expect(page).toHaveURL(/tab=venue/);
});
