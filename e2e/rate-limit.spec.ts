import { test, expect } from "@playwright/test";

test("multiple failed login attempts show credential error, not rate limit", async ({ page }) => {
  await page.goto("/login");
  await page.getByRole("button", { name: "User sign in" }).click();

  for (let i = 0; i < 5; i++) {
    await page.fill("input[name=username]", "wrong");
    await page.fill("input[name=password]", "wrong");
    await page.locator("button[type=submit]").click();
    await expect(page.getByText("Invalid username or password.")).toBeVisible();
  }
});

test("party code login shows credential error for invalid codes", async ({ page }) => {
  await page.goto("/");

  for (let i = 0; i < 3; i++) {
    await page.fill("input[name=code]", "WRONG-CODE");
    await page.getByRole("button", { name: "Continue with Party Code" }).click();
    await expect(page.getByText(/invalid party code/i)).toBeVisible();
  }
});
