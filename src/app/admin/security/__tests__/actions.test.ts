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

vi.mock("@/lib/auth", () => ({ requireSession: (...args: unknown[]) => mockIsAdmin(...args), validateSessionInDb: () => mockValidateSessionForMutation() }));
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
  mockBanIp.mockReturnValue(true);
});

function formData(entries: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(entries)) fd.set(k, v);
  return fd;
}

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
    mockBanIp.mockReturnValue(false);
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
    mockGetBannedIpById.mockReturnValue("10.0.0.5");
    const { unbanIpAction } = await import("../actions");
    const result = await unbanIpAction(null, formData({ id: "7" }));
    expect(result.success).toBe(true);
    expect(mockUnbanIp).toHaveBeenCalledWith(7);
    expect(mockUnrevokeSessionsByIpBan).toHaveBeenCalledWith("10.0.0.5");
    expect(mockRevalidatePath).toHaveBeenCalledWith("/admin/security");
  });
});
