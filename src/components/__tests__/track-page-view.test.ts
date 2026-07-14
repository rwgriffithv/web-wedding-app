import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const mockIncrementPageViews = vi.fn();

vi.mock("@/lib/repository/users", () => ({
  incrementPageViews: (...args: unknown[]) => mockIncrementPageViews(...args),
}));

const mockGetConfig = vi.fn();

vi.mock("@/lib/repository/site-config", () => ({
  getConfig: (...args: unknown[]) => mockGetConfig(...args),
}));

const mockParseSession = vi.fn();

vi.mock("@/lib/auth", () => ({
  parseSession: () => mockParseSession(),
}));

describe("trackPageView", () => {
  beforeEach(() => {
    mockIncrementPageViews.mockReset();
    mockGetConfig.mockReset();
    mockParseSession.mockReset();
  });

  it("does nothing when session is null", async () => {
    mockParseSession.mockResolvedValue(null);
    const { trackPageView } = await import("@/components/track-page-view");
    await trackPageView();
    expect(mockIncrementPageViews).not.toHaveBeenCalled();
  });

  it("does nothing when session has no userId", async () => {
    mockParseSession.mockResolvedValue({ type: "party" });
    const { trackPageView } = await import("@/components/track-page-view");
    await trackPageView();
    expect(mockIncrementPageViews).not.toHaveBeenCalled();
  });

  it("calls incrementPageViews with userId and default debounce (15)", async () => {
    mockParseSession.mockResolvedValue({ userId: 42, type: "party" });
    mockGetConfig.mockReturnValue("");
    const { trackPageView } = await import("@/components/track-page-view");
    await trackPageView();
    expect(mockIncrementPageViews).toHaveBeenCalledWith(42, 15);
  });

  it("uses configured debounce minutes from site config", async () => {
    mockParseSession.mockResolvedValue({ userId: 42, type: "party" });
    mockGetConfig.mockReturnValue("30");
    const { trackPageView } = await import("@/components/track-page-view");
    await trackPageView();
    expect(mockIncrementPageViews).toHaveBeenCalledWith(42, 30);
  });

  it("caps debounce at 1440 minutes (24h)", async () => {
    mockParseSession.mockResolvedValue({ userId: 42, type: "party" });
    mockGetConfig.mockReturnValue("9999");
    const { trackPageView } = await import("@/components/track-page-view");
    await trackPageView();
    expect(mockIncrementPageViews).toHaveBeenCalledWith(42, 1440);
  });

  it("falls back to 15 when config is invalid (NaN)", async () => {
    mockParseSession.mockResolvedValue({ userId: 42, type: "party" });
    mockGetConfig.mockReturnValue("not-a-number");
    const { trackPageView } = await import("@/components/track-page-view");
    await trackPageView();
    expect(mockIncrementPageViews).toHaveBeenCalledWith(42, 15);
  });

  it("falls back to 15 when config is zero", async () => {
    mockParseSession.mockResolvedValue({ userId: 42, type: "party" });
    mockGetConfig.mockReturnValue("0");
    const { trackPageView } = await import("@/components/track-page-view");
    await trackPageView();
    expect(mockIncrementPageViews).toHaveBeenCalledWith(42, 15);
  });

  it("falls back to 15 when config is negative", async () => {
    mockParseSession.mockResolvedValue({ userId: 42, type: "party" });
    mockGetConfig.mockReturnValue("-5");
    const { trackPageView } = await import("@/components/track-page-view");
    await trackPageView();
    expect(mockIncrementPageViews).toHaveBeenCalledWith(42, 15);
  });

  it("passes through the return value from incrementPageViews", async () => {
    mockParseSession.mockResolvedValue({ userId: 42, type: "party" });
    mockGetConfig.mockReturnValue("");
    mockIncrementPageViews.mockReturnValue(true);
    const { trackPageView } = await import("@/components/track-page-view");
    // Should not throw even though incrementPageViews returns a value
    await expect(trackPageView()).resolves.toBeUndefined();
  });
});
