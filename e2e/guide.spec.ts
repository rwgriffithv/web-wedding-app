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

test("guide page requires auth", async ({ page }) => {
  await page.goto("/guide");
  await expect(page).toHaveURL("/login");
});

test("guide page shows schedule tab by default", async ({ page }) => {
  await loginAsParty(page);
  await page.goto("/guide");
  await expect(page.getByRole("heading", { name: "Guide" })).toBeVisible();
  await expect(page.locator("#guide-panel-schedule")).toBeVisible();
  await expect(page.getByText("Ceremony")).toBeVisible();
  await expect(page.getByText("Cocktail Hour")).toBeVisible();
});

test("guide page can switch to dress code tab", async ({ page }) => {
  await loginAsParty(page);
  await page.goto("/guide");
  await page.getByRole("tab", { name: "Dress Code" }).click();
  await expect(page).toHaveURL(/tab=dress-code/);
  await expect(page.locator("#guide-panel-dress-code")).toBeVisible();
  await expect(page.getByText(/formal attire/)).toBeVisible();
});

test("guide page can switch to lodging tab", async ({ page }) => {
  await loginAsParty(page);
  await page.goto("/guide");
  await page.getByRole("tab", { name: "Lodging" }).click();
  await expect(page).toHaveURL(/tab=lodging/);
  await expect(page.locator("#guide-panel-lodging")).toBeVisible();
  await expect(page.getByText("Grand Hotel")).toBeVisible();
  await expect(page.getByText("Seaside Resort")).toBeVisible();
});

test("guide page active tab is highlighted", async ({ page }) => {
  await loginAsParty(page);
  await page.goto("/guide?tab=lodging");
  const lodgingTab = page.getByRole("tab", { name: "Lodging" });
  await expect(lodgingTab).toHaveAttribute("aria-selected", "true");
});
