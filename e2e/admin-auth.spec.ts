import { test, expect } from "@playwright/test";
import { loginAsAdmin } from "./helpers";

test("redirects to login when accessing admin without auth", async ({ page }) => {
  await page.goto("/admin");
  await expect(page).toHaveURL("/login");
});

test("login with admin credentials redirects to admin", async ({ page }) => {
  await loginAsAdmin(page);
});

test("admin dashboard shows stats and rsvp table", async ({ page }) => {
  await loginAsAdmin(page);
  await expect(page.locator(".stat-row")).toHaveCount(5);
  await expect(page.getByRole("heading", { name: "Invited" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Expected" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Confirmed" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Help Questions" })).toBeVisible();
  await expect(page.getByRole("table")).toBeVisible();
});

test("admin sidebar has all management links", async ({ page }) => {
  await loginAsAdmin(page);
  await expect(page.getByRole("link", { name: "Home" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Guests" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Lodging" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Dress Code" })).toBeVisible();
  await expect(page.getByRole("link", { name: "RSVP" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Media" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Help" })).toBeVisible();
});
