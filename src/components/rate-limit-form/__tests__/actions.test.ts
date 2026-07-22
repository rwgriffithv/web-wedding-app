import { describe, it, expect, vi, beforeEach } from "vitest";

const mockRequireSession = vi.fn();
const mockValidateSessionInDb = vi.fn();
const mockSetConfigs = vi.fn();
const mockRevalidatePath = vi.fn();

vi.mock("next/cache", () => ({
  revalidatePath: (...args: unknown[]) => mockRevalidatePath(...args),
}));

vi.mock("@/lib/auth", () => ({
  requireSession: (...args: unknown[]) => mockRequireSession(...args),
  validateSessionInDb: (...args: unknown[]) => mockValidateSessionInDb(...args),
}));

vi.mock("@/lib/repository/site-config", () => ({
  setConfigs: (...args: unknown[]) => mockSetConfigs(...args),
}));

vi.mock("@/lib/logger", () => ({
  logError: vi.fn(),
}));

function formData(entries: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(entries)) fd.set(k, v);
  return fd;
}

beforeEach(() => {
  vi.clearAllMocks();
  mockRequireSession.mockResolvedValue({ userId: 1, type: "admin" });
  mockValidateSessionInDb.mockResolvedValue({ userId: 1, type: "admin" });
});

describe("saveRateLimitConfig", () => {
  it("rejects unauthorized request", async () => {
    mockRequireSession.mockResolvedValue(null);
    const { saveRateLimitConfig } = await import("../actions");
    const result = await saveRateLimitConfig(null, formData({ media_rate_limit_max_attempts: "100" }));
    expect(result.success).toBe(false);
    expect(result.error).toBe("Unauthorized");
  });

  it("rejects expired session", async () => {
    mockValidateSessionInDb.mockResolvedValue(null);
    const { saveRateLimitConfig } = await import("../actions");
    const result = await saveRateLimitConfig(null, formData({ media_rate_limit_max_attempts: "100" }));
    expect(result.success).toBe(false);
    expect(result.error).toBe("Session expired");
  });

  it("rejects unknown config keys", async () => {
    const { saveRateLimitConfig } = await import("../actions");
    const result = await saveRateLimitConfig(null, formData({ unknown_key: "100" }));
    expect(result.success).toBe(false);
    expect(result.error).toContain("Unknown config key");
    expect(result.error).toContain("unknown_key");
  });

  it("rejects non-positive numbers", async () => {
    const { saveRateLimitConfig } = await import("../actions");
    const result = await saveRateLimitConfig(null, formData({ media_rate_limit_max_attempts: "0" }));
    expect(result.success).toBe(false);
    expect(result.error).toContain("must be a positive number");
  });

  it("rejects non-numeric values", async () => {
    const { saveRateLimitConfig } = await import("../actions");
    const result = await saveRateLimitConfig(null, formData({ media_rate_limit_max_attempts: "abc" }));
    expect(result.success).toBe(false);
    expect(result.error).toContain("must be a positive number");
  });

  it("returns error when no fields submitted", async () => {
    const { saveRateLimitConfig } = await import("../actions");
    const result = await saveRateLimitConfig(null, formData({ _key: "rate-limit" }));
    expect(result.success).toBe(false);
    expect(result.error).toBe("No fields to save.");
  });

  it("saves media keys and calls setConfigs", async () => {
    const { saveRateLimitConfig } = await import("../actions");
    const result = await saveRateLimitConfig(
      null,
      formData({
        media_rate_limit_max_attempts: "500",
        media_rate_limit_window_seconds: "3600",
      }),
    );
    expect(result.success).toBe(true);
    expect(mockSetConfigs).toHaveBeenCalledWith([
      ["media_rate_limit_max_attempts", "500"],
      ["media_rate_limit_window_seconds", "3600"],
    ]);
  });

  it("saves RSVP keys and calls setConfigs", async () => {
    const { saveRateLimitConfig } = await import("../actions");
    const result = await saveRateLimitConfig(
      null,
      formData({
        rsvp_rate_limit_max_attempts: "10",
        rsvp_rate_limit_window_seconds: "60",
      }),
    );
    expect(result.success).toBe(true);
    expect(mockSetConfigs).toHaveBeenCalledWith([
      ["rsvp_rate_limit_max_attempts", "10"],
      ["rsvp_rate_limit_window_seconds", "60"],
    ]);
  });

  it("saves question keys and calls setConfigs", async () => {
    const { saveRateLimitConfig } = await import("../actions");
    const result = await saveRateLimitConfig(
      null,
      formData({
        question_rate_limit_max_attempts: "5",
        question_rate_limit_window_seconds: "120",
      }),
    );
    expect(result.success).toBe(true);
    expect(mockSetConfigs).toHaveBeenCalledWith([
      ["question_rate_limit_max_attempts", "5"],
      ["question_rate_limit_window_seconds", "120"],
    ]);
  });

  it("saves login keys and calls setConfigs", async () => {
    const { saveRateLimitConfig } = await import("../actions");
    const result = await saveRateLimitConfig(
      null,
      formData({
        rate_limit_max_attempts: "3",
        rate_limit_window_seconds: "30",
      }),
    );
    expect(result.success).toBe(true);
    expect(mockSetConfigs).toHaveBeenCalledWith([
      ["rate_limit_max_attempts", "3"],
      ["rate_limit_window_seconds", "30"],
    ]);
  });

  it("skips _key and $ prefixed fields during iteration", async () => {
    const { saveRateLimitConfig } = await import("../actions");
    const result = await saveRateLimitConfig(
      null,
      formData({
        _key: "rate-limit",
        $ACTION_REF_0: "some-ref",
        media_rate_limit_max_attempts: "100",
      }),
    );
    expect(result.success).toBe(true);
    expect(mockSetConfigs).toHaveBeenCalledWith([
      ["media_rate_limit_max_attempts", "100"],
    ]);
  });

  it("revalidates only the paths specified in revalidatePaths", async () => {
    const { saveRateLimitConfig } = await import("../actions");
    await saveRateLimitConfig(
      null,
      formData({ media_rate_limit_max_attempts: "100" }),
      ["/admin/media"],
    );
    expect(mockRevalidatePath).toHaveBeenCalledTimes(1);
    expect(mockRevalidatePath).toHaveBeenCalledWith("/admin/media");
  });

  it("revalidates multiple paths when specified", async () => {
    const { saveRateLimitConfig } = await import("../actions");
    await saveRateLimitConfig(
      null,
      formData({ media_rate_limit_max_attempts: "100" }),
      ["/admin/media", "/admin"],
    );
    expect(mockRevalidatePath).toHaveBeenCalledTimes(2);
    expect(mockRevalidatePath).toHaveBeenCalledWith("/admin/media");
    expect(mockRevalidatePath).toHaveBeenCalledWith("/admin");
  });

  it("defaults to /admin when no revalidatePaths provided", async () => {
    const { saveRateLimitConfig } = await import("../actions");
    await saveRateLimitConfig(
      null,
      formData({ media_rate_limit_max_attempts: "100" }),
    );
    expect(mockRevalidatePath).toHaveBeenCalledTimes(1);
    expect(mockRevalidatePath).toHaveBeenCalledWith("/admin");
  });

  it("does not revalidate other admin pages", async () => {
    const { saveRateLimitConfig } = await import("../actions");
    await saveRateLimitConfig(
      null,
      formData({ media_rate_limit_max_attempts: "100" }),
      ["/admin/media"],
    );
    expect(mockRevalidatePath).not.toHaveBeenCalledWith("/admin/rsvp");
    expect(mockRevalidatePath).not.toHaveBeenCalledWith("/admin/help");
    expect(mockRevalidatePath).not.toHaveBeenCalledWith("/admin/security");
    expect(mockRevalidatePath).not.toHaveBeenCalledWith("/admin/site");
  });
});
