import { test, expect } from "@playwright/test";

async function switchToCredentials(page: import("@playwright/test").Page) {
  await page.goto("/login");
  await page.getByRole("button", { name: "User sign in" }).click();
}

test("login page loads with title", async ({ page }) => {
  await page.goto("/login");
  await expect(page.locator("h1")).toHaveText("We're Getting Married!");
});

test("redirects to login when accessing home without auth", async ({ page }) => {
  await page.goto("/home");
  await expect(page).toHaveURL("/login");
});

test("login with valid credentials redirects to home", async ({ page }) => {
  await switchToCredentials(page);
  await page.fill("input[name=username]", "DEMO-1234");
  await page.fill("input[name=password]", "DEMO-1234");
  await page.locator("button[type=submit]").click();
  await page.waitForURL(/\/home/, { timeout: 10000 });
});

test("login with invalid credentials shows error", async ({ page }) => {
  await switchToCredentials(page);
  await page.fill("input[name=username]", "wrong");
  await page.fill("input[name=password]", "wrong");
  await page.locator("button[type=submit]").click();
  await expect(page.getByText("Invalid username or password.")).toBeVisible();
});
