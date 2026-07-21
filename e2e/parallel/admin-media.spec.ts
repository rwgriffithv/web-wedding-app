import { test, expect } from "@playwright/test";
import { loginAsAdmin } from "../utils/helpers";

test("admin can add and remove media items", async ({ page }) => {
  await loginAsAdmin(page);

  // Navigate to media
  await page.getByRole("link", { name: "Media" }).click();
  await expect(page).toHaveURL(/\/admin\/media/);

  // Fill URL and title
  await page.fill("input[name=url]", "https://example.com/e2e-photo.jpg");
  await page.fill("input[name=title]", "E2E Test Photo");

  // Select existing tab from SearchableSelect by opening dropdown and picking first option
  const tabInput = page.locator(".searchable-select-input").first();
  await tabInput.click();
  const firstOption = page.locator(".searchable-select-item[role=option]").first();
  await firstOption.waitFor({ state: "visible", timeout: 2000 }).catch(() => {});
  if (await firstOption.isVisible()) {
    await firstOption.click();
  }

  // Close any open dropdowns
  await page.keyboard.press("Escape");

  await page.getByRole("button", { name: "Add Media" }).click({ timeout: 5000 });
  await expect(page.getByText("Media added.")).toBeVisible();

  // Verify in media list
  await expect(page.getByText("E2E Test Photo")).toBeVisible();

  // Delete the media item
  page.on("dialog", (dialog) => dialog.accept());
  const mediaRow = page.locator(".admin-list-item").filter({ hasText: "E2E Test Photo" });
  await mediaRow.getByRole("button", { name: "Delete" }).click();
  await expect(page.getByText("E2E Test Photo")).not.toBeVisible();
});


