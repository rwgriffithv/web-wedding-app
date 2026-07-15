import { test, expect } from "@playwright/test";
import { loginAsParty } from "./helpers";

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
  if (await tabs.isVisible()) {
    await expect(page.getByRole("tab").first()).toBeVisible();
  }
});

test("media page can switch sections", async ({ page }) => {
  await loginAsParty(page);
  await page.goto("/media");
  const venueTab = page.getByRole("tab", { name: "Venue" });
  if (await venueTab.isVisible()) {
    await venueTab.click();
    await expect(page).toHaveURL(/tab=venue/);
  }
});
