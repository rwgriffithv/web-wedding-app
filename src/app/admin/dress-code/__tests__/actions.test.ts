import { describe, it, expect, vi, beforeEach } from "vitest";

const mockRequireSession = vi.fn();
const mockValidateSessionInDb = vi.fn();
const mockCreateImage = vi.fn();
const mockCreateImages = vi.fn();
const mockDeleteImage = vi.fn();
const mockSwapSortOrder = vi.fn();
const mockSetConfig = vi.fn();
const mockEnsureThumbnail = vi.fn();
const mockRevalidatePath = vi.fn();
const mockValidateMediaUrl = vi.fn();
const mockDeleteThumbnail = vi.fn();

vi.mock("@/lib/auth", () => ({
  requireSession: (...args: unknown[]) => mockRequireSession(...args),
  validateSessionInDb: (...args: unknown[]) => mockValidateSessionInDb(...args),
}));
vi.mock("@/lib/repository/dress-code", () => ({
  createImage: (...args: unknown[]) => mockCreateImage(...args),
  createImages: (...args: unknown[]) => mockCreateImages(...args),
  deleteImage: (...args: unknown[]) => mockDeleteImage(...args),
  swapSortOrder: (...args: unknown[]) => mockSwapSortOrder(...args),
}));
vi.mock("@/lib/repository/site-config", () => ({
  setConfig: (...args: unknown[]) => mockSetConfig(...args),
}));
vi.mock("@/lib/thumbnail", () => ({
  ensureThumbnail: (...args: unknown[]) => mockEnsureThumbnail(...args),
}));
vi.mock("@/lib/media", () => ({
  deleteThumbnail: (...args: unknown[]) => mockDeleteThumbnail(...args),
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

function formData(entries: Record<string, string | string[]>): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(entries)) {
    if (Array.isArray(v)) {
      for (const item of v) fd.append(k, item);
    } else {
      fd.set(k, v);
    }
  }
  return fd;
}

beforeEach(() => {
  vi.clearAllMocks();
  mockRequireSession.mockResolvedValue({ userId: 1, type: "admin" });
  mockValidateSessionInDb.mockResolvedValue({ userId: 1, type: "admin" });
  mockEnsureThumbnail.mockResolvedValue("/api/media/thumb.webp");
  mockValidateMediaUrl.mockReturnValue(null);
});

describe("addImage", () => {
  it("rejects unauthorized", async () => {
    mockRequireSession.mockResolvedValue(false);
    const { addImage } = await import("../actions");
    const result = await addImage(null, formData({ image_url: "https://example.com/photo.jpg" }));
    expect(result.success).toBe(false);
    expect(result.error).toBe("Unauthorized");
  });

  it("rejects empty URL", async () => {
    const { addImage } = await import("../actions");
    const result = await addImage(null, formData({ image_url: "" }));
    expect(result.success).toBe(false);
    expect(result.error).toBe("Image URL is required.");
  });

  it("rejects invalid URL", async () => {
    mockValidateMediaUrl.mockReturnValue("Invalid URL format.");
    const { addImage } = await import("../actions");
    const result = await addImage(null, formData({ image_url: "not-a-url" }));
    expect(result.success).toBe(false);
    expect(result.error).toContain("Invalid URL");
  });

  it("adds a single image via createImage", async () => {
    const { addImage } = await import("../actions");
    const result = await addImage(null, formData({ image_url: "https://example.com/photo.jpg" }));
    expect(result.success).toBe(true);
    expect(mockCreateImage).toHaveBeenCalledTimes(1);
    expect(mockCreateImage).toHaveBeenCalledWith("https://example.com/photo.jpg", "/api/media/thumb.webp");
    expect(mockCreateImages).not.toHaveBeenCalled();
    expect(mockEnsureThumbnail).toHaveBeenCalledWith("https://example.com/photo.jpg");
    expect(mockRevalidatePath).toHaveBeenCalledWith("/admin/dress-code");
    expect(mockRevalidatePath).toHaveBeenCalledWith("/guide");
  });

  it("handles null thumbnail gracefully", async () => {
    mockEnsureThumbnail.mockResolvedValue(null);
    const { addImage } = await import("../actions");
    const result = await addImage(null, formData({ image_url: "https://example.com/photo.jpg" }));
    expect(result.success).toBe(true);
    expect(mockCreateImage).toHaveBeenCalledWith("https://example.com/photo.jpg", undefined);
  });

  it("adds multiple images via createImages in batch", async () => {
    const { addImage } = await import("../actions");
    const urls = [
      "https://example.com/photo1.jpg",
      "https://example.com/photo2.jpg",
      "https://example.com/photo3.jpg",
    ];
    const result = await addImage(null, formData({ image_url: urls }));
    expect(result.success).toBe(true);
    expect(mockCreateImages).toHaveBeenCalledTimes(1);
    expect(mockCreateImages).toHaveBeenCalledWith([
      { imageUrl: "https://example.com/photo1.jpg", thumbnailUrl: "/api/media/thumb.webp" },
      { imageUrl: "https://example.com/photo2.jpg", thumbnailUrl: "/api/media/thumb.webp" },
      { imageUrl: "https://example.com/photo3.jpg", thumbnailUrl: "/api/media/thumb.webp" },
    ]);
    expect(mockCreateImage).not.toHaveBeenCalled();
    expect(mockEnsureThumbnail).toHaveBeenCalledTimes(3);
    expect(mockRevalidatePath).toHaveBeenCalledTimes(2);
  });

  it("rejects if any URL in batch is invalid", async () => {
    mockValidateMediaUrl.mockImplementation((url: string) => {
      return url === "bad-url" ? "Invalid URL format." : null;
    });
    const { addImage } = await import("../actions");
    const result = await addImage(null, formData({
      image_url: ["https://example.com/good.jpg", "bad-url"],
    }));
    expect(result.success).toBe(false);
    expect(result.error).toContain("Invalid URL");
    expect(mockCreateImages).not.toHaveBeenCalled();
  });

  it("rolls back entire batch if createImages fails", async () => {
    mockCreateImages.mockImplementation(() => { throw new Error("DB constraint"); });
    const { addImage } = await import("../actions");
    const urls = [
      "https://example.com/photo1.jpg",
      "https://example.com/photo2.jpg",
      "https://example.com/photo3.jpg",
    ];
    const result = await addImage(null, formData({ image_url: urls }));
    expect(result.success).toBe(false);
    expect(result.error).toBe("Failed to add image.");
    expect(mockCreateImages).toHaveBeenCalledTimes(1);
    expect(mockCreateImage).not.toHaveBeenCalled();
    expect(mockDeleteThumbnail).toHaveBeenCalledTimes(3);
    expect(mockDeleteThumbnail).toHaveBeenCalledWith("/api/media/thumb.webp");
  });

  it("returns error on thumbnail failure", async () => {
    mockEnsureThumbnail.mockRejectedValue(new Error("sharp failed"));
    const { addImage } = await import("../actions");
    const result = await addImage(null, formData({ image_url: "https://example.com/photo.jpg" }));
    expect(result.success).toBe(false);
    expect(result.error).toBe("Failed to add image.");
  });
});
