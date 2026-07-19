import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import path from "node:path";
import fs from "node:fs";
import os from "node:os";

let tmpDir: string;

vi.mock("@/lib/media", () => ({
  get MEDIA_DIR() { return tmpDir; },
  get THUMBNAILS_DIR() { return path.join(tmpDir, "thumbnails"); },
  IMAGE_EXTENSIONS: new Set([".jpg", ".jpeg", ".png", ".gif", ".webp", ".avif"]),
  VIDEO_EXTENSIONS: new Set([".mp4", ".webm", ".mov"]),
  isWithinMediaDir(resolved: string) {
    const mediaDir = tmpDir;
    return resolved === mediaDir || resolved.startsWith(mediaDir + path.sep);
  },
  generateImageThumbnail: vi.fn().mockResolvedValue("/api/media/thumbnails/thumb.webp"),
  generateVideoThumbnail: vi.fn().mockResolvedValue("/api/media/thumbnails/thumb.webp"),
  generateVideoPoster: vi.fn().mockResolvedValue("/api/media/thumbnails/poster.webp"),
}));

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "thumb-test-"));
  fs.mkdirSync(path.join(tmpDir, "thumbnails"), { recursive: true });
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe("ensureThumbnail", () => {
  it("returns null for remote URLs", async () => {
    const { ensureThumbnail } = await import("@/lib/thumbnail");
    const result = await ensureThumbnail("https://example.com/photo.jpg");
    expect(result).toBeNull();
  });

  it("returns null for nonexistent local files", async () => {
    const { ensureThumbnail } = await import("@/lib/thumbnail");
    const result = await ensureThumbnail("/api/media/nonexistent.jpg");
    expect(result).toBeNull();
  });

  it("returns existing thumbnail if it exists on disk", async () => {
    const { ensureThumbnail } = await import("@/lib/thumbnail");
    const thumbPath = path.join(tmpDir, "thumbnails", "existing.webp");
    fs.writeFileSync(thumbPath, "fake");
    const result = await ensureThumbnail("/api/media/photo.jpg", "/api/media/thumbnails/existing.webp");
    expect(result).toBe("/api/media/thumbnails/existing.webp");
  });

  it("regenerates when cached thumbnail is missing from disk", async () => {
    const { ensureThumbnail } = await import("@/lib/thumbnail");
    // Create source file
    fs.writeFileSync(path.join(tmpDir, "photo.jpg"), "fake-image");
    // Cached thumbnail path does NOT exist on disk
    const result = await ensureThumbnail("/api/media/photo.jpg", "/api/media/thumbnails/missing.webp");
    expect(result).toBe("/api/media/thumbnails/thumb.webp");
  });

  it("generates thumbnail for existing local image", async () => {
    const { ensureThumbnail } = await import("@/lib/thumbnail");
    fs.writeFileSync(path.join(tmpDir, "photo.jpg"), "fake-image");
    const result = await ensureThumbnail("/api/media/photo.jpg");
    expect(result).toBe("/api/media/thumbnails/thumb.webp");
  });
});

describe("ensureVideoPoster", () => {
  it("returns null for remote URLs", async () => {
    const { ensureVideoPoster } = await import("@/lib/thumbnail");
    const result = await ensureVideoPoster("https://example.com/video.mp4");
    expect(result).toBeNull();
  });

  it("returns existing poster if it exists on disk", async () => {
    const { ensureVideoPoster } = await import("@/lib/thumbnail");
    const posterPath = path.join(tmpDir, "thumbnails", "existing-poster.webp");
    fs.writeFileSync(posterPath, "fake");
    const result = await ensureVideoPoster("/api/media/video.mp4", "/api/media/thumbnails/existing-poster.webp");
    expect(result).toBe("/api/media/thumbnails/existing-poster.webp");
  });

  it("regenerates when cached poster is missing from disk", async () => {
    const { ensureVideoPoster } = await import("@/lib/thumbnail");
    fs.writeFileSync(path.join(tmpDir, "video.mp4"), "fake-video");
    // Cached poster path does NOT exist on disk
    const result = await ensureVideoPoster("/api/media/video.mp4", "/api/media/thumbnails/missing-poster.webp");
    expect(result).toBe("/api/media/thumbnails/poster.webp");
  });

  it("generates poster for existing local video", async () => {
    const { ensureVideoPoster } = await import("@/lib/thumbnail");
    fs.writeFileSync(path.join(tmpDir, "video.mp4"), "fake-video");
    const result = await ensureVideoPoster("/api/media/video.mp4");
    expect(result).toBe("/api/media/thumbnails/poster.webp");
  });

  it("returns null for non-video files", async () => {
    const { ensureVideoPoster } = await import("@/lib/thumbnail");
    fs.writeFileSync(path.join(tmpDir, "photo.jpg"), "fake-image");
    const result = await ensureVideoPoster("/api/media/photo.jpg");
    expect(result).toBeNull();
  });
});
