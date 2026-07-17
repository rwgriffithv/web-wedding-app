import { test, expect } from "@playwright/test";
import crypto from "crypto";

const SESSION_SECRET = process.env.SESSION_SECRET ?? "super-secret-secret-at-least-32chars";

function createExpiredSession(data: Record<string, unknown>): string {
  const payload = { ...data, exp: Date.now() - 10_000 };
  const json = JSON.stringify(payload);
  const hmac = crypto.createHmac("sha256", SESSION_SECRET).update(json).digest("hex");
  return Buffer.from(`${json}.${hmac}`).toString("base64url");
}

function decodeSession(token: string): Record<string, unknown> | null {
  try {
    const decoded = Buffer.from(token, "base64url").toString();
    const lastDot = decoded.lastIndexOf(".");
    if (lastDot === -1) return null;
    return JSON.parse(decoded.slice(0, lastDot)) as Record<string, unknown>;
  } catch {
    return null;
  }
}

async function getSessionPayload(page: import("@playwright/test").Page): Promise<Record<string, unknown>> {
  const cookies = await page.context().cookies();
  const sessionCookie = cookies.find((c) => c.name === "session");
  if (!sessionCookie) throw new Error("No session cookie found after login");
  const payload = decodeSession(sessionCookie.value);
  if (!payload) throw new Error("Failed to decode session token");
  return payload;
}

test("expired admin session redirects to login", async ({ page }) => {
  await page.goto("/login");
  await page.getByRole("button", { name: "User sign in" }).click();
  await page.fill("input[name=username]", "admin");
  await page.fill("input[name=password]", "admin");
  await page.locator("button[type=submit]").click();
  await page.waitForURL("/admin");

  const payload = await getSessionPayload(page);
  const expiredToken = createExpiredSession(payload);
  await page.context().addCookies([{
    name: "session",
    value: expiredToken,
    domain: "localhost",
    path: "/",
  }]);

  await page.goto("/admin");
  await expect(page).toHaveURL("/login");
});

test("expired party session redirects to login", async ({ page }) => {
  await page.goto("/");
  await page.fill("input[name=code]", "DEMO-1234");
  await page.getByRole("button", { name: "Continue with Party Code" }).click();
  await page.waitForURL("/home");

  const payload = await getSessionPayload(page);
  const expiredToken = createExpiredSession(payload);
  await page.context().addCookies([{
    name: "session",
    value: expiredToken,
    domain: "localhost",
    path: "/",
  }]);

  await page.goto("/home");
  await expect(page).toHaveURL("/login");
});
