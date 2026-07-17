import { test, expect } from "@playwright/test";
import { loginAsAdmin } from "../utils/helpers";
import { cleanupIp } from "../utils/rate-limit-helpers";

const SPOOFED_IP = "10.0.0.1";
const UNIQUE = Date.now();

test("password change revokes active session", async ({ page }) => {
  const username = `revoker-${UNIQUE}`;
  await loginAsAdmin(page);

  await page.goto("/admin/users");
  await page.fill("input[name=display_name]", "E2E Revoker");
  await page.fill("input[name=username]", username);
  await page.fill("input[name=password]", "temppass123");
  await page.getByRole("button", { name: "Add User" }).click();
  await expect(page.getByText("User added.")).toBeVisible();

  await page.context().clearCookies();

  await page.goto("/login");
  await page.getByRole("button", { name: "User sign in" }).click();
  await page.fill("input[name=username]", username);
  await page.fill("input[name=password]", "temppass123");
  await page.locator("button[type=submit]").click();
  await page.waitForURL(/\/admin/, { timeout: 5000 });

  await page.goto("/admin/users");
  const userRow = page.locator(".admin-list-item").filter({ hasText: username });
  await userRow.getByLabel("New password").first().fill("newtemppass456");
  await userRow.getByRole("button", { name: "Save" }).first().click();
  await page.waitForLoadState("networkidle");

  await page.goto("/admin");
  await expect(page).toHaveURL("/login");

  await page.getByRole("button", { name: "User sign in" }).click();
  await page.fill("input[name=username]", username);
  await page.fill("input[name=password]", "newtemppass456");
  await page.locator("button[type=submit]").click();
  await page.waitForURL(/\/admin/, { timeout: 5000 });
});

test("IP ban revokes active session for second context", async ({ page, browser }) => {
  const ctx2 = await browser.newContext({
    extraHTTPHeaders: { "x-forwarded-for": SPOOFED_IP },
  });
  const page2 = await ctx2.newPage();
  await page2.goto("/login");
  await page2.getByRole("button", { name: "User sign in" }).click();
  await page2.fill("input[name=username]", "admin");
  await page2.fill("input[name=password]", "admin");
  await page2.locator("button[type=submit]").click();
  await page2.waitForURL(/\/admin/, { timeout: 10000 });

  await loginAsAdmin(page);

  await page.goto("/admin/security");
  await page.locator("summary").filter({ hasText: "Ban IP" }).click();
  await page.fill("#ip_address", SPOOFED_IP);
  await page.fill("#reason", "E2E revocation test");
  await page.getByRole("button", { name: "Ban IP" }).click();
  await page.waitForLoadState("networkidle");
  await expect(page.getByText("IP banned.")).toBeVisible();

  await page2.goto("/admin");
  await page2.waitForURL(/\/login/, { timeout: 10000 });

  await ctx2.close();
  cleanupIp(SPOOFED_IP);
});

test("party session rejected from admin routes", async ({ page }) => {
  await page.goto("/");
  await page.fill("input[name=code]", "DEMO-1234");
  await page.getByRole("button", { name: "Continue with Party Code" }).click();
  await page.waitForURL(/\/home/, { timeout: 10000 });

  await page.goto("/admin");
  await expect(page).toHaveURL(/\/home/);
});
