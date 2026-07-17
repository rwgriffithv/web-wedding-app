import { test, expect } from "@playwright/test";
import { loginAsParty } from "../utils/helpers";

test("session indicator shows warning when session cookie is missing but cookie_health_until exists", async ({ page }) => {
  await loginAsParty(page);
  await expect(page).toHaveURL("/home");

  const health = await page.evaluate(() => localStorage.getItem("cookie_health_until"));
  expect(health).toBeTruthy();
  expect(Number(health)).toBeGreaterThan(Date.now());

  await page.context().clearCookies({ name: "session" });

  await page.goto("/rsvp");
  await expect(page).toHaveURL("/login");

  await expect(page.locator(".session-warning")).toBeVisible();
  await expect(page.getByText(/blocking cookies/i)).toBeVisible();
});

test("session indicator does not show warning for normal login", async ({ page }) => {
  await loginAsParty(page);
  await expect(page).toHaveURL("/home");

  await expect(page.locator(".session-warning")).not.toBeVisible();
});

test("logout clears localStorage cookie_health_until", async ({ page }) => {
  await loginAsParty(page);
  await expect(page).toHaveURL("/home");

  const health = await page.evaluate(() => localStorage.getItem("cookie_health_until"));
  expect(health).toBeTruthy();

  await page.getByRole("button", { name: "Logout" }).click();
  await expect(page).toHaveURL(/\/login|\/$/);

  await page.waitForFunction(() => localStorage.getItem("cookie_health_until") === null, undefined, { timeout: 5000 });
});
