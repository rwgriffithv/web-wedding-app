import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { RateLimitForm } from "../rate-limit-form/rate-limit-form";

vi.mock("../rate-limit-form/actions", () => ({
  saveRateLimitConfig: vi.fn(),
}));

describe("RateLimitForm", () => {
  const baseConfig: Record<string, string> = {};

  it("uses constant defaults when no props or config values provided", () => {
    render(
      <RateLimitForm
        config={baseConfig}
        maxKey="rate_limit_max_attempts"
        windowKey="rate_limit_window_seconds"
        description="Test description"
      />,
    );
    expect(screen.getByLabelText("Max Attempts (per window)")).toHaveValue(5);
    expect(screen.getByLabelText("Window (seconds)")).toHaveValue(60);
  });

  it("uses custom defaults when provided", () => {
    render(
      <RateLimitForm
        config={baseConfig}
        maxKey="rsvp_rate_limit_max"
        windowKey="rsvp_rate_limit_window"
        maxDefault="10"
        windowDefault="300"
        description="Test description"
      />,
    );
    expect(screen.getByLabelText("Max Attempts (per window)")).toHaveValue(10);
    expect(screen.getByLabelText("Window (seconds)")).toHaveValue(300);
  });

  it("prefers config values over defaults", () => {
    const config = {
      rate_limit_max_attempts: "15",
      rate_limit_window_seconds: "120",
    };
    render(
      <RateLimitForm
        config={config}
        maxKey="rate_limit_max_attempts"
        windowKey="rate_limit_window_seconds"
        description="Test description"
      />,
    );
    expect(screen.getByLabelText("Max Attempts (per window)")).toHaveValue(15);
    expect(screen.getByLabelText("Window (seconds)")).toHaveValue(120);
  });

  it("config overrides custom defaults", () => {
    const config = {
      rsvp_rate_limit_max: "20",
    };
    render(
      <RateLimitForm
        config={config}
        maxKey="rsvp_rate_limit_max"
        windowKey="rsvp_rate_limit_window"
        maxDefault="10"
        windowDefault="300"
        description="Test description"
      />,
    );
    expect(screen.getByLabelText("Max Attempts (per window)")).toHaveValue(20);
    expect(screen.getByLabelText("Window (seconds)")).toHaveValue(300);
  });

  it("renders description text", () => {
    render(
      <RateLimitForm
        config={baseConfig}
        maxKey="rate_limit_max_attempts"
        windowKey="rate_limit_window_seconds"
        description="Custom help text"
      />,
    );
    expect(screen.getByText("Custom help text")).toBeDefined();
  });

  it("renders hidden _key field", () => {
    const { container } = render(
      <RateLimitForm
        config={baseConfig}
        maxKey="rate_limit_max_attempts"
        windowKey="rate_limit_window_seconds"
        description="Test"
      />,
    );
    const hidden = container.querySelector('input[name="_key"]') as HTMLInputElement;
    expect(hidden).not.toBeNull();
    expect(hidden.type).toBe("hidden");
    expect(hidden.value).toBe("rate-limit");
  });

  it("renders submit button", () => {
    render(
      <RateLimitForm
        config={baseConfig}
        maxKey="rate_limit_max_attempts"
        windowKey="rate_limit_window_seconds"
        description="Test"
      />,
    );
    expect(screen.getByRole("button", { name: "Save Rate Limit" })).toBeDefined();
  });
});
