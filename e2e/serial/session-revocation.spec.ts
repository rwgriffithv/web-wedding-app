import { test, expect } from "@playwright/test";
import { loginAsAdmin } from "../utils/helpers";
import { cleanupIp } from "../utils/rate-limit-helpers";

const UNIQUE = Date.now();

async function unbanIpViaAdmin(page: import("@playwright/test").Page, ip: string) {
  await page.goto("/admin/security");
  const bannedSection = page.locator(".admin-list").first();
  const row = bannedSection.locator(".admin-list-item").filter({ hasText: ip });
  const unbanBtn = row.getByRole("button", { name: "Unban" });
  if (await unbanBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await unbanBtn.click();
    await page.waitForLoadState("networkidle");
  }
}

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
  const spoofedIp = `10.0.${UNIQUE % 255}.1`;
  const ctx2 = await browser.newContext({
    extraHTTPHeaders: { "x-forwarded-for": spoofedIp },
  });
  try {
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
    await page.fill("#ip_address", spoofedIp);
    await page.fill("#reason", "E2E revocation test");
    await page.getByRole("button", { name: "Ban IP" }).click();
    await page.waitForLoadState("networkidle");
    await expect(page.getByText("IP banned.")).toBeVisible();

    await page2.goto("/admin");
    await page2.waitForURL(/\/login/, { timeout: 10000 });
  } finally {
    await ctx2.close();
    await unbanIpViaAdmin(page, spoofedIp);
    cleanupIp(spoofedIp);
  }
});

test("party session rejected from admin routes", async ({ page }) => {
  await page.goto("/");
  await page.fill("input[name=code]", "DEMO-1234");
  await page.getByRole("button", { name: "Continue with Party Code" }).click();
  await page.waitForURL(/\/home/, { timeout: 10000 });

  await page.goto("/admin");
  await expect(page).toHaveURL(/\/home/);
});

const BANNED_IP_Rsvp = `10.0.${UNIQUE % 255}.3`;
const BANNED_IP_Help = `10.0.${UNIQUE % 255}.4`;
const BANNED_IP_Refresh = `10.0.${UNIQUE % 255}.5`;

test("banned party user navigates cached site, RSVP submission kicks to ban screen", async ({ page, browser }) => {
  const ctx2 = await browser.newContext({
    extraHTTPHeaders: { "x-forwarded-for": BANNED_IP_Rsvp },
  });
  try {
    const partyPage = await ctx2.newPage();
    await partyPage.goto("/");
    await partyPage.fill("input[name=code]", "DEMO-1234");
    await partyPage.getByRole("button", { name: "Continue with Party Code" }).click();
    await partyPage.waitForURL(/\/home/, { timeout: 10000 });

    await partyPage.getByRole("link", { name: "RSVP" }).click();
    await partyPage.waitForURL(/\/rsvp/, { timeout: 10000 });

    await loginAsAdmin(page);
    await page.goto("/admin/security");
    await page.locator("summary").filter({ hasText: "Ban IP" }).click();
    await page.fill("#ip_address", BANNED_IP_Rsvp);
    await page.fill("#reason", "E2E RSVP submission ban test");
    await page.getByRole("button", { name: "Ban IP" }).click();
    await page.waitForLoadState("networkidle");
    await expect(page.getByText("IP banned.")).toBeVisible();

    await partyPage.getByRole("link", { name: "Guide" }).click();
    await partyPage.waitForURL(/\/guide/, { timeout: 10000 });
    await expect(partyPage).toHaveURL(/\/guide/);

    await partyPage.getByRole("link", { name: "RSVP" }).click();
    await partyPage.waitForURL(/\/rsvp/, { timeout: 10000 });

    await partyPage.locator("form.rsvp-form").first().locator('input[type="radio"][value="yes"]').first().click();
    await partyPage.locator("form.rsvp-form").first().getByRole("button", { name: "Submit" }).click();

    await partyPage.goto("/home");
    await partyPage.waitForURL(/\/login/, { timeout: 10000 });
    await expect(partyPage.getByText(/ip banned/i)).toBeVisible();
  } finally {
    await ctx2.close();
    await unbanIpViaAdmin(page, BANNED_IP_Rsvp);
    cleanupIp(BANNED_IP_Rsvp);
  }
});

test("banned party user navigates cached site, help submission kicks to ban screen", async ({ page, browser }) => {
  const ctx2 = await browser.newContext({
    extraHTTPHeaders: { "x-forwarded-for": BANNED_IP_Help },
  });
  try {
    const partyPage = await ctx2.newPage();
    await partyPage.goto("/");
    await partyPage.fill("input[name=code]", "DEMO-1234");
    await partyPage.getByRole("button", { name: "Continue with Party Code" }).click();
    await partyPage.waitForURL(/\/home/, { timeout: 10000 });

    await partyPage.getByRole("link", { name: "Guide" }).click();
    await partyPage.waitForURL(/\/guide/, { timeout: 10000 });
    await partyPage.getByRole("link", { name: "Help" }).click();
    await partyPage.waitForURL(/\/help/, { timeout: 10000 });
    await partyPage.getByRole("tab", { name: "My Questions" }).click();
    await partyPage.waitForURL(/\/help\?tab=my-questions/, { timeout: 10000 });

    await loginAsAdmin(page);
    await page.goto("/admin/security");
    await page.locator("summary").filter({ hasText: "Ban IP" }).click();
    await page.fill("#ip_address", BANNED_IP_Help);
    await page.fill("#reason", "E2E help submission ban test");
    await page.getByRole("button", { name: "Ban IP" }).click();
    await page.waitForLoadState("networkidle");
    await expect(page.getByText("IP banned.")).toBeVisible();

    await partyPage.getByRole("link", { name: "Guide" }).click();
    await partyPage.waitForURL(/\/guide/, { timeout: 10000 });
    await expect(partyPage).toHaveURL(/\/guide/);

    await partyPage.getByRole("link", { name: "Help" }).click();
    await partyPage.waitForURL(/\/help/, { timeout: 10000 });

    await partyPage.getByRole("tab", { name: "My Questions" }).click();
    await partyPage.waitForURL(/\/help\?tab=my-questions/, { timeout: 10000 });
    await partyPage.getByLabel("Ask a question").fill("Is the venue accessible?");
    await partyPage.getByRole("button", { name: "Submit Question" }).click();

    await partyPage.goto("/home");
    await partyPage.waitForURL(/\/login/, { timeout: 10000 });
    await expect(partyPage.getByText(/ip banned/i)).toBeVisible();
  } finally {
    await ctx2.close();
    await unbanIpViaAdmin(page, BANNED_IP_Help);
    cleanupIp(BANNED_IP_Help);
  }
});

test("banned party user navigates cached site, refresh kicks to ban screen", async ({ page, browser }) => {
  const ctx2 = await browser.newContext({
    extraHTTPHeaders: { "x-forwarded-for": BANNED_IP_Refresh },
  });
  try {
    const partyPage = await ctx2.newPage();
    await partyPage.goto("/");
    await partyPage.fill("input[name=code]", "DEMO-1234");
    await partyPage.getByRole("button", { name: "Continue with Party Code" }).click();
    await partyPage.waitForURL(/\/home/, { timeout: 10000 });

    await partyPage.getByRole("link", { name: "Guide" }).click();
    await partyPage.waitForURL(/\/guide/, { timeout: 10000 });
    await partyPage.getByRole("link", { name: "RSVP" }).click();
    await partyPage.waitForURL(/\/rsvp/, { timeout: 10000 });

    await loginAsAdmin(page);
    await page.goto("/admin/security");
    await page.locator("summary").filter({ hasText: "Ban IP" }).click();
    await page.fill("#ip_address", BANNED_IP_Refresh);
    await page.fill("#reason", "E2E refresh ban test");
    await page.getByRole("button", { name: "Ban IP" }).click();
    await page.waitForLoadState("networkidle");
    await expect(page.getByText("IP banned.")).toBeVisible();

    await partyPage.getByRole("link", { name: "RSVP" }).click();
    await partyPage.waitForURL(/\/rsvp/, { timeout: 10000 });

    await partyPage.reload();
    await partyPage.waitForURL(/\/login/, { timeout: 10000 });
    await expect(partyPage.getByText(/ip banned/i)).toBeVisible();
  } finally {
    await ctx2.close();
    await unbanIpViaAdmin(page, BANNED_IP_Refresh);
    cleanupIp(BANNED_IP_Refresh);
  }
});

const BANNED_IP_FullNav = `10.0.${UNIQUE % 255}.6`;

// page.goto() is used instead of a <Link> click because Next.js App Router
// prefetches nav links into the client-side RSC cache. After prefetch, clicking
// a <Link> is served entirely from cache (no server request, proxy never runs).
// This test verifies that a full page navigation (reload, URL-bar, bookmark)
// — which always hits the server — is intercepted by the proxy and redirected
// to the ban screen. A real user clicking a cached nav <Link> would briefly
// see stale pre-ban content until their next server request (form submit,
// refresh, or direct navigation).
test("banned party user navigates to never-visited page via full reload, proxy redirects to ban screen", async ({ page, browser }) => {
  const ctx2 = await browser.newContext({
    extraHTTPHeaders: { "x-forwarded-for": BANNED_IP_FullNav },
  });
  try {
    const partyPage = await ctx2.newPage();
    await partyPage.goto("/");
    await partyPage.fill("input[name=code]", "DEMO-1234");
    await partyPage.getByRole("button", { name: "Continue with Party Code" }).click();
    await partyPage.waitForURL(/\/home/, { timeout: 10000 });

    await loginAsAdmin(page);
    await page.goto("/admin/security");
    await page.locator("summary").filter({ hasText: "Ban IP" }).click();
    await page.fill("#ip_address", BANNED_IP_FullNav);
    await page.fill("#reason", "E2E full-nav ban test");
    await page.getByRole("button", { name: "Ban IP" }).click();
    await page.waitForLoadState("networkidle");
    await expect(page.getByText("IP banned.")).toBeVisible();

    await partyPage.goto("/help");
    await partyPage.waitForURL(/\/login/, { timeout: 10000 });
    await expect(partyPage.getByText(/ip banned/i)).toBeVisible();
  } finally {
    await ctx2.close();
    await unbanIpViaAdmin(page, BANNED_IP_FullNav);
    cleanupIp(BANNED_IP_FullNav);
  }
});
