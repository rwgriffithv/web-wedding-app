import { describe, it, expect, vi, beforeEach } from "vitest";

const mockIsAdmin = vi.fn();
const mockValidateSessionForMutation = vi.fn();
const mockBanIp = vi.fn();
const mockIsIpBanned = vi.fn();
const mockClearViolations = vi.fn();
const mockSetConfig = vi.fn();
const mockRevalidatePath = vi.fn();

vi.mock("@/lib/auth", () => ({ parseAdminSession: () => mockIsAdmin(), validateSessionForMutation: () => mockValidateSessionForMutation() }));
vi.mock("@/lib/repository/ip-bans", () => ({
  banIp: (...args: unknown[]) => mockBanIp(...args),
  isIpBanned: (...args: unknown[]) => mockIsIpBanned(...args),
  clearViolations: (...args: unknown[]) => mockClearViolations(...args),
}));
vi.mock("@/lib/repository/site-config", () => ({
  setConfig: (...args: unknown[]) => mockSetConfig(...args),
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

  it("rejects expired session (isAdmin passes, validateSessionForMutation fails)", async () => {
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
