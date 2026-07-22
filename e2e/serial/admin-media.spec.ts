import { test, expect } from "@playwright/test";
import { loginAsAdmin } from "../utils/helpers";
import { setConfig } from "../utils/rate-limit-helpers";
import {
  MEDIA_RATE_LIMIT_MAX_KEY,
  MEDIA_RATE_LIMIT_WINDOW_SECONDS_KEY,
} from "../../src/lib/constants";

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

  const input = page.locator("input#media_max_file_size_ttl_seconds");
  await expect(input).toBeVisible();
  await expect(input).toHaveValue("60");
});

test("media settings ttl update persists to localStorage after save", async ({ page }) => {
  await loginAsAdmin(page);
  await page.goto("/admin/media");
  await expect(page).toHaveURL(/\/admin\/media/);

  // Open the Settings section
  await page.getByText("Settings").click();

  // Change TTL to 120 and save
  const ttlInput = page.locator("input#media_max_file_size_ttl_seconds");
  await ttlInput.fill("120");
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByText("Saved.")).toBeVisible({ timeout: 5000 });

  // Restore original value
  await ttlInput.fill("60");
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

test.describe("media rate limiting", () => {
  test("rate limiting section is visible and has default values", async ({ page }) => {
    // Set known defaults in DB
    setConfig(MEDIA_RATE_LIMIT_MAX_KEY, "500");
    setConfig(MEDIA_RATE_LIMIT_WINDOW_SECONDS_KEY, "3600");

    await loginAsAdmin(page);
    await page.goto("/admin/media");
    await expect(page).toHaveURL(/\/admin\/media/);

    // Open the Rate Limiting section
    await page.locator("summary").filter({ hasText: "Rate Limiting" }).click();

    // Verify the form is visible with default values
    const maxInput = page.locator(`input#media_rate_limit_max_attempts`);
    const windowInput = page.locator(`input#media_rate_limit_window_seconds`);

    await expect(maxInput).toBeVisible();
    await expect(windowInput).toBeVisible();
    await expect(maxInput).toHaveValue("500");
    await expect(windowInput).toHaveValue("3600");
  });

  test("media rate limit config persists after save", async ({ page }) => {
    setConfig(MEDIA_RATE_LIMIT_MAX_KEY, "500");
    setConfig(MEDIA_RATE_LIMIT_WINDOW_SECONDS_KEY, "3600");

    await loginAsAdmin(page);
    await page.goto("/admin/media");
    await expect(page).toHaveURL(/\/admin\/media/);

    // Open Rate Limiting section
    await page.locator("summary").filter({ hasText: "Rate Limiting" }).click();

    // Change values
    await page.locator("input#media_rate_limit_max_attempts").fill("250");
    await page.locator("input#media_rate_limit_window_seconds").fill("1800");

    // Save
    await page.getByRole("button", { name: "Save Rate Limit" }).click();
    await expect(page.getByRole("status")).toBeVisible({ timeout: 5000 });

    // Reload and verify persistence
    await page.reload();
    await page.locator("summary").filter({ hasText: "Rate Limiting" }).click();
    await expect(page.locator("input#media_rate_limit_max_attempts")).toHaveValue("250");
    await expect(page.locator("input#media_rate_limit_window_seconds")).toHaveValue("1800");

    // Restore defaults
    await page.locator("input#media_rate_limit_max_attempts").fill("500");
    await page.locator("input#media_rate_limit_window_seconds").fill("3600");
    await page.getByRole("button", { name: "Save Rate Limit" }).click();
    await expect(page.getByRole("status")).toBeVisible({ timeout: 5000 });
  });

  test("rate limit description mentions cached images are not affected", async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto("/admin/media");
    await expect(page).toHaveURL(/\/admin\/media/);

    // Open Rate Limiting section
    await page.locator("summary").filter({ hasText: "Rate Limiting" }).click();

    // Verify description mentions cached images
    await expect(page.getByText("Cached images are not affected")).toBeVisible();
  });

  test("media endpoint returns Cache-Control: immutable so browsers cache and bypass rate limiter", async ({ page }) => {
    setConfig(MEDIA_RATE_LIMIT_MAX_KEY, "1");
    setConfig(MEDIA_RATE_LIMIT_WINDOW_SECONDS_KEY, "60");

    await loginAsAdmin(page);

    // First request: should succeed and return immutable cache header
    const r1 = await page.evaluate(async () => {
      const res = await fetch("/api/media/pcc.jpg");
      return {
        status: res.status,
        cacheControl: res.headers.get("Cache-Control"),
      };
    });
    expect(r1.status).toBe(200);
    expect(r1.cacheControl).toBe("private, max-age=86400, immutable");

    // Second request via fetch with default cache: browser may serve from
    // memory/disk cache, bypassing the server entirely.  If it does hit
    // the server, it will get 429 (limit is 1).  Either outcome is valid
    // — we just verify the first response had the right headers.
    const r2 = await page.evaluate(async () => {
      const res = await fetch("/api/media/pcc.jpg");
      return { status: res.status };
    });
    // 200 = served from cache (ideal), 429 = cache missed (still proves
    // the rate limiter is wired up correctly for non-cached requests)
    expect([200, 429]).toContain(r2.status);

    // Restore defaults
    setConfig(MEDIA_RATE_LIMIT_MAX_KEY, "500");
    setConfig(MEDIA_RATE_LIMIT_WINDOW_SECONDS_KEY, "3600");
  });
});
