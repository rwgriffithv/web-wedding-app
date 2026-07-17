import { describe, it, expect, vi, beforeEach } from "vitest";

const mockIsAdmin = vi.fn();
const mockValidateSessionForMutation = vi.fn();
const mockBanIp = vi.fn();
const mockUnbanIp = vi.fn();
const mockIsIpBanned = vi.fn();
const mockClearViolations = vi.fn();
const mockGetBannedIpById = vi.fn();
const mockSetConfig = vi.fn();
const mockRevalidatePath = vi.fn();
const mockRevokeSessionsByIpBan = vi.fn();
const mockUnrevokeSessionsByIpBan = vi.fn();

vi.mock("@/lib/auth", () => ({ requireAdminSessionOrNull: () => mockIsAdmin(), validateSessionInDb: () => mockValidateSessionForMutation() }));
vi.mock("@/lib/repository/ip-bans", () => ({
  banIp: (...args: unknown[]) => mockBanIp(...args),
  unbanIp: (...args: unknown[]) => mockUnbanIp(...args),
  isIpBanned: (...args: unknown[]) => mockIsIpBanned(...args),
  clearViolations: (...args: unknown[]) => mockClearViolations(...args),
  getBannedIpById: (...args: unknown[]) => mockGetBannedIpById(...args),
}));
vi.mock("@/lib/repository/site-config", () => ({
  setConfig: (...args: unknown[]) => mockSetConfig(...args),
}));
vi.mock("@/lib/session-revocation", () => ({
  revokeSessionsByIpBan: (...args: unknown[]) => mockRevokeSessionsByIpBan(...args),
  unrevokeSessionsByIpBan: (...args: unknown[]) => mockUnrevokeSessionsByIpBan(...args),
}));
vi.mock("next/cache", () => ({
  revalidatePath: (...args: unknown[]) => mockRevalidatePath(...args),
}));

beforeEach(() => {
  vi.clearAllMocks();
  mockIsAdmin.mockResolvedValue(true);
  mockValidateSessionForMutation.mockResolvedValue({ userId: 1, type: "admin" });
  mockIsIpBanned.mockReturnValue(false);
});

function formData(entries: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(entries)) fd.set(k, v);
  return fd;
}

describe("saveSuspiciousSettings", () => {
  it("rejects non-admin", async () => {
    mockIsAdmin.mockResolvedValue(false);
    const { saveSuspiciousSettings } = await import("../actions");
    const result = await saveSuspiciousSettings(null, formData({ suspicious_ip_threshold: "10" }));
    expect(result.error).toBe("Unauthorized");
  });

  it("rejects expired session (isAdmin passes, validateSessionInDb fails)", async () => {
    mockIsAdmin.mockResolvedValue(true);
    mockValidateSessionForMutation.mockResolvedValue(null);
    const { saveSuspiciousSettings } = await import("../actions");
    const result = await saveSuspiciousSettings(null, formData({ suspicious_ip_threshold: "10" }));
    expect(result.error).toBe("Session expired");
  });

  it("rejects non-numeric threshold", async () => {
    const { saveSuspiciousSettings } = await import("../actions");
    const result = await saveSuspiciousSettings(null, formData({ suspicious_ip_threshold: "abc" }));
    expect(result.error).toContain("Threshold must be a number");
  });

  it("rejects threshold below 1", async () => {
    const { saveSuspiciousSettings } = await import("../actions");
    const result = await saveSuspiciousSettings(null, formData({ suspicious_ip_threshold: "0" }));
    expect(result.error).toContain("Threshold must be a number");
  });

  it("rejects threshold above 100", async () => {
    const { saveSuspiciousSettings } = await import("../actions");
    const result = await saveSuspiciousSettings(null, formData({ suspicious_ip_threshold: "101" }));
    expect(result.error).toContain("Threshold must be a number");
  });

  it("saves valid threshold", async () => {
    const { saveSuspiciousSettings } = await import("../actions");
    const result = await saveSuspiciousSettings(null, formData({ suspicious_ip_threshold: "15" }));
    expect(result.success).toBe(true);
    expect(mockSetConfig).toHaveBeenCalledWith("suspicious_ip_threshold", "15");
    expect(mockRevalidatePath).toHaveBeenCalledWith("/admin/security");
    expect(mockRevalidatePath).toHaveBeenCalledWith("/admin");
  });
});

describe("clearViolationsAction", () => {
  it("rejects non-admin", async () => {
    mockIsAdmin.mockResolvedValue(false);
    const { clearViolationsAction } = await import("../actions");
    const result = await clearViolationsAction(null, formData({ ip_address: "1.2.3.4" }));
    expect(result.error).toBe("Unauthorized");
  });

  it("rejects empty IP", async () => {
    const { clearViolationsAction } = await import("../actions");
    const result = await clearViolationsAction(null, formData({ ip_address: "" }));
    expect(result.error).toBe("IP address is required.");
  });

  it("rejects invalid IP format", async () => {
    const { clearViolationsAction } = await import("../actions");
    const result = await clearViolationsAction(null, formData({ ip_address: "not-an-ip" }));
    expect(result.error).toBe("Invalid IP address format.");
  });

  it("clears violations for valid IP", async () => {
    const { clearViolationsAction } = await import("../actions");
    const result = await clearViolationsAction(null, formData({ ip_address: "10.0.0.1" }));
    expect(result.success).toBe(true);
    expect(mockClearViolations).toHaveBeenCalledWith("10.0.0.1");
    expect(mockRevalidatePath).toHaveBeenCalledWith("/admin/security");
  });
});

describe("banViolationIpAction", () => {
  it("rejects non-admin", async () => {
    mockIsAdmin.mockResolvedValue(false);
    const { banViolationIpAction } = await import("../actions");
    const result = await banViolationIpAction(null, formData({ ip_address: "1.2.3.4" }));
    expect(result.error).toBe("Unauthorized");
  });

  it("rejects empty IP", async () => {
    const { banViolationIpAction } = await import("../actions");
    const result = await banViolationIpAction(null, formData({ ip_address: "" }));
    expect(result.error).toBe("IP address is required.");
  });

  it("rejects invalid IP format", async () => {
    const { banViolationIpAction } = await import("../actions");
    const result = await banViolationIpAction(null, formData({ ip_address: "999.999.999.999" }));
    expect(result.error).toBe("Invalid IP address format.");
  });

  it("returns error for already-banned IP", async () => {
    mockIsIpBanned.mockReturnValue(true);
    const { banViolationIpAction } = await import("../actions");
    const result = await banViolationIpAction(null, formData({ ip_address: "1.2.3.4" }));
    expect(result.error).toBe("This IP is already banned.");
  });

  it("bans a valid unbanned IP", async () => {
    const { banViolationIpAction } = await import("../actions");
    const result = await banViolationIpAction(null, formData({ ip_address: "1.2.3.4" }));
    expect(result.success).toBe(true);
    expect(mockBanIp).toHaveBeenCalledWith("1.2.3.4", "manual");
    expect(mockRevalidatePath).toHaveBeenCalledWith("/admin/security");
  });
});

describe("banIpAction", () => {
  it("rejects invalid IP format", async () => {
    const { banIpAction } = await import("../actions");
    const result = await banIpAction(null, formData({ ip_address: "abc" }));
    expect(result.error).toBe("Invalid IP address format.");
  });

  it("bans with custom reason", async () => {
    const { banIpAction } = await import("../actions");
    const result = await banIpAction(null, formData({ ip_address: "5.6.7.8", reason: "auto:threshold" }));
    expect(result.success).toBe(true);
    expect(mockBanIp).toHaveBeenCalledWith("5.6.7.8", "auto:threshold");
  });
});

describe("saveAutoBanSettings", () => {
  it("rejects non-admin", async () => {
    mockIsAdmin.mockResolvedValue(false);
    const { saveAutoBanSettings } = await import("../actions");
    const result = await saveAutoBanSettings(null, formData({ auto_ban_login_threshold: "5", auto_ban_window_seconds: "300" }));
    expect(result.error).toBe("Unauthorized");
  });

  it("rejects expired session", async () => {
    mockValidateSessionForMutation.mockResolvedValue(null);
    const { saveAutoBanSettings } = await import("../actions");
    const result = await saveAutoBanSettings(null, formData({ auto_ban_login_threshold: "5", auto_ban_window_seconds: "300" }));
    expect(result.error).toBe("Session expired");
  });

  it("rejects non-numeric threshold", async () => {
    const { saveAutoBanSettings } = await import("../actions");
    const result = await saveAutoBanSettings(null, formData({ auto_ban_login_threshold: "abc", auto_ban_window_seconds: "300" }));
    expect(result.error).toBe("Threshold must be a number between 1 and 100.");
  });

  it("rejects threshold below 1", async () => {
    const { saveAutoBanSettings } = await import("../actions");
    const result = await saveAutoBanSettings(null, formData({ auto_ban_login_threshold: "0", auto_ban_window_seconds: "300" }));
    expect(result.error).toBe("Threshold must be a number between 1 and 100.");
  });

  it("rejects threshold above 100", async () => {
    const { saveAutoBanSettings } = await import("../actions");
    const result = await saveAutoBanSettings(null, formData({ auto_ban_login_threshold: "101", auto_ban_window_seconds: "300" }));
    expect(result.error).toBe("Threshold must be a number between 1 and 100.");
  });

  it("rejects non-numeric window", async () => {
    const { saveAutoBanSettings } = await import("../actions");
    const result = await saveAutoBanSettings(null, formData({ auto_ban_login_threshold: "5", auto_ban_window_seconds: "abc" }));
    expect(result.error).toBe("Window must be between 60 and 86400 seconds.");
  });

  it("rejects window below 60", async () => {
    const { saveAutoBanSettings } = await import("../actions");
    const result = await saveAutoBanSettings(null, formData({ auto_ban_login_threshold: "5", auto_ban_window_seconds: "30" }));
    expect(result.error).toBe("Window must be between 60 and 86400 seconds.");
  });

  it("rejects window above 86400", async () => {
    const { saveAutoBanSettings } = await import("../actions");
    const result = await saveAutoBanSettings(null, formData({ auto_ban_login_threshold: "5", auto_ban_window_seconds: "86401" }));
    expect(result.error).toBe("Window must be between 60 and 86400 seconds.");
  });

  it("saves valid threshold and window", async () => {
    const { saveAutoBanSettings } = await import("../actions");
    const result = await saveAutoBanSettings(null, formData({ auto_ban_login_threshold: "10", auto_ban_window_seconds: "600" }));
    expect(result.success).toBe(true);
    expect(mockSetConfig).toHaveBeenCalledWith("auto_ban_login_threshold", "10");
    expect(mockSetConfig).toHaveBeenCalledWith("auto_ban_window_seconds", "600");
    expect(mockRevalidatePath).toHaveBeenCalledWith("/admin/security");
    expect(mockRevalidatePath).toHaveBeenCalledWith("/admin");
  });
});

describe("saveSessionSettings", () => {
  it("rejects non-admin", async () => {
    mockIsAdmin.mockResolvedValue(false);
    const { saveSessionSettings } = await import("../actions");
    const result = await saveSessionSettings(null, formData({ session_max_hours: "8", page_view_debounce_minutes: "5" }));
    expect(result.error).toBe("Unauthorized");
  });

  it("rejects expired session", async () => {
    mockValidateSessionForMutation.mockResolvedValue(null);
    const { saveSessionSettings } = await import("../actions");
    const result = await saveSessionSettings(null, formData({ session_max_hours: "8", page_view_debounce_minutes: "5" }));
    expect(result.error).toBe("Session expired");
  });

  it("rejects non-numeric hours", async () => {
    const { saveSessionSettings } = await import("../actions");
    const result = await saveSessionSettings(null, formData({ session_max_hours: "abc", page_view_debounce_minutes: "5" }));
    expect(result.error).toBe("Session expiry must be between 1 and 24 hours.");
  });

  it("rejects hours below 1", async () => {
    const { saveSessionSettings } = await import("../actions");
    const result = await saveSessionSettings(null, formData({ session_max_hours: "0", page_view_debounce_minutes: "5" }));
    expect(result.error).toBe("Session expiry must be between 1 and 24 hours.");
  });

  it("rejects hours above 24", async () => {
    const { saveSessionSettings } = await import("../actions");
    const result = await saveSessionSettings(null, formData({ session_max_hours: "25", page_view_debounce_minutes: "5" }));
    expect(result.error).toBe("Session expiry must be between 1 and 24 hours.");
  });

  it("rejects non-numeric minutes", async () => {
    const { saveSessionSettings } = await import("../actions");
    const result = await saveSessionSettings(null, formData({ session_max_hours: "8", page_view_debounce_minutes: "abc" }));
    expect(result.error).toBe("Page view debounce must be between 1 and 1440 minutes.");
  });

  it("rejects minutes below 1", async () => {
    const { saveSessionSettings } = await import("../actions");
    const result = await saveSessionSettings(null, formData({ session_max_hours: "8", page_view_debounce_minutes: "0" }));
    expect(result.error).toBe("Page view debounce must be between 1 and 1440 minutes.");
  });

  it("rejects minutes above 1440", async () => {
    const { saveSessionSettings } = await import("../actions");
    const result = await saveSessionSettings(null, formData({ session_max_hours: "8", page_view_debounce_minutes: "1441" }));
    expect(result.error).toBe("Page view debounce must be between 1 and 1440 minutes.");
  });

  it("saves valid hours and minutes", async () => {
    const { saveSessionSettings } = await import("../actions");
    const result = await saveSessionSettings(null, formData({ session_max_hours: "8", page_view_debounce_minutes: "5" }));
    expect(result.success).toBe(true);
    expect(mockSetConfig).toHaveBeenCalledWith("session_max_hours", "8");
    expect(mockSetConfig).toHaveBeenCalledWith("page_view_debounce_minutes", "5");
    expect(mockRevalidatePath).toHaveBeenCalledWith("/admin/security");
  });
});

describe("unbanIpAction", () => {
  it("rejects non-admin", async () => {
    mockIsAdmin.mockResolvedValue(false);
    const { unbanIpAction } = await import("../actions");
    const result = await unbanIpAction(null, formData({ id: "1" }));
    expect(result.error).toBe("Unauthorized");
  });

  it("rejects expired session", async () => {
    mockValidateSessionForMutation.mockResolvedValue(null);
    const { unbanIpAction } = await import("../actions");
    const result = await unbanIpAction(null, formData({ id: "1" }));
    expect(result.error).toBe("Session expired");
  });

  it("rejects null ID (missing field)", async () => {
    const { unbanIpAction } = await import("../actions");
    const result = await unbanIpAction(null, formData({}));
    expect(result.error).toBe("Invalid ID.");
  });

  it("returns Ban not found when getBannedIpById returns null", async () => {
    mockGetBannedIpById.mockReturnValue(null);
    const { unbanIpAction } = await import("../actions");
    const result = await unbanIpAction(null, formData({ id: "42" }));
    expect(result.error).toBe("Ban not found.");
  });

  it("successfully unbans when ban exists", async () => {
    mockGetBannedIpById.mockReturnValue({ id: 7, ip_address: "10.0.0.5" });
    const { unbanIpAction } = await import("../actions");
    const result = await unbanIpAction(null, formData({ id: "7" }));
    expect(result.success).toBe(true);
    expect(mockUnbanIp).toHaveBeenCalledWith(7);
    expect(mockUnrevokeSessionsByIpBan).toHaveBeenCalledWith({ id: 7, ip_address: "10.0.0.5" });
    expect(mockRevalidatePath).toHaveBeenCalledWith("/admin/security");
  });
});
