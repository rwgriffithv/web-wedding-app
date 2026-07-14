import { test, expect } from "@playwright/test";

test.describe.serial("RSVP flows", () => {
  test("party code login redirects to home, RSVP accessible", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Party Code" }).click();
    await page.fill("input[name=code]", "DEMO-1234");
    await page.getByRole("button", { name: "Continue with Party Code" }).click();
    await expect(page).toHaveURL(/\/home/);
    await page.goto("/rsvp");
    await expect(page.getByRole("heading", { name: "RSVP" })).toBeVisible();
    await expect(page.getByText("Party: Demo Family")).toBeVisible();
  });

  test("party can submit RSVP", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Party Code" }).click();
    await page.fill("input[name=code]", "DEMO-1234");
    await page.getByRole("button", { name: "Continue with Party Code" }).click();
    await expect(page).toHaveURL(/\/home/);
    await page.goto("/rsvp");

    const yesRadio = page.locator("input[type=radio][value=yes]").first();
    await expect(yesRadio).toBeEnabled({ timeout: 5000 });
    await yesRadio.check();
    await page.locator("button[type=submit]").first().click();
    await expect(page.getByText(/response submitted/i).or(page.getByText(/response updated/i))).toBeVisible();
  });

  test("radio state persists after submission without page reload", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Party Code" }).click();
    await page.fill("input[name=code]", "DEMO-1234");
    await page.getByRole("button", { name: "Continue with Party Code" }).click();
    await expect(page).toHaveURL(/\/home/);
    await page.goto("/rsvp");

    const member = page.locator(".rsvp-member").first();
    const yesRadio = member.locator("input[name^=attending_][value=yes]");
    const submitBtn = member.locator("button[type=submit]");

    await expect(yesRadio).toBeEnabled({ timeout: 5000 });
    await yesRadio.check();
    await submitBtn.click();
    await expect(member.getByText(/response submitted/i).or(member.getByText(/response updated/i))).toBeVisible();

    await expect(yesRadio).toBeChecked();

    const noRadio = member.locator("input[name^=attending_][value=no]");
    await noRadio.check();
    await submitBtn.click();
    await expect(member.getByText(/response updated/i)).toBeVisible();

    await expect(noRadio).toBeChecked();
    await expect(yesRadio).not.toBeChecked();
  });

  test("invalid party code shows error", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Party Code" }).click();
    await page.fill("input[name=code]", "INVALID-CODE");
    await page.getByRole("button", { name: "Continue with Party Code" }).click();
    await expect(page.getByText(/invalid party code/i)).toBeVisible();
  });

  test("existing RSVP shown on return", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Party Code" }).click();
    await page.fill("input[name=code]", "DEMO-1234");
    await page.getByRole("button", { name: "Continue with Party Code" }).click();
    await expect(page).toHaveURL(/\/home/);
    await page.goto("/rsvp");

    const yesRadio = page.locator("input[type=radio][value=yes]").first();
    await expect(yesRadio).toBeEnabled({ timeout: 5000 });
    await yesRadio.check();
    await page.locator("button[type=submit]").first().click();
    await expect(page.getByText(/response submitted/i).or(page.getByText(/response updated/i))).toBeVisible();

    await page.goto("/rsvp");
    await expect(page.getByText("Attending", { exact: true }).first()).toBeVisible();
  });

  test("RSVP form is locked when deadline is past", async ({ page }) => {
    // Set deadline as admin
    await page.goto("/login");
    await page.getByRole("button", { name: "User sign in" }).click();
    await page.fill("input[name=username]", "admin");
    await page.fill("input[name=password]", "admin");
    await page.locator("button[type=submit]").click();
    await expect(page).toHaveURL(/\/admin/);
    await page.goto("/admin/site");
    const deadlineInput = page.locator("input[name=rsvp_deadline]");
    await deadlineInput.fill("2020-01-01T00:00");
    await page.getByRole("button", { name: "Save" }).click();
    await expect(page.getByText(/saved/i)).toBeVisible();

    // Logout, login as party, verify locked
    await page.context().clearCookies();
    await page.goto("/");
    await page.fill("input[name=code]", "DEMO-1234");
    await page.getByRole("button", { name: "Continue with Party Code" }).click();
    await expect(page).toHaveURL(/\/home/);
    await page.goto("/rsvp");
    await expect(page.getByText(/rsvp is closed/i).first()).toBeVisible();
    await expect(page.locator("input[type=radio]").first()).toBeDisabled();

    // Cleanup: clear the deadline
    await page.context().clearCookies();
    await page.goto("/login");
    await page.getByRole("button", { name: "User sign in" }).click();
    await page.fill("input[name=username]", "admin");
    await page.fill("input[name=password]", "admin");
    await page.locator("button[type=submit]").click();
    await expect(page).toHaveURL(/\/admin/);
    await page.goto("/admin/site");
    await deadlineInput.clear();
    await page.getByRole("button", { name: "Save" }).click();
    await expect(page.getByText(/saved/i)).toBeVisible();
  });

  test("RSVP form is editable when no deadline is set", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Party Code" }).click();
    await page.fill("input[name=code]", "DEMO-1234");
    await page.getByRole("button", { name: "Continue with Party Code" }).click();
    await expect(page).toHaveURL(/\/home/);
    await page.goto("/rsvp");
    await expect(page.locator("input[type=radio]").first()).toBeEnabled();
    await expect(page.getByRole("button", { name: "Submit" }).first()).toBeVisible();
  });

  test("selecting No for attending disables plus-one fields", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Party Code" }).click();
    await page.fill("input[name=code]", "DEMO-1234");
    await page.getByRole("button", { name: "Continue with Party Code" }).click();
    await expect(page).toHaveURL(/\/home/);
    await page.goto("/rsvp");
    await expect(page.getByRole("heading", { name: "RSVP" })).toBeVisible();

    // Find the first rsvp-member (Jane Guest, can_bring_plus_one=1)
    const member = page.locator(".rsvp-member").first();
    await expect(member.getByText("Jane Guest")).toBeVisible();

    // Select "No" for attending (use name selector to avoid matching plus-one radios)
    const noRadio = member.locator("input[name^=attending_][value=no]");
    await noRadio.check();

    // Plus-one radios should be disabled
    const plusOneRadios = member.locator("input[name^=bring_plus_one]");
    await expect(plusOneRadios).toHaveCount(2);
    await expect(plusOneRadios.first()).toBeDisabled();
    await expect(plusOneRadios.last()).toBeDisabled();
  });

  test("selecting No for attending resets plus-one selection", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Party Code" }).click();
    await page.fill("input[name=code]", "DEMO-1234");
    await page.getByRole("button", { name: "Continue with Party Code" }).click();
    await expect(page).toHaveURL(/\/home/);
    await page.goto("/rsvp");
    await expect(page.getByRole("heading", { name: "RSVP" })).toBeVisible();

    const member = page.locator(".rsvp-member").first();
    await expect(member.getByText("Jane Guest")).toBeVisible();

    // Select "Yes" for attending first
    const yesRadio = member.locator("input[name^=attending_][value=yes]");
    await yesRadio.check();

    // Select "Yes" for plus-one
    const plusOneYes = member.locator("input[name^=bring_plus_one][value=yes]");
    await plusOneYes.check();
    await expect(plusOneYes).toBeChecked();

    // Now select "No" for attending
    const noRadio = member.locator("input[name^=attending_][value=no]");
    await noRadio.check();

    // Plus-one should be reset to "No"
    const plusOneNo = member.locator("input[name^=bring_plus_one][value=no]");
    await expect(plusOneNo).toBeChecked();
  });
});
