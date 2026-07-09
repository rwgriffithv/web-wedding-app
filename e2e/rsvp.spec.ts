import { test, expect } from "@playwright/test";

test("party code login redirects to RSVP page", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Party Code" }).click();
  await page.fill("input[name=code]", "DEMO-1234");
  await page.getByRole("button", { name: "Continue with Party Code" }).click();
  await expect(page).toHaveURL(/\/rsvp/);
  await expect(page.getByRole("heading", { name: "RSVP" })).toBeVisible();
  await expect(page.getByText("Party: Demo Family")).toBeVisible();
});

test("party can submit RSVP with plus one", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Party Code" }).click();
  await page.fill("input[name=code]", "DEMO-1234");
  await page.getByRole("button", { name: "Continue with Party Code" }).click();
  await expect(page).toHaveURL(/\/rsvp/);

  const form = page.locator(".rsvp-form").first();

  const nameInput = form.locator("input[name^=name_]");
  await nameInput.fill("Jane Guest");

  await form.locator("input[type=radio][value=yes]").check();

  const plusOneInput = form.locator("input[name^=plus_one_]");
  if (await plusOneInput.isVisible()) {
    await plusOneInput.fill("Sarah Guest");
  }

  await form.locator("button[type=submit]").click();
  await expect(page.getByText(/^Response/)).toBeVisible();
});

test("guest without RSVP access sees view-only message", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "User sign in" }).click();
  await page.fill("input[name=username]", "guest");
  await page.fill("input[name=password]", "guest");
  await page.locator("button[type=submit]").click();
  await expect(page).toHaveURL(/\/home/);

  await page.goto("/rsvp");
  await expect(page.getByText(/no RSVP is required/i)).toBeVisible();
});

test("invalid party code shows error", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Party Code" }).click();
  await page.fill("input[name=code]", "INVALID-CODE");
  await page.getByRole("button", { name: "Continue with Party Code" }).click();
  await expect(page.getByText(/invalid party code/i)).toBeVisible();
});

test("existing RSVP shown on return", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Party Code" }).click();
  await page.fill("input[name=code]", "DEMO-1234");
  await page.getByRole("button", { name: "Continue with Party Code" }).click();
  await expect(page).toHaveURL(/\/rsvp/);

  const form = page.locator(".rsvp-form").first();
  await form.locator("input[name^=name_]").fill("Jane Guest");
  await form.locator("input[type=radio][value=yes]").check();
  await form.locator("button[type=submit]").click();
  await expect(page.getByText(/^Response/)).toBeVisible();

  await page.goto("/rsvp");
  await expect(page.getByText("Current response: Attending")).toBeVisible();
});
