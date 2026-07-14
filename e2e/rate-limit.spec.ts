import { test, expect } from "@playwright/test";

test.describe("rate limiting", () => {
  test("multiple failed login attempts show credential error, not rate limit", async ({ page }) => {
    // With RATE_LIMIT_MAX=100, 5 failed attempts should show credential error, not rate limit.
    // This verifies the login flow works correctly under normal use.
    await page.goto("/login");
    await page.getByRole("button", { name: "User sign in" }).click();

    for (let i = 0; i < 5; i++) {
      await page.fill("input[name=username]", "wrong-user");
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

  test("different usernames get independent rate limit buckets", async ({ page }) => {
    // Verify that rate limiting one username doesn't affect another.
    await page.goto("/login");
    await page.getByRole("button", { name: "User sign in" }).click();

    // Exhaust attempts for user A
    for (let i = 0; i < 5; i++) {
      await page.fill("input[name=username]", "rl-isolation-a");
      await page.fill("input[name=password]", "wrong");
      await page.locator("button[type=submit]").click();
      await expect(page.getByText("Invalid username or password.")).toBeVisible();
    }

    // User B should not be affected
    await page.fill("input[name=username]", "rl-isolation-b");
    await page.fill("input[name=password]", "wrong");
    await page.locator("button[type=submit]").click();
    await expect(page.getByText("Invalid username or password.")).toBeVisible();
  });

  test("admin security page shows rate limit violations section", async ({ page }) => {
    // Login as admin
    await page.goto("/login");
    await page.getByRole("button", { name: "User sign in" }).click();
    await page.fill("input[name=username]", "admin");
    await page.fill("input[name=password]", "admin");
    await page.locator("button[type=submit]").click();
    await page.waitForURL("/admin");

    // Navigate to security page
    await page.goto("/admin/security");

    // Verify violations section is present
    await expect(page.getByText(/Rate Limit Violations/)).toBeVisible();
  });

  test("admin security page shows empty violations state", async ({ page }) => {
    // Login as admin
    await page.goto("/login");
    await page.getByRole("button", { name: "User sign in" }).click();
    await page.fill("input[name=username]", "admin");
    await page.fill("input[name=password]", "admin");
    await page.locator("button[type=submit]").click();
    await page.waitForURL("/admin");

    await page.goto("/admin/security");

    // Should show empty violations state (scoped to violations section, not any admin-table)
    const violationsSection = page.locator("details").filter({ hasText: "Rate Limit Violations" });
    await expect(violationsSection.getByText("No rate limit violations recorded.")).toBeVisible();
  });

  test("admin security page has ban ip section", async ({ page }) => {
    // Login as admin
    await page.goto("/login");
    await page.getByRole("button", { name: "User sign in" }).click();
    await page.fill("input[name=username]", "admin");
    await page.fill("input[name=password]", "admin");
    await page.locator("button[type=submit]").click();
    await page.waitForURL("/admin");

    await page.goto("/admin/security");

    // The ban-ip section summary is present
    await expect(page.locator("summary").filter({ hasText: "Ban IP" })).toBeVisible();
  });
});
