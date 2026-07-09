import { test, expect } from "@playwright/test";

test("admin can add and remove media items", async ({ page }) => {
  // Login as admin
  await page.goto("/");
  await page.getByRole("button", { name: "User sign in" }).click();
  await page.fill("input[name=username]", "admin");
  await page.fill("input[name=password]", "admin");
  await page.locator("button[type=submit]").click();
  await expect(page).toHaveURL(/\/admin/);

  // Navigate to media
  await page.getByRole("link", { name: "Media" }).click();
  await expect(page).toHaveURL(/\/admin\/media/);

  // Create a media item
  await page.selectOption("select[name=type]", "image");
  await page.fill("input[name=url]", "https://example.com/e2e-photo.jpg");
  await page.fill("input[name=title]", "E2E Test Photo");
  await page.fill("input[name=section]", "E2E Test");
  await page.getByRole("button", { name: "Add Media" }).click();
  await expect(page.getByText("Media added.")).toBeVisible();

  // Verify in media list
  await expect(page.getByText("E2E Test Photo")).toBeVisible();

  // Delete the media item
  page.on('dialog', dialog => dialog.accept());
  const mediaRow = page.locator(".admin-list-item").filter({ hasText: "E2E Test Photo" });
  await mediaRow.getByRole("button", { name: "Delete" }).click();
  await expect(page.getByText("E2E Test Photo")).not.toBeVisible();
});
