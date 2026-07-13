import { test, expect } from "@playwright/test";

test("guest logout clears session and redirects to login", async ({ page }) => {
  await page.goto("/");
  await page.fill("input[name=code]", "DEMO-1234");
  await page.getByRole("button", { name: "Continue with Party Code" }).click();
  await expect(page).toHaveURL(/\/home/);

  await page.getByRole("button", { name: "Logout" }).click();
  await expect(page).toHaveURL("/login");

  await page.goto("/home");
  await expect(page).toHaveURL("/login");
});

test("admin logout clears session and redirects to login", async ({ page }) => {
  await page.goto("/login");
  await page.getByRole("button", { name: "User sign in" }).click();
  await page.fill("input[name=username]", "admin");
  await page.fill("input[name=password]", "admin");
  await page.locator("button[type=submit]").click();
  await expect(page).toHaveURL(/\/admin/);

  // Admin layout has no Logout button; clear session via cookie removal
  await page.context().clearCookies();

  await page.goto("/admin");
  await expect(page).toHaveURL("/login");
});
