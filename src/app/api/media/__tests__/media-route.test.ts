import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const mockRequireSession = vi.fn();
const mockValidateSessionInDb = vi.fn();

vi.mock("@/lib/auth", () => ({
  requireSession: (...args: unknown[]) => mockRequireSession(...args),
  validateSessionInDb: (...args: unknown[]) => mockValidateSessionInDb(...args),
}));

vi.mock("@/lib/media", () => ({
  MEDIA_DIR: "/tmp/test-media",
  ALLOWED_EXTENSIONS: new Set([".jpg", ".jpeg", ".png", ".gif", ".webp", ".mp4"]),
  isWithinMediaDir: (resolved: string) => resolved.startsWith("/tmp/test-media"),
  MIME_TYPES: {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".gif": "image/gif",
    ".webp": "image/webp",
    ".mp4": "video/mp4",
  },
}));

vi.mock("node:fs", () => ({
  default: {
    promises: {
      stat: vi.fn().mockResolvedValue({ size: 1024 }),
      readdir: vi.fn().mockResolvedValue([
        { name: "test.jpg", isFile: () => true, isDirectory: () => false },
      ]),
    },
    createReadStream: vi.fn().mockReturnValue({
      read: vi.fn(),
      on: vi.fn(),
      pipe: vi.fn(),
    }),
  },
}));

vi.mock("@/lib/logger", () => ({
  logError: vi.fn(),
}));

import { createRateLimiter, getRateLimitConfig } from "@/lib/rate-limit";
import { parseClientIp } from "@/lib/ip";

vi.mock("@/lib/ip", () => ({
  parseClientIp: vi.fn(),
}));

vi.mock("@/lib/site-config", () => ({
  getRateLimitConfig: vi.fn(),
}));

vi.mock("@/lib/constants", () => ({
  MEDIA_RATE_LIMIT_MAX_KEY: "media_rate_limit_max_attempts",
  MEDIA_RATE_LIMIT_WINDOW_SECONDS_KEY: "media_rate_limit_window_seconds",
  MEDIA_RATE_LIMIT_MAX_DEFAULT: 500,
  MEDIA_RATE_LIMIT_WINDOW_SECONDS_DEFAULT: 3600,
}));

vi.mock("@/lib/http-status", () => ({
  STATUS_UNAUTHORIZED: 401,
  STATUS_TOO_MANY_REQUESTS: 429,
}));

const mockGetRateLimitConfig = vi.mocked(getRateLimitConfig);
const mockParseClientIp = vi.mocked(parseClientIp);

describe("media API rate limiting", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireSession.mockResolvedValue({ userId: 1, type: "admin" });
    mockValidateSessionInDb.mockResolvedValue({ userId: 1, type: "admin" });
    mockGetRateLimitConfig.mockReturnValue({ maxAttempts: 10, windowMs: 60000 });
    mockParseClientIp.mockReturnValue("192.168.1.1");
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("GET /api/media/[...path]", () => {
    it("returns 429 with Retry-After header when rate limit exceeded", async () => {
      const { GET } = await import("@/app/api/media/[...path]/route");
      const limiter = createRateLimiter("test-media-file");
      limiter.reset();

      const request = new Request("http://localhost/api/media/test.jpg", {
        headers: {
          "x-forwarded-for": "192.168.1.1",
        },
      });

      const params = Promise.resolve({ path: ["test.jpg"] });

      // Mock getRateLimitConfig to return our test config
      mockGetRateLimitConfig.mockReturnValue({ maxAttempts: 2, windowMs: 60000 });

      // First request should succeed (after auth)
      const response1 = await GET(request, { params });
      expect(response1.status).toBe(200);

      // Second request should succeed
      const response2 = await GET(request, { params });
      expect(response2.status).toBe(200);

      // Third request should be rate limited
      const response3 = await GET(request, { params });
      expect(response3.status).toBe(429);

      const body = await response3.json();
      expect(body.error).toBe("Too many requests. Please wait before trying again.");
      expect(response3.headers.get("Retry-After")).toBeTruthy();
    });

    it("returns 401 when not authenticated", async () => {
      mockRequireSession.mockResolvedValue(null);

      const { GET } = await import("@/app/api/media/[...path]/route");
      const request = new Request("http://localhost/api/media/test.jpg", {
        headers: {
          "x-forwarded-for": "192.168.1.1",
        },
      });

      const params = Promise.resolve({ path: ["test.jpg"] });
      const response = await GET(request, { params });
      expect(response.status).toBe(401);
    });

    it("returns 401 when session expired", async () => {
      mockValidateSessionInDb.mockResolvedValue(null);

      const { GET } = await import("@/app/api/media/[...path]/route");
      const request = new Request("http://localhost/api/media/test.jpg", {
        headers: {
          "x-forwarded-for": "192.168.1.1",
        },
      });

      const params = Promise.resolve({ path: ["test.jpg"] });
      const response = await GET(request, { params });
      expect(response.status).toBe(401);
    });

    it("returns Cache-Control: private, max-age=86400, immutable", async () => {
      const { GET } = await import("@/app/api/media/[...path]/route");
      const request = new Request("http://localhost/api/media/test.jpg", {
        headers: { "x-forwarded-for": "192.168.1.1" },
      });
      const params = Promise.resolve({ path: ["test.jpg"] });

      const response = await GET(request, { params });
      expect(response.headers.get("Cache-Control")).toBe("private, max-age=86400, immutable");
    });
  });

  describe("GET /api/media/list", () => {
    it("returns 429 with Retry-After header when rate limit exceeded", async () => {
      const { GET } = await import("@/app/api/media/list/route");

      mockRequireSession.mockResolvedValue({ userId: 1, type: "admin" });
      mockValidateSessionInDb.mockResolvedValue({ userId: 1, type: "admin" });
      mockGetRateLimitConfig.mockReturnValue({ maxAttempts: 2, windowMs: 60000 });

      const request = new Request("http://localhost/api/media/list", {
        headers: {
          "x-forwarded-for": "192.168.1.1",
        },
      });

      // First request should succeed
      const response1 = await GET(request);
      expect(response1.status).toBe(200);

      // Second request should succeed
      const response2 = await GET(request);
      expect(response2.status).toBe(200);

      // Third request should be rate limited
      const response3 = await GET(request);
      expect(response3.status).toBe(429);

      const body = await response3.json();
      expect(body.error).toBe("Too many requests. Please wait before trying again.");
      expect(response3.headers.get("Retry-After")).toBeTruthy();
    });

    it("returns 401 when not authenticated", async () => {
      mockRequireSession.mockResolvedValue(null);

      const { GET } = await import("@/app/api/media/list/route");
      const request = new Request("http://localhost/api/media/list", {
        headers: {
          "x-forwarded-for": "192.168.1.1",
        },
      });

      const response = await GET(request);
      expect(response.status).toBe(401);
    });

    it("returns 401 when session expired", async () => {
      mockValidateSessionInDb.mockResolvedValue(null);

      const { GET } = await import("@/app/api/media/list/route");
      const request = new Request("http://localhost/api/media/list", {
        headers: {
          "x-forwarded-for": "192.168.1.1",
        },
      });

      const response = await GET(request);
      expect(response.status).toBe(401);
    });
  });
});
