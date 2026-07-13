import { test, expect } from "@playwright/test";

test("admin can create and manage lodging options", async ({ page }) => {
  // Login as admin
  await page.goto("/");
  await page.getByRole("button", { name: "User sign in" }).click();
  await page.fill("input[name=username]", "admin");
  await page.fill("input[name=password]", "admin");
  await page.locator("button[type=submit]").click();
  await expect(page).toHaveURL(/\/admin/);

  // Navigate to lodging
  await page.getByRole("link", { name: "Lodging" }).click();
  await expect(page).toHaveURL(/\/admin\/lodging/);

  // Create a lodging option
  await page.fill("input[name=title]", "E2E Hotel");
  await page.fill("input[name=image_url]", "https://example.com/hotel.jpg");
  await page.fill("input[name=url]", "https://example.com/e2e-hotel");
  await page.getByRole("button", { name: "Add Option" }).click();
  await expect(page.getByText("Option added.")).toBeVisible();

  // Verify in lodging list
  await expect(page.getByText("E2E Hotel")).toBeVisible();

  // Delete the lodging option
  page.on('dialog', dialog => dialog.accept());
  const lodgingRow = page.locator(".admin-list-item").filter({ hasText: "E2E Hotel" });
  await lodgingRow.getByRole("button", { name: "Delete" }).click();
  await expect(page.getByText("E2E Hotel")).not.toBeVisible();
});

test("admin can create and delete schedule items", async ({ page }) => {
  // Login as admin
  await page.goto("/");
  await page.getByRole("button", { name: "User sign in" }).click();
  await page.fill("input[name=username]", "admin");
  await page.fill("input[name=password]", "admin");
  await page.locator("button[type=submit]").click();
  await expect(page).toHaveURL(/\/admin/);

  // Navigate to schedule
  await page.getByRole("link", { name: "Schedule" }).click();
  await expect(page).toHaveURL(/\/admin\/schedule/);

  // Create a schedule item
  await page.fill("input[name=time]", "1:00 PM");
  await page.fill("input[name=label]", "E2E Test Event");
  await page.getByRole("button", { name: "Add Item" }).click();
  await expect(page.getByText("Item added.")).toBeVisible();

  // Verify in schedule list
  await expect(page.getByText("E2E Test Event")).toBeVisible();

  // Delete the schedule item
  page.on('dialog', dialog => dialog.accept());
  const scheduleRow = page.locator(".admin-list-item").filter({ hasText: "E2E Test Event" });
  await scheduleRow.getByRole("button", { name: "Delete" }).click();
  await expect(page.getByText("E2E Test Event")).not.toBeVisible();
});
