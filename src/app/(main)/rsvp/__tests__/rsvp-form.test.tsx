import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { RsvpForm } from "../rsvp-form";
import { RateLimitContext } from "../rate-limit-context";
import { useRateLimitCooldown, type CooldownProps } from "@/lib/use-rate-limit-cooldown";
import type { ReactNode } from "react";

const mockSubmit = vi.fn();

vi.mock("../actions", () => ({
  submitRsvp: (...args: unknown[]) => mockSubmit(...args),
}));

function getSingleRadio(name: string) {
  return screen.getByRole("radio", { name }) as HTMLInputElement;
}

function getSingleSubmitButton() {
  return screen.getByRole("button", { name: /submit|update|please wait/i });
}

function createCooldown(overrides?: Partial<CooldownProps>): CooldownProps {
  return {
    cooldown: 0,
    isLimited: false,
    checkRateLimit: () => false,
    syncFromResponse: vi.fn(),
    ...overrides,
  };
}

function RenderWithCooldown({ children, cooldown }: { children: ReactNode; cooldown: CooldownProps }) {
  return <RateLimitContext.Provider value={cooldown}>{children}</RateLimitContext.Provider>;
}

function RealCooldownProvider({ children }: { children: ReactNode }) {
  const cooldown = useRateLimitCooldown("rl_r_until");
  return (
    <RateLimitContext.Provider value={cooldown}>
      {children}
    </RateLimitContext.Provider>
  );
}

function renderForm(
  props: Parameters<typeof RsvpForm>[0],
  cooldownOverrides?: Partial<CooldownProps>,
) {
  const cooldown = createCooldown(cooldownOverrides);
  return {
    ...render(
      <RenderWithCooldown cooldown={cooldown}>
        <RsvpForm {...props} />
      </RenderWithCooldown>,
    ),
    cooldown,
  };
}

describe("RsvpForm — radio state persistence", () => {
  beforeEach(() => {
    mockSubmit.mockReset();
    vi.useRealTimers();
    document.cookie = "rl_r_until=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/";
  });

  it("attending radio stays checked after successful submit", async () => {
    mockSubmit.mockResolvedValue({ success: true });

    renderForm({ memberId: 1, canBringPlusOne: false });
    const yes = getSingleRadio("Yes");

    fireEvent.click(yes);
    expect(yes.checked).toBe(true);

    fireEvent.submit(getSingleSubmitButton().closest("form")!);

    await waitFor(() => {
      expect(screen.getByText(/response submitted/i)).toBeVisible();
    });

    expect(yes.checked).toBe(true);
  });

  it("attending radio persists across two consecutive submits", async () => {
    mockSubmit.mockResolvedValue({ success: true });

    renderForm({ memberId: 1, canBringPlusOne: false });
    const yes = getSingleRadio("Yes");
    const no = getSingleRadio("No");
    const form = getSingleSubmitButton().closest("form")!;

    // First submit: Yes
    fireEvent.click(yes);
    fireEvent.submit(form);
    await waitFor(() => {
      expect(screen.getByText(/response submitted/i)).toBeVisible();
    });
    expect(yes.checked).toBe(true);

    // Second submit: switch to No
    fireEvent.click(no);
    fireEvent.submit(form);
    await waitFor(() => {
      expect(screen.getByText(/response updated/i)).toBeVisible();
    });
    expect(no.checked).toBe(true);
    expect(yes.checked).toBe(false);

    // Third submit: switch back to Yes
    fireEvent.click(yes);
    fireEvent.submit(form);
    await waitFor(() => {
      expect(screen.getByText(/response updated/i)).toBeVisible();
    });
    expect(yes.checked).toBe(true);
    expect(no.checked).toBe(false);
  });

  it("plus-one radio persists after submit with name", async () => {
    mockSubmit.mockResolvedValue({ success: true });

    renderForm({
      memberId: 1,
      canBringPlusOne: true,
      existingResponse: { guest_name: "Jane", attending: 1, plus_one_name: null },
    });

    // Select attending Yes and plus-one Yes
    const allYesRadios = screen.getAllByRole("radio", { name: "Yes" });
    const attendYes = allYesRadios[0];
    const plusOneYes = allYesRadios[1];
    fireEvent.click(attendYes);

    fireEvent.click(plusOneYes);

    // Fill in name
    const nameInput = screen.getByPlaceholderText("Guest's name");
    fireEvent.change(nameInput, { target: { value: "Alice" } });

    fireEvent.submit(getSingleSubmitButton().closest("form")!);

    await waitFor(() => {
      expect(screen.getByText(/response (submitted|updated)/i)).toBeVisible();
    });

    // Plus-one radio should still be "Yes"
    const plusOneYesAfter = screen.getAllByRole("radio", { name: "Yes" })[1];
    expect((plusOneYesAfter as HTMLInputElement).checked).toBe(true);
  });

  it("attending=no resets plus-one selection", async () => {
    mockSubmit.mockResolvedValue({ success: true });

    renderForm({
      memberId: 1,
      canBringPlusOne: true,
      existingResponse: { guest_name: "Jane", attending: 1, plus_one_name: "Bob" },
    });

    // Plus-one should start as Yes (from existing response)
    const plusOneYes = screen.getAllByRole("radio", { name: "Yes" })[1];
    expect((plusOneYes as HTMLInputElement).checked).toBe(true);

    // Select attending No
    const attendNo = screen.getAllByRole("radio", { name: "No" })[0];
    fireEvent.click(attendNo);

    // Plus-one should be reset — the Yes radio for plus-one should be unchecked
    expect((plusOneYes as HTMLInputElement).checked).toBe(false);
  });

  it("plus-one name input has required attribute for native validation", async () => {
    mockSubmit.mockResolvedValue({ success: true });

    renderForm({
      memberId: 1,
      canBringPlusOne: true,
      existingResponse: { guest_name: "Jane", attending: 1, plus_one_name: null },
    });

    // Select attending Yes and plus-one Yes
    const allYesRadios = screen.getAllByRole("radio", { name: "Yes" });
    fireEvent.click(allYesRadios[0]);
    fireEvent.click(allYesRadios[1]);

    // Submit button should be enabled (native required validation handles empty name)
    expect(getSingleSubmitButton()).not.toBeDisabled();

    // Plus-one name input should have required attribute
    const nameInput = screen.getByPlaceholderText("Guest's name");
    expect(nameInput).toBeRequired();
  });

  it("existing response pre-fills correct radio state", () => {
    mockSubmit.mockResolvedValue({ success: true });

    renderForm({
      memberId: 1,
      canBringPlusOne: true,
      existingResponse: { guest_name: "Jane", attending: 1, plus_one_name: "Bob" },
    });

    const attendYes = screen.getAllByRole("radio", { name: "Yes" })[0];
    const plusOneYes = screen.getAllByRole("radio", { name: "Yes" })[1];
    expect((attendYes as HTMLInputElement).checked).toBe(true);
    expect((plusOneYes as HTMLInputElement).checked).toBe(true);
    expect(screen.getByDisplayValue("Bob")).toBeDefined();
  });

  it("shows Update button when existing response exists", () => {
    mockSubmit.mockResolvedValue({ success: true });

    renderForm({
      memberId: 1,
      canBringPlusOne: false,
      existingResponse: { guest_name: "Jane", attending: 1, plus_one_name: null },
    });

    expect(screen.getByRole("button", { name: "Update" })).toBeDefined();
  });

  it("shows rate limit error when too many submissions", async () => {
    mockSubmit.mockResolvedValue({
      success: false,
      error: "Your party has made too many submissions. Please wait before trying again.",
      action: "cooldown",
      cooldownUntil: Date.now() + 60_000,
    });

    renderForm({ memberId: 1, canBringPlusOne: false });
    fireEvent.click(getSingleRadio("Yes"));
    fireEvent.submit(getSingleSubmitButton().closest("form")!);

    await waitFor(() => {
      expect(screen.getByText(/too many submissions/i)).toBeVisible();
    });
  });

  it("shows cooldown after rate limit error, then re-enables", { timeout: 15_000 }, async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });

    mockSubmit.mockResolvedValueOnce({
      success: false,
      error: "Your party has made too many submissions. Please wait before trying again.",
      action: "cooldown",
      cooldownUntil: Date.now() + 10_000,
    }).mockResolvedValueOnce({ success: true });

    render(
      <RealCooldownProvider>
        <RsvpForm memberId={1} canBringPlusOne={false} />
      </RealCooldownProvider>,
    );
    const yes = getSingleRadio("Yes");

    // First submit: rate limit error
    fireEvent.click(yes);
    fireEvent.submit(getSingleSubmitButton().closest("form")!);
    await waitFor(() => {
      expect(screen.getByText(/too many submissions/i)).toBeVisible();
    });

    // Button should be disabled during cooldown
    expect(getSingleSubmitButton()).toBeDisabled();
    expect(getSingleSubmitButton().textContent).toMatch(/please wait/i);

    // Wait for 10s cooldown to expire (shouldAdvanceTime lets real time tick the fake clock)
    await waitFor(() => {
      expect(getSingleSubmitButton()).not.toBeDisabled();
    }, { timeout: 12_000 });

    // Button re-enables, radio state retained
    expect(yes.checked).toBe(true);

    vi.useRealTimers();
  });

  it("displays server error without changing radio state", async () => {
    mockSubmit.mockResolvedValue({ success: false, error: "Please enter your plus-one's name." });

    renderForm({
      memberId: 1,
      canBringPlusOne: true,
      existingResponse: { guest_name: "Jane", attending: 1, plus_one_name: null },
    });

    const attendYes = screen.getAllByRole("radio", { name: "Yes" })[0];
    fireEvent.click(attendYes);

    const plusOneYes = screen.getAllByRole("radio", { name: "Yes" })[1];
    fireEvent.click(plusOneYes);

    // Submit with empty name — action should reject
    fireEvent.submit(getSingleSubmitButton().closest("form")!);

    await waitFor(() => {
      expect(screen.getByText(/please enter your plus-one/i)).toBeVisible();
    });

    // Radio should still be checked
    expect((attendYes as HTMLInputElement).checked).toBe(true);
    expect((plusOneYes as HTMLInputElement).checked).toBe(true);
  });

  it("shows rate limit error when cooldown is active without server response (page refresh)", () => {
    renderForm(
      { memberId: 1, canBringPlusOne: false },
      { cooldown: 55, isLimited: true, checkRateLimit: () => true },
    );

    expect(screen.getByText(/too many submissions/i)).toBeVisible();
    expect(getSingleSubmitButton()).toBeDisabled();
    expect(getSingleSubmitButton().textContent).toMatch(/please wait/i);
  });
});

describe("RsvpForm — shared cooldown across forms", () => {
  beforeEach(() => {
    mockSubmit.mockReset();
    vi.useRealTimers();
    document.cookie = "rl_r_until=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/";
  });

  it("rate limit on one form disables all sibling forms immediately", async () => {
    mockSubmit.mockResolvedValueOnce({
      success: false,
      error: "Your party has made too many submissions. Please wait before trying again.",
      action: "cooldown",
      cooldownUntil: Date.now() + 60_000,
    });

    render(
      <RealCooldownProvider>
        <RsvpForm memberId={1} canBringPlusOne={false} />
        <RsvpForm memberId={2} canBringPlusOne={false} />
      </RealCooldownProvider>,
    );

    const buttons = screen.getAllByRole("button", { name: /submit/i });
    expect(buttons).toHaveLength(2);
    expect(buttons[0]).not.toBeDisabled();
    expect(buttons[1]).not.toBeDisabled();

    // Submit first form — triggers rate limit
    const yesRadios = screen.getAllByRole("radio", { name: "Yes" });
    fireEvent.click(yesRadios[0]);
    fireEvent.submit(yesRadios[0].closest("form")!);

    await waitFor(() => {
      expect(screen.getAllByText(/too many submissions/i).length).toBeGreaterThanOrEqual(1);
    });

    // Both buttons should now be disabled
    const buttonsAfter = screen.getAllByRole("button", { name: /submit|please wait/i });
    expect(buttonsAfter[0]).toBeDisabled();
    expect(buttonsAfter[1]).toBeDisabled();
    expect(buttonsAfter[0].textContent).toMatch(/please wait/i);
    expect(buttonsAfter[1].textContent).toMatch(/please wait/i);
  });

  it("all forms re-enable after cooldown expires", { timeout: 15_000 }, async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });

    mockSubmit.mockResolvedValueOnce({
      success: false,
      error: "Your party has made too many submissions. Please wait before trying again.",
      action: "cooldown",
      cooldownUntil: Date.now() + 5_000,
    });

    render(
      <RealCooldownProvider>
        <RsvpForm memberId={1} canBringPlusOne={false} />
        <RsvpForm memberId={2} canBringPlusOne={false} />
      </RealCooldownProvider>,
    );

    // Submit first form — triggers rate limit
    const yesRadios = screen.getAllByRole("radio", { name: "Yes" });
    fireEvent.click(yesRadios[0]);
    fireEvent.submit(yesRadios[0].closest("form")!);

    await waitFor(() => {
      expect(screen.getAllByText(/too many submissions/i).length).toBeGreaterThanOrEqual(1);
    });

    // Both buttons disabled
    const getButtons = () => screen.getAllByRole("button", { name: /submit|please wait/i });
    expect(getButtons()[0]).toBeDisabled();
    expect(getButtons()[1]).toBeDisabled();

    // Wait for cooldown to expire
    await waitFor(() => {
      const btns = getButtons();
      expect(btns[0]).not.toBeDisabled();
      expect(btns[1]).not.toBeDisabled();
    }, { timeout: 8_000 });

    vi.useRealTimers();
  });
});
