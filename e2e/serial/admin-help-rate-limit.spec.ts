import { test, expect } from "@playwright/test";
import { loginAsAdmin } from "../utils/helpers";
import { setConfig } from "../utils/rate-limit-helpers";
import {
  QUESTION_RATE_LIMIT_MAX_KEY,
  QUESTION_RATE_LIMIT_WINDOW_SECONDS_KEY,
} from "../../src/lib/constants";

test.describe("admin help rate limiting", () => {
  test("rate limiting section is visible and has default values", async ({ page }) => {
    setConfig(QUESTION_RATE_LIMIT_MAX_KEY, "5");
    setConfig(QUESTION_RATE_LIMIT_WINDOW_SECONDS_KEY, "60");

    await loginAsAdmin(page);
    await page.goto("/admin/help");
    await expect(page).toHaveURL(/\/admin\/help/);

    await page.locator("summary").filter({ hasText: "Rate Limiting" }).click();

    const maxInput = page.locator("input#question_rate_limit_max_attempts");
    const windowInput = page.locator("input#question_rate_limit_window_seconds");

    await expect(maxInput).toBeVisible();
    await expect(windowInput).toBeVisible();
    await expect(maxInput).toHaveValue("5");
    await expect(windowInput).toHaveValue("60");
  });

  test("help rate limit config persists after save", async ({ page }) => {
    setConfig(QUESTION_RATE_LIMIT_MAX_KEY, "5");
    setConfig(QUESTION_RATE_LIMIT_WINDOW_SECONDS_KEY, "60");

    await loginAsAdmin(page);
    await page.goto("/admin/help");
    await expect(page).toHaveURL(/\/admin\/help/);

    await page.locator("summary").filter({ hasText: "Rate Limiting" }).click();

    await page.locator("input#question_rate_limit_max_attempts").fill("3");
    await page.locator("input#question_rate_limit_window_seconds").fill("120");

    await page.getByRole("button", { name: "Save Rate Limit" }).click();
    await expect(page.getByRole("status")).toBeVisible({ timeout: 5000 });

    await page.reload();
    await page.locator("summary").filter({ hasText: "Rate Limiting" }).click();
    await expect(page.locator("input#question_rate_limit_max_attempts")).toHaveValue("3");
    await expect(page.locator("input#question_rate_limit_window_seconds")).toHaveValue("120");

    await page.locator("input#question_rate_limit_max_attempts").fill("5");
    await page.locator("input#question_rate_limit_window_seconds").fill("60");
    await page.getByRole("button", { name: "Save Rate Limit" }).click();
    await expect(page.getByRole("status")).toBeVisible({ timeout: 5000 });
  });
});
