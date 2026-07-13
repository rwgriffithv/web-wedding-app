import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ErrorDisplay } from "./error-display";

describe("ErrorDisplay", () => {
  const error = new Error("test error");
  const reset = vi.fn();

  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    reset.mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders default message", () => {
    render(<ErrorDisplay error={error} reset={reset} />);
    expect(screen.getByText("Something went wrong")).toBeDefined();
    expect(screen.getByText("An unexpected error occurred. Please try again.")).toBeDefined();
  });

  it("renders custom message", () => {
    render(<ErrorDisplay error={error} reset={reset} message="Custom error text" />);
    expect(screen.getByText("Custom error text")).toBeDefined();
  });

  it("shows error digest when provided", () => {
    const errorWithDigest = Object.assign(error, { digest: "abc123" });
    render(<ErrorDisplay error={errorWithDigest} reset={reset} />);
    expect(screen.getByText("Error code: abc123")).toBeDefined();
  });

  it("hides error digest when not provided", () => {
    render(<ErrorDisplay error={new Error("no digest")} reset={reset} />);
    expect(screen.queryByText(/Error code:/)).toBeNull();
  });

  it("calls reset when button is clicked", () => {
    render(<ErrorDisplay error={error} reset={reset} />);
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(reset).toHaveBeenCalledTimes(1);
  });

  it("logs error to console", () => {
    render(<ErrorDisplay error={error} reset={reset} />);
    expect(console.error).toHaveBeenCalledWith(error);
  });

  it("applies custom className", () => {
    const { container } = render(<ErrorDisplay error={error} reset={reset} className="custom-class" />);
    expect(container.firstChild).toHaveClass("custom-class");
  });

  it("uses page-content as default className", () => {
    const { container } = render(<ErrorDisplay error={error} reset={reset} />);
    expect(container.firstChild).toHaveClass("page-content");
  });
});
