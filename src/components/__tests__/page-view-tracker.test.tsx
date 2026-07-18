import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, act } from "@testing-library/react";
import { PV_UNTIL_KEY } from "@/lib/constants";

const mockTrackPageView = vi.fn();

vi.mock("../track-page-view", () => ({
  trackPageView: (...args: unknown[]) => mockTrackPageView(...args),
}));

let pathname = "/home";

vi.mock("next/navigation", () => ({
  usePathname: () => pathname,
}));

describe("PageViewTracker", () => {
  beforeEach(() => {
    vi.resetModules();
    mockTrackPageView.mockReset();
    mockTrackPageView.mockResolvedValue({ debounceMinutes: 15 });
    pathname = "/home";
    localStorage.removeItem(PV_UNTIL_KEY);
  });

  afterEach(() => {
    localStorage.removeItem(PV_UNTIL_KEY);
  });

  it("renders nothing", async () => {
    const { PageViewTracker: Tracker } = await import("../page-view-tracker");
    const { container } = render(<Tracker />);
    expect(container.innerHTML).toBe("");
  });

  it("calls trackPageView on mount when no stored timestamp", async () => {
    const { PageViewTracker: Tracker } = await import("../page-view-tracker");
    await act(async () => {
      render(<Tracker />);
    });
    expect(mockTrackPageView).toHaveBeenCalledTimes(1);
  });

  it("stores future timestamp after tracking", async () => {
    const { PageViewTracker: Tracker } = await import("../page-view-tracker");
    await act(async () => {
      render(<Tracker />);
    });
    const raw = localStorage.getItem(PV_UNTIL_KEY);
    expect(raw).toBeTruthy();
    expect(parseInt(raw!, 10)).toBeGreaterThan(Date.now());
  });

  it("skips server call when within debounce window", async () => {
    localStorage.setItem(PV_UNTIL_KEY, String(Date.now() + 60_000));
    const { PageViewTracker: Tracker } = await import("../page-view-tracker");
    await act(async () => {
      render(<Tracker />);
    });
    expect(mockTrackPageView).not.toHaveBeenCalled();
  });

  it("calls trackPageView when debounce window has expired", async () => {
    localStorage.setItem(PV_UNTIL_KEY, String(Date.now() - 1000));
    const { PageViewTracker: Tracker } = await import("../page-view-tracker");
    await act(async () => {
      render(<Tracker />);
    });
    expect(mockTrackPageView).toHaveBeenCalledTimes(1);
  });

  it("calls trackPageView on each pathname change when debounce expired", async () => {
    const { PageViewTracker: Tracker } = await import("../page-view-tracker");
    const { rerender } = render(<Tracker />);
    await act(async () => {});
    expect(mockTrackPageView).toHaveBeenCalledTimes(1);

    // Expire the debounce window
    localStorage.setItem(PV_UNTIL_KEY, String(Date.now() - 1000));

    await act(async () => {
      pathname = "/rsvp";
      rerender(<Tracker />);
    });
    expect(mockTrackPageView).toHaveBeenCalledTimes(2);
  });

  it("skips call when pathname changes within debounce window", async () => {
    const { PageViewTracker: Tracker } = await import("../page-view-tracker");
    const { rerender } = render(<Tracker />);
    await act(async () => {});
    expect(mockTrackPageView).toHaveBeenCalledTimes(1);

    // Navigate while still in debounce window (no manual localStorage set)
    await act(async () => {
      pathname = "/rsvp";
      rerender(<Tracker />);
    });
    expect(mockTrackPageView).toHaveBeenCalledTimes(1);
  });

  it("uses debounce minutes from server response", async () => {
    mockTrackPageView.mockResolvedValue({ debounceMinutes: 30 });
    const { PageViewTracker: Tracker } = await import("../page-view-tracker");
    render(<Tracker />);
    await act(async () => {});

    const raw = localStorage.getItem(PV_UNTIL_KEY);
    const until = parseInt(raw!, 10);
    // Should be ~30 minutes from now
    expect(until).toBeGreaterThan(Date.now() + 29 * 60_000);
    expect(until).toBeLessThanOrEqual(Date.now() + 30 * 60_000 + 1000);
  });

  it("handles localStorage unavailable gracefully", async () => {
    const spy = vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("localStorage unavailable");
    });
    const { PageViewTracker: Tracker } = await import("../page-view-tracker");
    await act(async () => {
      render(<Tracker />);
    });
    expect(mockTrackPageView).toHaveBeenCalledTimes(1);
    spy.mockRestore();
  });

  it("calls server when PV_UNTIL_KEY removed externally (logout)", async () => {
    localStorage.setItem(PV_UNTIL_KEY, String(Date.now() + 60_000));
    const { PageViewTracker: Tracker } = await import("../page-view-tracker");
    const { rerender } = render(<Tracker />);
    await act(async () => {});
    expect(mockTrackPageView).not.toHaveBeenCalled();

    // Simulate logout clearing the key
    localStorage.removeItem(PV_UNTIL_KEY);

    await act(async () => {
      pathname = "/rsvp";
      rerender(<Tracker />);
    });
    expect(mockTrackPageView).toHaveBeenCalledTimes(1);
  });
});
