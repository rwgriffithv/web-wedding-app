import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { RsvpForm } from "./rsvp-form";

const mockSubmit = vi.fn();

vi.mock("./actions", () => ({
  submitRsvp: (...args: unknown[]) => mockSubmit(...args),
}));

function getRadio(name: string) {
  return screen.getByRole("radio", { name }) as HTMLInputElement;
}

function getSubmitButton() {
  return screen.getByRole("button", { name: /submit|update/i });
}

describe("RsvpForm — radio state persistence", () => {
  beforeEach(() => {
    mockSubmit.mockReset();
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
    expect(plusOneYesAfter.checked).toBe(true);
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
    expect(plusOneYes.checked).toBe(true);

    // Select attending No
    const attendNo = screen.getAllByRole("radio", { name: "No" })[0];
    fireEvent.click(attendNo);

    // Plus-one should be reset — the Yes radio for plus-one should be unchecked
    expect(plusOneYes.checked).toBe(false);
  });

  it("submit button disabled when plus-one=yes but name is empty", async () => {
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

    // Submit button should be disabled (no name entered)
    expect(getSubmitButton()).toBeDisabled();

    // Enter a name
    const nameInput = screen.getByPlaceholderText("Guest's name");
    fireEvent.change(nameInput, { target: { value: "Alice" } });

    // Submit button should now be enabled
    expect(getSubmitButton()).not.toBeDisabled();
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
    expect(attendYes.checked).toBe(true);
    expect(plusOneYes.checked).toBe(true);
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
    expect(attendYes.checked).toBe(true);
    expect(plusOneYes.checked).toBe(true);
  });
});
