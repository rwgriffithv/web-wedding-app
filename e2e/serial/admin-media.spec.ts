import { test, expect } from "@playwright/test";
import { loginAsAdmin } from "../utils/helpers";

test("media settings pre-populates localStorage from DB on page load", async ({ page }) => {
  await loginAsAdmin(page);
  await page.goto("/admin/media");
  await expect(page).toHaveURL(/\/admin\/media/);

  // Open the Settings section (starts collapsed)
  await page.getByText("Settings").click();

  // The input should have the seeded DB value (16)
  const input = page.locator("input#media_max_file_size_mb");
  await expect(input).toHaveValue("16");

  // localStorage should be seeded with the DB value (mount useEffect fires after render)
  const lsValue = await page.evaluate(() => {
    try { return JSON.parse(localStorage.getItem("media_max_file_size_mb") || "{}").value; }
    catch { return null; }
  });
  expect(lsValue).toBe(16);
});

test("media settings update propagates to localStorage after save", async ({ page }) => {
  await loginAsAdmin(page);
  await page.goto("/admin/media");
  await expect(page).toHaveURL(/\/admin\/media/);

  // Open the Settings section
  await page.getByText("Settings").click();

  const input = page.locator("input#media_max_file_size_mb");

  // Change the value and save
  await input.fill("32");
  await page.getByRole("button", { name: "Save" }).click();

  // Wait for save confirmation
  await expect(page.getByText("Saved.")).toBeVisible({ timeout: 5000 });

  // localStorage should now reflect the new value.
  // Use waitForFunction to poll because the post-save useEffect fires after paint.
  await page.waitForFunction(() => {
    try { return JSON.parse(localStorage.getItem("media_max_file_size_mb") || "{}").value === 32; }
    catch { return false; }
  }, { timeout: 5000 });

  // Restore the original value to avoid affecting other tests
  await input.fill("16");
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByText("Saved.")).toBeVisible({ timeout: 5000 });
  await page.waitForFunction(() => {
    try { return JSON.parse(localStorage.getItem("media_max_file_size_mb") || "{}").value === 16; }
    catch { return false; }
  }, { timeout: 5000 });
});

test("media settings shows cache duration field with default value", async ({ page }) => {
  await loginAsAdmin(page);
  await page.goto("/admin/media");
  await expect(page).toHaveURL(/\/admin\/media/);

  // Open the Settings section
  await page.getByText("Settings").click();

  const input = page.locator("input#media_max_file_size_ttl_ms");
  await expect(input).toBeVisible();
  await expect(input).toHaveValue("60000");
});

test("media settings ttl update persists to localStorage after save", async ({ page }) => {
  await loginAsAdmin(page);
  await page.goto("/admin/media");
  await expect(page).toHaveURL(/\/admin\/media/);

  // Open the Settings section
  await page.getByText("Settings").click();

  // Change TTL to 120000 and save
  const ttlInput = page.locator("input#media_max_file_size_ttl_ms");
  await ttlInput.fill("120000");
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByText("Saved.")).toBeVisible({ timeout: 5000 });

  // Restore original value
  await ttlInput.fill("60000");
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByText("Saved.")).toBeVisible({ timeout: 5000 });
});

test("media settings input has min and max constraints", async ({ page }) => {
  await loginAsAdmin(page);
  await page.goto("/admin/media");
  await expect(page).toHaveURL(/\/admin\/media/);

  // Open the Settings section
  await page.getByText("Settings").click();

  const input = page.locator("input#media_max_file_size_mb");
  await expect(input).toHaveAttribute("min", "0");
});

test("setting max file size to 0 blocks uploads", async ({ page }) => {
  await loginAsAdmin(page);
  await page.goto("/admin/media");

  // Open the Settings section
  await page.getByText("Settings").click();

  // Set max file size to 0 and save
  await page.locator("input#media_max_file_size_mb").fill("0");
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByText("Saved.")).toBeVisible({ timeout: 5000 });

  // Navigate to dress-code page where file uploads happen
  await page.getByRole("link", { name: "Dress Code" }).click();
  await expect(page).toHaveURL(/\/admin\/dress-code/);

  // Upload a file — should be blocked client-side since maxBytes is 0
  await page.locator('input[type="file"]').setInputFiles({
    name: "test.png",
    mimeType: "image/png",
    buffer: Buffer.from("fake-png-content"),
  });

  // Expect client-side error
  await expect(page.getByText(/exceeds 0 MB limit/i)).toBeVisible();

  // Restore the original value to avoid affecting other tests
  await page.getByRole("link", { name: "Media" }).click();
  await expect(page).toHaveURL(/\/admin\/media/);
  await page.getByText("Settings").click();
  await page.locator("input#media_max_file_size_mb").fill("16");
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByText("Saved.")).toBeVisible({ timeout: 5000 });
});
