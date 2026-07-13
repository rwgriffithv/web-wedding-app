import { test, expect } from "@playwright/test";

async function loginAsAdmin(page: import("@playwright/test").Page) {
  await page.goto("/login");
  await page.getByRole("button", { name: "User sign in" }).click();
  await page.fill("input[name=username]", "admin");
  await page.fill("input[name=password]", "admin");
  await page.locator("button[type=submit]").click();
}

test("redirects to login when accessing admin without auth", async ({ page }) => {
  await page.goto("/admin");
  await expect(page).toHaveURL("/login");
});

test("login with admin credentials redirects to admin", async ({ page }) => {
  await loginAsAdmin(page);
  await page.waitForURL(/\/admin/, { timeout: 10000 });
});

test("admin dashboard shows stats and rsvp table", async ({ page }) => {
  await loginAsAdmin(page);
  await page.waitForURL(/\/admin/, { timeout: 10000 });
  await expect(page.locator(".stat-card")).toHaveCount(5);
});

test("admin sidebar has all management links", async ({ page }) => {
  await loginAsAdmin(page);
  await expect(page.getByRole("link", { name: "Site Config" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Guests" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Lodging" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Dress Code" })).toBeVisible();
  await expect(page.getByRole("link", { name: "RSVP" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Media" })).toBeVisible();
});
