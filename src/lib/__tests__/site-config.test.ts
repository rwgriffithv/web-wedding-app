import { describe, it, expect, vi, beforeEach } from "vitest";

const mockGetConfig = vi.fn();

vi.mock("@/lib/repository/site-config", () => ({
  getConfig: (...args: unknown[]) => mockGetConfig(...args),
}));

describe("site-config", () => {
  beforeEach(() => {
    mockGetConfig.mockReset();
  });

  describe("getSessionMaxSeconds", () => {
    it("returns 24h in seconds for default config", async () => {
      mockGetConfig.mockReturnValue("24");
      const { getSessionMaxSeconds } = await import("../site-config");
      expect(getSessionMaxSeconds()).toBe(24 * 60 * 60);
    });

    it("returns configured value in seconds", async () => {
      mockGetConfig.mockReturnValue("8");
      const { getSessionMaxSeconds } = await import("../site-config");
      expect(getSessionMaxSeconds()).toBe(8 * 60 * 60);
    });

    it("clamps values above 24 to 24h", async () => {
      mockGetConfig.mockReturnValue("48");
      const { getSessionMaxSeconds } = await import("../site-config");
      expect(getSessionMaxSeconds()).toBe(24 * 60 * 60);
    });

    it("clamps 0 to 24h default", async () => {
      mockGetConfig.mockReturnValue("0");
      const { getSessionMaxSeconds } = await import("../site-config");
      expect(getSessionMaxSeconds()).toBe(24 * 60 * 60);
    });

    it("falls back to 24h for empty string", async () => {
      mockGetConfig.mockReturnValue("");
      const { getSessionMaxSeconds } = await import("../site-config");
      expect(getSessionMaxSeconds()).toBe(24 * 60 * 60);
    });

    it("falls back to 24h for NaN", async () => {
      mockGetConfig.mockReturnValue("abc");
      const { getSessionMaxSeconds } = await import("../site-config");
      expect(getSessionMaxSeconds()).toBe(24 * 60 * 60);
    });

    it("falls back to 24h for negative values", async () => {
      mockGetConfig.mockReturnValue("-5");
      const { getSessionMaxSeconds } = await import("../site-config");
      expect(getSessionMaxSeconds()).toBe(24 * 60 * 60);
    });

    it("accepts minimum value of 1", async () => {
      mockGetConfig.mockReturnValue("1");
      const { getSessionMaxSeconds } = await import("../site-config");
      expect(getSessionMaxSeconds()).toBe(1 * 60 * 60);
    });

    it("handles decimal hours like 0.5", async () => {
      mockGetConfig.mockReturnValue("0.5");
      const { getSessionMaxSeconds } = await import("../site-config");
      expect(getSessionMaxSeconds()).toBe(0.5 * 60 * 60);
    });

    it("handles decimal hours like 1.5", async () => {
      mockGetConfig.mockReturnValue("1.5");
      const { getSessionMaxSeconds } = await import("../site-config");
      expect(getSessionMaxSeconds()).toBe(1.5 * 60 * 60);
    });

    it("clamps decimal above 24 to 24h", async () => {
      mockGetConfig.mockReturnValue("25.5");
      const { getSessionMaxSeconds } = await import("../site-config");
      expect(getSessionMaxSeconds()).toBe(24 * 60 * 60);
    });

    it("clamps sub-second values to minimum 1 second", async () => {
      mockGetConfig.mockReturnValue("0.0001");
      const { getSessionMaxSeconds } = await import("../site-config");
      expect(getSessionMaxSeconds()).toBe(1);
    });
  });

  describe("getAutoBanConfig", () => {
    it("returns defaults when config is missing", async () => {
      mockGetConfig.mockReturnValue("");
      const { getAutoBanConfig } = await import("../site-config");
      const config = getAutoBanConfig();
      expect(config.threshold).toBe(5);
      expect(config.windowSeconds).toBe(3600);
    });

    it("returns parsed config values", async () => {
      mockGetConfig.mockImplementation((key: string) => {
        if (key === "auto_ban_login_threshold") return "10";
        if (key === "auto_ban_window_seconds") return "1800";
        return "";
      });
      const { getAutoBanConfig } = await import("../site-config");
      const config = getAutoBanConfig();
      expect(config.threshold).toBe(10);
      expect(config.windowSeconds).toBe(1800);
    });

    it("falls back to defaults for NaN", async () => {
      mockGetConfig.mockReturnValue("abc");
      const { getAutoBanConfig } = await import("../site-config");
      const config = getAutoBanConfig();
      expect(config.threshold).toBe(5);
      expect(config.windowSeconds).toBe(3600);
    });

    it("falls back to defaults for zero", async () => {
      mockGetConfig.mockReturnValue("0");
      const { getAutoBanConfig } = await import("../site-config");
      const config = getAutoBanConfig();
      expect(config.threshold).toBe(5);
      expect(config.windowSeconds).toBe(3600);
    });
  });

  describe("getSuspiciousConfig", () => {
    it("returns default threshold when config is missing", async () => {
      mockGetConfig.mockReturnValue("");
      const { getSuspiciousConfig } = await import("../site-config");
      const config = getSuspiciousConfig();
      expect(config.threshold).toBe(10);
    });

    it("returns parsed threshold from config", async () => {
      mockGetConfig.mockReturnValue("20");
      const { getSuspiciousConfig } = await import("../site-config");
      const config = getSuspiciousConfig();
      expect(config.threshold).toBe(20);
    });

    it("falls back to default for NaN", async () => {
      mockGetConfig.mockReturnValue("abc");
      const { getSuspiciousConfig } = await import("../site-config");
      const config = getSuspiciousConfig();
      expect(config.threshold).toBe(10);
    });

    it("falls back to default for zero", async () => {
      mockGetConfig.mockReturnValue("0");
      const { getSuspiciousConfig } = await import("../site-config");
      const config = getSuspiciousConfig();
      expect(config.threshold).toBe(10);
    });
  });

  describe("getRateLimitConfig", () => {
    it("returns defaults when config is missing", async () => {
      mockGetConfig.mockReturnValue("");
      const { getRateLimitConfig } = await import("../site-config");
      const config = getRateLimitConfig("max_key", "window_key", 5, 60);
      expect(config.maxAttempts).toBe(5);
      expect(config.windowMs).toBe(60_000);
    });

    it("returns parsed values from config", async () => {
      mockGetConfig.mockImplementation((key: string) => {
        if (key === "max_key") return "10";
        if (key === "window_key") return "120";
        return "";
      });
      const { getRateLimitConfig } = await import("../site-config");
      const config = getRateLimitConfig("max_key", "window_key", 5, 60);
      expect(config.maxAttempts).toBe(10);
      expect(config.windowMs).toBe(120_000);
    });

    it("falls back to defaults for NaN", async () => {
      mockGetConfig.mockReturnValue("abc");
      const { getRateLimitConfig } = await import("../site-config");
      const config = getRateLimitConfig("max_key", "window_key", 5, 60);
      expect(config.maxAttempts).toBe(5);
      expect(config.windowMs).toBe(60_000);
    });

    it("falls back to defaults for zero", async () => {
      mockGetConfig.mockReturnValue("0");
      const { getRateLimitConfig } = await import("../site-config");
      const config = getRateLimitConfig("max_key", "window_key", 5, 60);
      expect(config.maxAttempts).toBe(5);
      expect(config.windowMs).toBe(60_000);
    });

    it("falls back to defaults for negative values", async () => {
      mockGetConfig.mockReturnValue("-1");
      const { getRateLimitConfig } = await import("../site-config");
      const config = getRateLimitConfig("max_key", "window_key", 5, 60);
      expect(config.maxAttempts).toBe(5);
      expect(config.windowMs).toBe(60_000);
    });

    it("uses different defaults for each caller", async () => {
      mockGetConfig.mockReturnValue("");
      const { getRateLimitConfig } = await import("../site-config");
      const loginConfig = getRateLimitConfig("login_max", "login_window", 5, 60);
      const rsvpConfig = getRateLimitConfig("rsvp_max", "rsvp_window", 10, 60);
      expect(loginConfig.maxAttempts).toBe(5);
      expect(rsvpConfig.maxAttempts).toBe(10);
    });
  });

  describe("getPageViewDebounceMinutes", () => {
    it("returns 15 by default when config is missing", async () => {
      mockGetConfig.mockReturnValue("");
      const { getPageViewDebounceMinutes } = await import("../site-config");
      expect(getPageViewDebounceMinutes()).toBe(15);
    });

    it("returns configured value", async () => {
      mockGetConfig.mockReturnValue("30");
      const { getPageViewDebounceMinutes } = await import("../site-config");
      expect(getPageViewDebounceMinutes()).toBe(30);
    });

    it("caps at 1440", async () => {
      mockGetConfig.mockReturnValue("9999");
      const { getPageViewDebounceMinutes } = await import("../site-config");
      expect(getPageViewDebounceMinutes()).toBe(1440);
    });

    it("returns 15 for NaN", async () => {
      mockGetConfig.mockReturnValue("abc");
      const { getPageViewDebounceMinutes } = await import("../site-config");
      expect(getPageViewDebounceMinutes()).toBe(15);
    });

    it("returns 0 when configured as zero (no debounce)", async () => {
      mockGetConfig.mockReturnValue("0");
      const { getPageViewDebounceMinutes } = await import("../site-config");
      expect(getPageViewDebounceMinutes()).toBe(0);
    });

    it("returns 15 for negative", async () => {
      mockGetConfig.mockReturnValue("-5");
      const { getPageViewDebounceMinutes } = await import("../site-config");
      expect(getPageViewDebounceMinutes()).toBe(15);
    });
  });

  describe("getMediaMaxFileSizeMb", () => {
    it("returns 16 by default when config is missing", async () => {
      mockGetConfig.mockReturnValue("");
      const { getMediaMaxFileSizeMb } = await import("../site-config");
      expect(getMediaMaxFileSizeMb()).toBe(16);
    });

    it("returns configured value", async () => {
      mockGetConfig.mockReturnValue("32");
      const { getMediaMaxFileSizeMb } = await import("../site-config");
      expect(getMediaMaxFileSizeMb()).toBe(32);
    });

    it("returns 16 for NaN", async () => {
      mockGetConfig.mockReturnValue("abc");
      const { getMediaMaxFileSizeMb } = await import("../site-config");
      expect(getMediaMaxFileSizeMb()).toBe(16);
    });

    it("returns 16 for zero", async () => {
      mockGetConfig.mockReturnValue("0");
      const { getMediaMaxFileSizeMb } = await import("../site-config");
      expect(getMediaMaxFileSizeMb()).toBe(16);
    });

    it("returns 16 for negative", async () => {
      mockGetConfig.mockReturnValue("-5");
      const { getMediaMaxFileSizeMb } = await import("../site-config");
      expect(getMediaMaxFileSizeMb()).toBe(16);
    });

    it("accepts large values", async () => {
      mockGetConfig.mockReturnValue("100");
      const { getMediaMaxFileSizeMb } = await import("../site-config");
      expect(getMediaMaxFileSizeMb()).toBe(100);
    });
  });
});
