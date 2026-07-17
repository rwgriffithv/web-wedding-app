import { test, expect } from "@playwright/test";
import { loginAsParty } from "../utils/helpers";

test("login page loads with title", async ({ page }) => {
  await page.goto("/login");
  await expect(page.locator("h1")).toHaveText("We're Getting Married!");
});

test("redirects to login when accessing home without auth", async ({ page }) => {
  await page.goto("/home");
  await expect(page).toHaveURL("/login");
});

test("login with valid credentials redirects to home", async ({ page }) => {
  await page.goto("/login");
  await page.getByRole("button", { name: "User sign in" }).click();
  await page.fill("input[name=username]", "DEMO-1234");
  await page.fill("input[name=password]", "DEMO-1234");
  await page.locator("button[type=submit]").click();
  await page.waitForURL(/\/home/, { timeout: 10000 });
});

test("login with invalid credentials shows error", async ({ page }) => {
  await page.goto("/login");
  await page.getByRole("button", { name: "User sign in" }).click();
  await page.fill("input[name=username]", "wrong");
  await page.fill("input[name=password]", "wrong");
  await page.locator("button[type=submit]").click();
  await expect(page.getByText("Invalid username or password.")).toBeVisible();
});

test("home page displays title, formatted date, location, and schedule range", async ({ page }) => {
  await loginAsParty(page);

  // Title is present
  await expect(page.locator(".home-content h1")).toHaveText("Our Wedding");

  // Formatted date is present (seed date is August 15, 2026)
  await expect(page.getByText(/August 15, 2026/)).toBeVisible();

  // Location is present (seed location)
  await expect(page.getByText("Venue Name, City")).toBeVisible();

  // Schedule range is present (seed schedule: 3:00 PM – 9:00 PM)
  await expect(page.getByText("3:00 PM – 9:00 PM")).toBeVisible();
});

test("home page content order: date before location before schedule", async ({ page }) => {
  await loginAsParty(page);

  const content = page.locator(".home-content");
  const dateEl = content.getByText(/August 15, 2026/);
  const locationEl = content.getByText("Venue Name, City");
  const scheduleEl = content.getByText("3:00 PM – 9:00 PM");

  // Date appears before location
  const dateBox = await dateEl.boundingBox();
  const locationBox = await locationEl.boundingBox();
  expect(dateBox).not.toBeNull();
  expect(locationBox).not.toBeNull();
  expect(dateBox!.y).toBeLessThan(locationBox!.y);

  // Location appears before schedule range
  const scheduleBox = await scheduleEl.boundingBox();
  expect(scheduleBox).not.toBeNull();
  expect(locationBox!.y).toBeLessThan(scheduleBox!.y);
});
