import { test, expect } from "@playwright/test";
import { loginAsAdmin } from "../utils/helpers";
import { setConfig } from "../utils/rate-limit-helpers";
import {
  RSVP_RATE_LIMIT_MAX_KEY,
  RSVP_RATE_LIMIT_WINDOW_SECONDS_KEY,
} from "../../src/lib/constants";

test.describe("admin rsvp rate limiting", () => {
  test("rate limiting section is visible and has default values", async ({ page }) => {
    setConfig(RSVP_RATE_LIMIT_MAX_KEY, "10");
    setConfig(RSVP_RATE_LIMIT_WINDOW_SECONDS_KEY, "60");

    await loginAsAdmin(page);
    await page.goto("/admin/rsvp");
    await expect(page).toHaveURL(/\/admin\/rsvp/);

    await page.locator("summary").filter({ hasText: "Rate Limiting" }).click();

    const maxInput = page.locator("input#rsvp_rate_limit_max_attempts");
    const windowInput = page.locator("input#rsvp_rate_limit_window_seconds");

    await expect(maxInput).toBeVisible();
    await expect(windowInput).toBeVisible();
    await expect(maxInput).toHaveValue("10");
    await expect(windowInput).toHaveValue("60");
  });

  test("rsvp rate limit config persists after save", async ({ page }) => {
    setConfig(RSVP_RATE_LIMIT_MAX_KEY, "10");
    setConfig(RSVP_RATE_LIMIT_WINDOW_SECONDS_KEY, "60");

    await loginAsAdmin(page);
    await page.goto("/admin/rsvp");
    await expect(page).toHaveURL(/\/admin\/rsvp/);

    await page.locator("summary").filter({ hasText: "Rate Limiting" }).click();

    await page.locator("input#rsvp_rate_limit_max_attempts").fill("20");
    await page.locator("input#rsvp_rate_limit_window_seconds").fill("120");

    await page.getByRole("button", { name: "Save Rate Limit" }).click();
    await expect(page.getByRole("status")).toBeVisible({ timeout: 5000 });

    await page.reload();
    await page.locator("summary").filter({ hasText: "Rate Limiting" }).click();
    await expect(page.locator("input#rsvp_rate_limit_max_attempts")).toHaveValue("20");
    await expect(page.locator("input#rsvp_rate_limit_window_seconds")).toHaveValue("120");

    await page.locator("input#rsvp_rate_limit_max_attempts").fill("10");
    await page.locator("input#rsvp_rate_limit_window_seconds").fill("60");
    await page.getByRole("button", { name: "Save Rate Limit" }).click();
    await expect(page.getByRole("status")).toBeVisible({ timeout: 5000 });
  });
});
