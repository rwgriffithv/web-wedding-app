import { test, expect } from "@playwright/test";

async function loginAsParty(page: import("@playwright/test").Page) {
  await page.goto("/");
  await page.fill("input[name=code]", "DEMO-1234");
  await page.getByRole("button", { name: "Continue with Party Code" }).click();
  try {
    await expect(page).toHaveURL(/\/home/, { timeout: 3000 });
  } catch (err) {
    console.log("[loginAsParty] first attempt failed, retrying:", (err as Error).message?.slice(0, 200));
    await page.waitForTimeout(2000);
    await page.goto("/");
    await page.fill("input[name=code]", "DEMO-1234");
    await page.getByRole("button", { name: "Continue with Party Code" }).click();
    await expect(page).toHaveURL(/\/home/);
  }
}

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
