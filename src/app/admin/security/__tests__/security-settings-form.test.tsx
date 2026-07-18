import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { SecuritySettingsForm } from "../security-settings-form";

vi.mock("../actions", () => ({
  saveSecuritySettings: vi.fn(),
}));

describe("SecuritySettingsForm", () => {
  const defaultProps = {
    autoBanThreshold: "5",
    autoBanWindowSeconds: "300",
    rateLimitMaxAttempts: "100",
    rateLimitWindowSeconds: "60",
    sessionMaxHours: "24",
    pageViewDebounceMinutes: "15",
    suspiciousIpThreshold: "10",
  };

  it("renders auto-ban threshold input with default value", () => {
    render(<SecuritySettingsForm {...defaultProps} />);
    expect(screen.getByLabelText("Auto-Ban Threshold (lockouts)")).toHaveValue(5);
  });

  it("renders auto-ban window input with default value", () => {
    render(<SecuritySettingsForm {...defaultProps} />);
    expect(screen.getByLabelText("Auto-Ban Window (seconds)")).toHaveValue(300);
  });

  it("renders rate limit max attempts input with default value", () => {
    render(<SecuritySettingsForm {...defaultProps} />);
    expect(screen.getByLabelText("Rate Limit Max Attempts")).toHaveValue(100);
  });

  it("renders rate limit window input with default value", () => {
    render(<SecuritySettingsForm {...defaultProps} />);
    expect(screen.getByLabelText("Rate Limit Window (seconds)")).toHaveValue(60);
  });

  it("renders session expiry input with default value", () => {
    render(<SecuritySettingsForm {...defaultProps} />);
    expect(screen.getByLabelText("Session Expiry (hours)")).toHaveValue(24);
  });

  it("renders page view debounce input with default value", () => {
    render(<SecuritySettingsForm {...defaultProps} />);
    expect(screen.getByLabelText("Page View Debounce (minutes)")).toHaveValue(15);
  });

  it("renders suspicious threshold input with default value", () => {
    render(<SecuritySettingsForm {...defaultProps} />);
    expect(screen.getByLabelText("Violation Threshold")).toHaveValue(10);
  });

  it("renders custom values", () => {
    render(<SecuritySettingsForm {...defaultProps} autoBanThreshold="10" sessionMaxHours="8" />);
    expect(screen.getByLabelText("Auto-Ban Threshold (lockouts)")).toHaveValue(10);
    expect(screen.getByLabelText("Session Expiry (hours)")).toHaveValue(8);
  });

  it("renders help text for auto-ban", () => {
    render(<SecuritySettingsForm {...defaultProps} />);
    expect(screen.getByText(/After N rate-limit lockouts/)).toBeDefined();
  });

  it("renders help text for rate limiting", () => {
    render(<SecuritySettingsForm {...defaultProps} />);
    expect(screen.getByText(/Rate limiting for login attempts/)).toBeDefined();
  });

  it("renders help text for session settings", () => {
    render(<SecuritySettingsForm {...defaultProps} />);
    expect(screen.getByText(/Session expiry: how long/)).toBeDefined();
  });

  it("renders help text for suspicious threshold", () => {
    render(<SecuritySettingsForm {...defaultProps} />);
    expect(screen.getByText(/Minimum violations to appear/)).toBeDefined();
  });

  it("renders single save button", () => {
    render(<SecuritySettingsForm {...defaultProps} />);
    expect(screen.getByRole("button", { name: "Save Changes" })).toBeDefined();
  });

  it("renders fieldset legends for sections", () => {
    render(<SecuritySettingsForm {...defaultProps} />);
    expect(screen.getByText("Login")).toBeDefined();
    expect(screen.getByText("Session & Tracking")).toBeDefined();
    expect(screen.getByText("Suspicious IPs")).toBeDefined();
  });

  it("auto-ban threshold input has correct constraints", () => {
    render(<SecuritySettingsForm {...defaultProps} />);
    const input = screen.getByLabelText("Auto-Ban Threshold (lockouts)");
    expect(input).toHaveAttribute("min", "1");
    expect(input).toHaveAttribute("max", "100");
    expect(input).toHaveAttribute("type", "number");
  });

  it("session expiry input has correct constraints", () => {
    render(<SecuritySettingsForm {...defaultProps} />);
    const input = screen.getByLabelText("Session Expiry (hours)");
    expect(input).toHaveAttribute("min", "1");
    expect(input).toHaveAttribute("max", "24");
    expect(input).toHaveAttribute("type", "number");
  });

  it("page view debounce input has correct constraints", () => {
    render(<SecuritySettingsForm {...defaultProps} />);
    const input = screen.getByLabelText("Page View Debounce (minutes)");
    expect(input).toHaveAttribute("min", "0");
    expect(input).toHaveAttribute("max", "1440");
    expect(input).toHaveAttribute("type", "number");
  });

  it("suspicious threshold input has correct constraints", () => {
    render(<SecuritySettingsForm {...defaultProps} />);
    const input = screen.getByLabelText("Violation Threshold");
    expect(input).toHaveAttribute("min", "1");
    expect(input).toHaveAttribute("max", "100");
    expect(input).toHaveAttribute("type", "number");
  });
});
