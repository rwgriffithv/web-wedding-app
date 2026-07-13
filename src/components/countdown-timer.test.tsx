import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { CountdownTimer } from "./countdown-timer";

describe("CountdownTimer", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-13T12:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders countdown to a future date", () => {
    render(<CountdownTimer targetDate="2026-07-20T12:00" />);
    expect(screen.getByText("T−")).toBeDefined();
    expect(screen.getByText("07")).toBeDefined();
    expect(screen.getByText("days")).toBeDefined();
  });

  it("renders T+ prefix for past dates", () => {
    render(<CountdownTimer targetDate="2026-07-01T12:00" />);
    expect(screen.getByText("T+")).toBeDefined();
  });

  it("renders fallback for invalid date", () => {
    render(<CountdownTimer targetDate="not-a-date" />);
    expect(screen.getByText("--")).toBeDefined();
    expect(screen.getByText("T-")).toBeDefined();
  });

  it("ticks every second", () => {
    render(<CountdownTimer targetDate="2026-07-13T12:00:05" />);
    const getSeconds = () => screen.getAllByText(/\d{2}/).at(-1)!.textContent;
    expect(getSeconds()).toBe("05");

    act(() => {
      vi.advanceTimersByTime(3000);
    });

    expect(getSeconds()).toBe("02");
  });

  it("clears interval on unmount", () => {
    const clearIntervalSpy = vi.spyOn(global, "clearInterval");
    const { unmount } = render(<CountdownTimer targetDate="2026-07-20T12:00" />);
    unmount();
    expect(clearIntervalSpy).toHaveBeenCalled();
    clearIntervalSpy.mockRestore();
  });
});
