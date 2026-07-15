import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { RsvpForm } from "../rsvp-form";

const mockSubmit = vi.fn();

vi.mock("../actions", () => ({
  submitRsvp: (...args: unknown[]) => mockSubmit(...args),
}));

function getRadio(name: string) {
  return screen.getByRole("radio", { name }) as HTMLInputElement;
}

function getSubmitButton() {
  return screen.getByRole("button", { name: /submit|update|please wait/i });
}

describe("RsvpForm — radio state persistence", () => {
  beforeEach(() => {
    mockSubmit.mockReset();
    vi.useRealTimers();
    document.cookie = "rl_r_until=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/";
  });

  it("attending radio stays checked after successful submit", async () => {
    mockSubmit.mockResolvedValue({ success: true });

    render(<RsvpForm memberId={1} canBringPlusOne={false} />);
    const yes = getRadio("Yes");

    fireEvent.click(yes);
    expect(yes.checked).toBe(true);

    fireEvent.submit(getSubmitButton().closest("form")!);

    await waitFor(() => {
      expect(screen.getByText(/response submitted/i)).toBeVisible();
    });

    expect(yes.checked).toBe(true);
  });

  it("attending radio persists across two consecutive submits", async () => {
    mockSubmit.mockResolvedValue({ success: true });

    render(<RsvpForm memberId={1} canBringPlusOne={false} />);
    const yes = getRadio("Yes");
    const no = getRadio("No");
    const form = getSubmitButton().closest("form")!;

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

    render(
      <RsvpForm
        memberId={1}
        canBringPlusOne={true}
        existingResponse={{ guest_name: "Jane", attending: 1, plus_one_name: null }}
      />
    );

    // Select attending Yes and plus-one Yes
    const allYesRadios = screen.getAllByRole("radio", { name: "Yes" });
    const attendYes = allYesRadios[0];
    const plusOneYes = allYesRadios[1];
    fireEvent.click(attendYes);

    fireEvent.click(plusOneYes);

    // Fill in name
    const nameInput = screen.getByPlaceholderText("Guest's name");
    fireEvent.change(nameInput, { target: { value: "Alice" } });

    fireEvent.submit(getSubmitButton().closest("form")!);

    await waitFor(() => {
      expect(screen.getByText(/response (submitted|updated)/i)).toBeVisible();
    });

    // Plus-one radio should still be "Yes"
    const plusOneYesAfter = screen.getAllByRole("radio", { name: "Yes" })[1];
    expect((plusOneYesAfter as HTMLInputElement).checked).toBe(true);
  });

  it("attending=no resets plus-one selection", async () => {
    mockSubmit.mockResolvedValue({ success: true });

    render(
      <RsvpForm
        memberId={1}
        canBringPlusOne={true}
        existingResponse={{ guest_name: "Jane", attending: 1, plus_one_name: "Bob" }}
      />
    );

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

    render(
      <RsvpForm
        memberId={1}
        canBringPlusOne={true}
        existingResponse={{ guest_name: "Jane", attending: 1, plus_one_name: null }}
      />
    );

    // Select attending Yes and plus-one Yes
    const allYesRadios = screen.getAllByRole("radio", { name: "Yes" });
    fireEvent.click(allYesRadios[0]);
    fireEvent.click(allYesRadios[1]);

    // Submit button should be enabled (native required validation handles empty name)
    expect(getSubmitButton()).not.toBeDisabled();

    // Plus-one name input should have required attribute
    const nameInput = screen.getByPlaceholderText("Guest's name");
    expect(nameInput).toBeRequired();
  });

  it("existing response pre-fills correct radio state", () => {
    mockSubmit.mockResolvedValue({ success: true });

    render(
      <RsvpForm
        memberId={1}
        canBringPlusOne={true}
        existingResponse={{ guest_name: "Jane", attending: 1, plus_one_name: "Bob" }}
      />
    );

    const attendYes = screen.getAllByRole("radio", { name: "Yes" })[0];
    const plusOneYes = screen.getAllByRole("radio", { name: "Yes" })[1];
    expect((attendYes as HTMLInputElement).checked).toBe(true);
    expect((plusOneYes as HTMLInputElement).checked).toBe(true);
    expect(screen.getByDisplayValue("Bob")).toBeDefined();
  });

  it("shows Update button when existing response exists", () => {
    mockSubmit.mockResolvedValue({ success: true });

    render(
      <RsvpForm
        memberId={1}
        canBringPlusOne={false}
        existingResponse={{ guest_name: "Jane", attending: 1, plus_one_name: null }}
      />
    );

    expect(screen.getByRole("button", { name: "Update" })).toBeDefined();
  });

  it("shows rate limit error when too many submissions", async () => {
    mockSubmit.mockResolvedValue({
      success: false,
      error: "Your party has made too many submissions. Please wait before trying again.",
      action: "cooldown",
      cooldownUntil: Date.now() + 60_000,
    });

    render(<RsvpForm memberId={1} canBringPlusOne={false} />);
    fireEvent.click(getRadio("Yes"));
    fireEvent.submit(getSubmitButton().closest("form")!);

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

    render(<RsvpForm memberId={1} canBringPlusOne={false} />);
    const yes = getRadio("Yes");

    // First submit: rate limit error
    fireEvent.click(yes);
    fireEvent.submit(getSubmitButton().closest("form")!);
    await waitFor(() => {
      expect(screen.getByText(/too many submissions/i)).toBeVisible();
    });

    // Button should be disabled during cooldown
    expect(getSubmitButton()).toBeDisabled();
    expect(getSubmitButton().textContent).toMatch(/please wait/i);

    // Wait for 10s cooldown to expire (shouldAdvanceTime lets real time tick the fake clock)
    await waitFor(() => {
      expect(getSubmitButton()).not.toBeDisabled();
    }, { timeout: 12_000 });

    // Button re-enables, radio state retained
    expect(yes.checked).toBe(true);

    vi.useRealTimers();
  });

  it("displays server error without changing radio state", async () => {
    mockSubmit.mockResolvedValue({ success: false, error: "Please enter your plus-one's name." });

    render(
      <RsvpForm
        memberId={1}
        canBringPlusOne={true}
        existingResponse={{ guest_name: "Jane", attending: 1, plus_one_name: null }}
      />
    );

    const attendYes = screen.getAllByRole("radio", { name: "Yes" })[0];
    fireEvent.click(attendYes);

    const plusOneYes = screen.getAllByRole("radio", { name: "Yes" })[1];
    fireEvent.click(plusOneYes);

    // Submit with empty name — action should reject
    fireEvent.submit(getSubmitButton().closest("form")!);

    await waitFor(() => {
      expect(screen.getByText(/please enter your plus-one/i)).toBeVisible();
    });

    // Radio should still be checked
    expect((attendYes as HTMLInputElement).checked).toBe(true);
    expect((plusOneYes as HTMLInputElement).checked).toBe(true);
  });

  it("shows rate limit error when cooldown is active without server response (page refresh)", () => {
    const futureTime = Date.now() + 60_000;
    document.cookie = `rl_r_until=${futureTime}; path=/; max-age=60`;

    render(<RsvpForm memberId={1} canBringPlusOne={false} />);

    expect(screen.getByText(/too many submissions/i)).toBeVisible();
    expect(getSubmitButton()).toBeDisabled();
    expect(getSubmitButton().textContent).toMatch(/please wait/i);
  });

  it("uses shared cooldownProps when provided instead of creating own hook", async () => {
    mockSubmit.mockResolvedValue({
      success: false,
      error: "Too many.",
      action: "cooldown",
      cooldownUntil: Date.now() + 60_000,
    });

    const shared = {
      cooldown: 0,
      isLimited: false,
      checkRateLimit: () => false,
      syncFromResponse: vi.fn(),
    };

    render(<RsvpForm memberId={1} canBringPlusOne={false} cooldownProps={shared} />);
    fireEvent.click(getRadio("Yes"));
    fireEvent.submit(getSubmitButton().closest("form")!);

    await waitFor(() => {
      expect(shared.syncFromResponse).toHaveBeenCalled();
    });
  });
});
