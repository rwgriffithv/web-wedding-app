import { test, expect } from "@playwright/test";
import { loginAsParty, loginAsAdmin } from "./helpers";

test("help page requires auth", async ({ page }) => {
  await page.goto("/help");
  await expect(page).toHaveURL("/login");
});

test("help page shows FAQ tab by default", async ({ page }) => {
  await loginAsParty(page);
  await page.goto("/help");
  await expect(page.getByRole("heading", { name: "Help" })).toBeVisible();
  await expect(page.locator("#help-panel-faq")).toBeVisible();
});

test("help page can switch to My Questions tab", async ({ page }) => {
  await loginAsParty(page);
  await page.goto("/help");
  await page.getByRole("tab", { name: "My Questions" }).click();
  await expect(page).toHaveURL(/tab=my-questions/);
  await expect(page.locator("#help-panel-my-questions")).toBeVisible();
});

test("help page active tab is highlighted", async ({ page }) => {
  await loginAsParty(page);
  await page.goto("/help?tab=my-questions");
  const myQuestionsTab = page.getByRole("tab", { name: "My Questions" });
  await expect(myQuestionsTab).toHaveAttribute("aria-selected", "true");
});

test("help link is visible in secondary nav", async ({ page }) => {
  await loginAsParty(page);
  await page.goto("/home");
  await expect(page.getByRole("link", { name: "Help" })).toBeVisible();
});

test("admin help page is accessible", async ({ page }) => {
  await loginAsAdmin(page);
  await page.goto("/admin/help");
  await expect(page.getByRole("heading", { name: "Help" })).toBeVisible();
  await expect(page.getByText("Manage FAQ and view party questions.")).toBeVisible();
});

test("admin can add FAQ item", async ({ page }) => {
  await loginAsAdmin(page);
  await page.goto("/admin/help");

  await page.fill("#faq_question", "What should I wear?");
  await page.fill("#faq_answer", "Semi-formal attire is recommended.");
  await page.getByRole("button", { name: "Add FAQ Item" }).click();

  await expect(page.getByText("What should I wear?").first()).toBeVisible();
  await expect(page.getByText("Semi-formal attire is recommended.").first()).toBeVisible();
});

test("admin help page has FAQ and Questions sections", async ({ page }) => {
  await loginAsAdmin(page);
  await page.goto("/admin/help");
  await expect(page.getByRole("heading", { name: "Help" })).toBeVisible();
  await expect(page.getByText("Manage FAQ and view party questions.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Add FAQ Item" })).toBeVisible();
});

test("party user can submit a question", async ({ page }) => {
  await loginAsParty(page);
  await page.goto("/help?tab=my-questions");

  await page.fill("#question_text", "Is there parking available?");
  await page.getByRole("button", { name: "Submit Question" }).click();

  await expect(page.getByText("Question submitted!")).toBeVisible();
  await expect(page.locator(".faq-item").filter({ hasText: "Is there parking available?" }).first()).toBeVisible();
});
