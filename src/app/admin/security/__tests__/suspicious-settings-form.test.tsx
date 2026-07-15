import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { SuspiciousSettingsForm } from "../suspicious-settings-form";

vi.mock("../actions", () => ({
  saveSuspiciousSettings: vi.fn(),
}));

describe("SuspiciousSettingsForm", () => {
  it("renders threshold input with default value", () => {
    render(<SuspiciousSettingsForm threshold="10" />);
    const input = screen.getByLabelText("Violation Threshold");
    expect(input).toBeDefined();
    expect((input as HTMLInputElement).value).toBe("10");
  });

  it("renders help text describing the threshold", () => {
    render(<SuspiciousSettingsForm threshold="10" />);
    expect(screen.getByText(/Minimum violations to appear/)).toBeDefined();
  });

  it("renders save button", () => {
    render(<SuspiciousSettingsForm threshold="10" />);
    expect(screen.getByRole("button", { name: "Save" })).toBeDefined();
  });

  it("renders input with correct constraints", () => {
    render(<SuspiciousSettingsForm threshold="5" />);
    const input = screen.getByLabelText("Violation Threshold");
    expect((input as HTMLInputElement).min).toBe("1");
    expect((input as HTMLInputElement).max).toBe("100");
  });
});
