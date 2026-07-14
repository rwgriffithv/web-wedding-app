import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { SessionSettingsForm } from "../session-settings-form";

vi.mock("../actions", () => ({
  saveSessionSettings: vi.fn(),
}));

describe("SessionSettingsForm", () => {
  it("renders session expiry input with default value", () => {
    render(<SessionSettingsForm sessionMaxHours="24" pageViewDebounceMinutes="15" />);
    expect(screen.getByLabelText("Session Expiry (hours)")).toHaveValue(24);
  });

  it("renders page view debounce input with default value", () => {
    render(<SessionSettingsForm sessionMaxHours="24" pageViewDebounceMinutes="15" />);
    expect(screen.getByLabelText("Page View Debounce (minutes)")).toHaveValue(15);
  });

  it("renders custom values", () => {
    render(<SessionSettingsForm sessionMaxHours="8" pageViewDebounceMinutes="30" />);
    expect(screen.getByLabelText("Session Expiry (hours)")).toHaveValue(8);
    expect(screen.getByLabelText("Page View Debounce (minutes)")).toHaveValue(30);
  });

  it("renders help text", () => {
    render(<SessionSettingsForm sessionMaxHours="24" pageViewDebounceMinutes="15" />);
    expect(screen.getByText(/Session expiry/)).toBeDefined();
    expect(screen.getByText(/Page view debounce/)).toBeDefined();
  });

  it("renders save button", () => {
    render(<SessionSettingsForm sessionMaxHours="24" pageViewDebounceMinutes="15" />);
    expect(screen.getByRole("button", { name: "Save" })).toBeDefined();
  });

  it("session expiry input has correct constraints", () => {
    render(<SessionSettingsForm sessionMaxHours="24" pageViewDebounceMinutes="15" />);
    const input = screen.getByLabelText("Session Expiry (hours)");
    expect(input).toHaveAttribute("min", "1");
    expect(input).toHaveAttribute("max", "24");
    expect(input).toHaveAttribute("type", "number");
  });

  it("page view debounce input has correct constraints", () => {
    render(<SessionSettingsForm sessionMaxHours="24" pageViewDebounceMinutes="15" />);
    const input = screen.getByLabelText("Page View Debounce (minutes)");
    expect(input).toHaveAttribute("min", "1");
    expect(input).toHaveAttribute("max", "1440");
    expect(input).toHaveAttribute("type", "number");
  });
});
