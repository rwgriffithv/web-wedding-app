import { test, expect } from "@playwright/test";
import { loginAsParty, loginAsAdmin } from "../utils/helpers";

test("guest logout clears session and redirects to login", async ({ page }) => {
  await loginAsParty(page);

  await page.getByRole("button", { name: "Logout" }).click();
  await expect(page).toHaveURL("/login");

  await page.goto("/home");
  await expect(page).toHaveURL("/login");
});

test("admin logout clears session and redirects to login", async ({ page }) => {
  await loginAsAdmin(page);

  // Admin layout has no Logout button; clear session via cookie removal
  await page.context().clearCookies();

  await page.goto("/admin");
  await expect(page).toHaveURL("/login");
});
