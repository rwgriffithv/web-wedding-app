import { expect, type Page } from "@playwright/test";

export async function loginAsParty(page: Page) {
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

export async function loginAsAdmin(page: Page) {
  await page.goto("/login");
  await page.getByRole("button", { name: "User sign in" }).click();
  await page.fill("input[name=username]", "admin");
  await page.fill("input[name=password]", "admin");
  await page.locator("button[type=submit]").click();
  try {
    await expect(page).toHaveURL(/\/admin/, { timeout: 10000 });
  } catch {
    await page.waitForTimeout(2000);
    await page.fill("input[name=username]", "admin");
    await page.fill("input[name=password]", "admin");
    await page.locator("button[type=submit]").click();
    await expect(page).toHaveURL(/\/admin/, { timeout: 15000 });
  }
}
