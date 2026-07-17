import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { CookieBlockWarning } from "../cookie-block-warning";

describe("CookieBlockWarning", () => {
  let originalLocation: PropertyDescriptor | undefined;

  beforeEach(() => {
    localStorage.clear();
    originalLocation = Object.getOwnPropertyDescriptor(window, "location");
    Object.defineProperty(window, "location", {
      value: { pathname: "/" },
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    if (originalLocation) {
      Object.defineProperty(window, "location", originalLocation);
    }
  });

  it("renders nothing when no flag and on login page", () => {
    render(<CookieBlockWarning />);
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("shows warning when fresh flag exists on login page", () => {
    Object.defineProperty(window, "location", {
      value: { pathname: "/login" },
      writable: true,
      configurable: true,
    });
    localStorage.setItem("cookie_health_until", String(Date.now() + 60_000));
    render(<CookieBlockWarning />);
    expect(screen.getByRole("alert")).toBeDefined();
    expect(screen.getByText(/blocking cookies/i)).toBeDefined();
  });

  it("ignores stale flag (past expiry)", () => {
    Object.defineProperty(window, "location", {
      value: { pathname: "/login" },
      writable: true,
      configurable: true,
    });
    localStorage.setItem("cookie_health_until", String(Date.now() - 1000));
    render(<CookieBlockWarning />);
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("never shows warning on landing page even with fresh flag", () => {
    localStorage.setItem("cookie_health_until", String(Date.now() + 60_000));
    render(<CookieBlockWarning />);
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("does nothing on protected page even with fresh flag", () => {
    localStorage.setItem("cookie_health_until", String(Date.now() + 60_000));
    Object.defineProperty(window, "location", {
      value: { pathname: "/home" },
      writable: true,
      configurable: true,
    });
    render(<CookieBlockWarning />);
    expect(screen.queryByRole("alert")).toBeNull();
  });
});
