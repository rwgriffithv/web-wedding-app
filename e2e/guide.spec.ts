import { test, expect } from "@playwright/test";
import { loginAsParty } from "./helpers";

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
