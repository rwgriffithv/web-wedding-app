import { describe, it, expect, vi, beforeEach } from "vitest";

const mockRequireSession = vi.fn();
const mockValidateSessionInDb = vi.fn();
const mockGetAll = vi.fn();
const mockGetAllTabs = vi.fn();
const mockCreate = vi.fn();
const mockUpdate = vi.fn();
const mockDeleteItem = vi.fn();
const mockSwapItemSortOrder = vi.fn();
const mockCreateTab = vi.fn();
const mockUpdateTab = vi.fn();
const mockDeleteTab = vi.fn();
const mockSwapTabSortOrder = vi.fn();
const mockSetConfig = vi.fn();
const mockEnsureThumbnail = vi.fn();
const mockRevalidatePath = vi.fn();
const mockValidateMediaUrl = vi.fn();
const mockDetectMediaType = vi.fn();

vi.mock("@/lib/auth", () => ({
  requireSession: (...args: unknown[]) => mockRequireSession(...args),
  validateSessionInDb: (...args: unknown[]) => mockValidateSessionInDb(...args),
}));
vi.mock("@/lib/repository/media", () => ({
  getAll: (...args: unknown[]) => mockGetAll(...args),
  getAllTabs: (...args: unknown[]) => mockGetAllTabs(...args),
  create: (...args: unknown[]) => mockCreate(...args),
  update: (...args: unknown[]) => mockUpdate(...args),
  deleteItem: (...args: unknown[]) => mockDeleteItem(...args),
  swapItemSortOrder: (...args: unknown[]) => mockSwapItemSortOrder(...args),
  createTab: (...args: unknown[]) => mockCreateTab(...args),
  updateTab: (...args: unknown[]) => mockUpdateTab(...args),
  deleteTab: (...args: unknown[]) => mockDeleteTab(...args),
  swapTabSortOrder: (...args: unknown[]) => mockSwapTabSortOrder(...args),
}));
vi.mock("@/lib/repository/site-config", () => ({
  setConfig: (...args: unknown[]) => mockSetConfig(...args),
}));
vi.mock("@/lib/thumbnail", () => ({
  ensureThumbnail: (...args: unknown[]) => mockEnsureThumbnail(...args),
}));
vi.mock("@/lib/media", () => ({
  detectMediaType: (...args: unknown[]) => mockDetectMediaType(...args),
}));
vi.mock("next/cache", () => ({
  revalidatePath: (...args: unknown[]) => mockRevalidatePath(...args),
}));
vi.mock("@/lib/form-data", () => ({
  getRequiredString: (fd: FormData, key: string) => {
    const v = fd.get(key);
    return typeof v === "string" && v.length > 0 ? v : null;
  },
  getOptionalString: (fd: FormData, key: string) => {
    const v = fd.get(key);
    return typeof v === "string" ? v : "";
  },
  getInt: (fd: FormData, key: string) => {
    const raw = fd.get(key);
    if (typeof raw !== "string") return null;
    const n = parseInt(raw, 10);
    return Number.isFinite(n) && n >= 1 ? n : null;
  },
  validateMediaUrl: (...args: unknown[]) => mockValidateMediaUrl(...args),
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
  mockValidateMediaUrl.mockReturnValue(null);
  mockDetectMediaType.mockReturnValue("image");
  mockEnsureThumbnail.mockResolvedValue(null);
});

describe("updateItem", () => {
  it("does not overwrite section when section is absent from form data", async () => {
    const { updateItem } = await import("../actions");
    // Form only has title — no section field (matches the real edit form in media-list.tsx)
    const result = await updateItem(null, formData({ item_id: "1", title: "New Title" }));
    expect(result.success).toBe(true);
    expect(mockUpdate).toHaveBeenCalledTimes(1);
    const patch = mockUpdate.mock.calls[0][1];
    expect(patch.title).toBe("New Title");
    expect(patch.section).toBeUndefined();
  });

  it("does not overwrite title when title is absent from form data", async () => {
    const { updateItem } = await import("../actions");
    const result = await updateItem(null, formData({ item_id: "1", section: "photos" }));
    expect(result.success).toBe(true);
    const patch = mockUpdate.mock.calls[0][1];
    expect(patch.title).toBeUndefined();
    expect(patch.section).toBe("photos");
  });

  it("sends both fields when both are present", async () => {
    const { updateItem } = await import("../actions");
    const result = await updateItem(null, formData({ item_id: "1", title: "Title", section: "videos" }));
    expect(result.success).toBe(true);
    const patch = mockUpdate.mock.calls[0][1];
    expect(patch.title).toBe("Title");
    expect(patch.section).toBe("videos");
  });

  it("rejects unauthorized", async () => {
    mockRequireSession.mockResolvedValue(false);
    const { updateItem } = await import("../actions");
    const result = await updateItem(null, formData({ item_id: "1", title: "Title" }));
    expect(result.success).toBe(false);
    expect(result.error).toBe("Unauthorized");
  });

  it("rejects invalid item ID", async () => {
    const { updateItem } = await import("../actions");
    const result = await updateItem(null, formData({ title: "Title" }));
    expect(result.success).toBe(false);
    expect(result.error).toBe("Invalid item ID.");
  });
});
