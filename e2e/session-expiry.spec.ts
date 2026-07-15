import { test, expect } from "@playwright/test";
import crypto from "crypto";

const SESSION_SECRET = "rob-and-ana";

function createExpiredSession(data: Record<string, unknown>): string {
  const payload = { ...data, exp: Date.now() - 10_000 };
  const json = JSON.stringify(payload);
  const hmac = crypto.createHmac("sha256", SESSION_SECRET).update(json).digest("hex");
  return Buffer.from(`${json}.${hmac}`).toString("base64url");
}

test("expired admin session redirects to login", async ({ page }) => {
  // Log in as admin to get valid session attributes
  await page.goto("/login");
  await page.getByRole("button", { name: "User sign in" }).click();
  await page.fill("input[name=username]", "admin");
  await page.fill("input[name=password]", "admin");
  await page.locator("button[type=submit]").click();
  await page.waitForURL("/admin");

  // Replace with an expired session token (same payload, exp in the past)
  const expiredToken = createExpiredSession({ userId: 2, type: "admin" });
  await page.context().addCookies([{
    name: "session",
    value: expiredToken,
    domain: "localhost",
    path: "/",
  }]);

  // Navigate to protected page — expired session should be rejected
  await page.goto("/admin");
  await expect(page).toHaveURL("/login");
});

test("expired party session redirects to login", async ({ page }) => {
  // Log in as party user to get valid session attributes
  await page.goto("/");
  await page.fill("input[name=code]", "DEMO-1234");
  await page.getByRole("button", { name: "Continue with Party Code" }).click();
  await page.waitForURL("/home");

  // Replace with an expired session token
  const expiredToken = createExpiredSession({ userId: 4, partyId: 1, type: "party" });
  await page.context().addCookies([{
    name: "session",
    value: expiredToken,
    domain: "localhost",
    path: "/",
  }]);

  // Navigate to protected page — expired session should be rejected
  await page.goto("/home");
  await expect(page).toHaveURL("/login");
});
