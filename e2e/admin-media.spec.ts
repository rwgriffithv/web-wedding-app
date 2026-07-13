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

  // Fill URL and title
  await page.fill("input[name=url]", "https://example.com/e2e-photo.jpg");
  await page.fill("input[name=title]", "E2E Test Photo");

  // Select existing tab from SearchableSelect by opening dropdown and picking first option
  const tabInput = page.locator(".searchable-select-input").first();
  await tabInput.click();
  await page.waitForTimeout(300);
  const firstOption = page.locator(".searchable-select-item[role=option]").first();
  if (await firstOption.isVisible({ timeout: 2000 }).catch(() => false)) {
    await firstOption.click();
  }

  // Close any open dropdowns
  await page.keyboard.press("Escape");
  await page.waitForTimeout(200);

  await page.getByRole("button", { name: "Add Media" }).click({ timeout: 5000 });
  await expect(page.getByText("Media added.")).toBeVisible();

  // Verify in media list
  await expect(page.getByText("E2E Test Photo")).toBeVisible();

  // Delete the media item
  page.on('dialog', dialog => dialog.accept());
  const mediaRow = page.locator(".admin-list-item").filter({ hasText: "E2E Test Photo" });
  await mediaRow.getByRole("button", { name: "Delete" }).click();
  await expect(page.getByText("E2E Test Photo")).not.toBeVisible();
});
