import { describe, it, expect, vi, beforeEach } from "vitest";

const mockIncrementPageViews = vi.fn();

vi.mock("@/lib/repository/users", () => ({
  incrementPageViews: (...args: unknown[]) => mockIncrementPageViews(...args),
}));

const mockGetPageViewDebounceMinutes = vi.fn();

vi.mock("@/lib/site-config", () => ({
  getPageViewDebounceMinutes: () => mockGetPageViewDebounceMinutes(),
}));

const mockVerifyTokenInCookie = vi.fn();

vi.mock("@/lib/auth", () => ({
  verifyTokenInCookie: () => mockVerifyTokenInCookie(),
}));

describe("trackPageView", () => {
  beforeEach(() => {
    mockIncrementPageViews.mockReset();
    mockGetPageViewDebounceMinutes.mockReset();
    mockVerifyTokenInCookie.mockReset();
    mockGetPageViewDebounceMinutes.mockReturnValue(15);
  });

  it("does nothing when session is null", async () => {
    mockVerifyTokenInCookie.mockResolvedValue(null);
    const { trackPageView } = await import("@/components/track-page-view");
    const result = await trackPageView();
    expect(mockIncrementPageViews).not.toHaveBeenCalled();
    expect(result).toEqual({ debounceMinutes: 15 });
  });

  it("does nothing when session has no userId", async () => {
    mockVerifyTokenInCookie.mockResolvedValue({ type: "party" });
    const { trackPageView } = await import("@/components/track-page-view");
    const result = await trackPageView();
    expect(mockIncrementPageViews).not.toHaveBeenCalled();
    expect(result).toEqual({ debounceMinutes: 15 });
  });

  it("calls incrementPageViews with userId and debounce minutes", async () => {
    mockVerifyTokenInCookie.mockResolvedValue({ userId: 42, type: "party" });
    mockGetPageViewDebounceMinutes.mockReturnValue(15);
    const { trackPageView } = await import("@/components/track-page-view");
    const result = await trackPageView();
    expect(mockIncrementPageViews).toHaveBeenCalledWith(42, 15);
    expect(result).toEqual({ debounceMinutes: 15 });
  });

  it("uses configured debounce minutes from site config", async () => {
    mockVerifyTokenInCookie.mockResolvedValue({ userId: 42, type: "party" });
    mockGetPageViewDebounceMinutes.mockReturnValue(30);
    const { trackPageView } = await import("@/components/track-page-view");
    const result = await trackPageView();
    expect(mockIncrementPageViews).toHaveBeenCalledWith(42, 30);
    expect(result).toEqual({ debounceMinutes: 30 });
  });

  it("caps debounce at 1440 minutes (24h)", async () => {
    mockVerifyTokenInCookie.mockResolvedValue({ userId: 42, type: "party" });
    mockGetPageViewDebounceMinutes.mockReturnValue(1440);
    const { trackPageView } = await import("@/components/track-page-view");
    const result = await trackPageView();
    expect(mockIncrementPageViews).toHaveBeenCalledWith(42, 1440);
    expect(result).toEqual({ debounceMinutes: 1440 });
  });

  it("returns debounceMinutes even when incrementPageViews returns a value", async () => {
    mockVerifyTokenInCookie.mockResolvedValue({ userId: 42, type: "party" });
    mockGetPageViewDebounceMinutes.mockReturnValue(15);
    mockIncrementPageViews.mockReturnValue(true);
    const { trackPageView } = await import("@/components/track-page-view");
    const result = await trackPageView();
    expect(result).toEqual({ debounceMinutes: 15 });
  });
});
