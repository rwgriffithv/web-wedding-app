import { describe, it, expect, vi, beforeAll, afterAll, beforeEach, afterEach } from "vitest";
import path from "node:path";
import fs from "node:fs";
import os from "node:os";
import { execFile } from "node:child_process";

let tmpDir: string;
let imageBuffer: Buffer;
let videoFixturePath: string;

vi.mock("@/lib/media", () => ({
  get MEDIA_DIR() { return tmpDir; },
  get THUMBNAILS_DIR() { return path.join(tmpDir, "thumbnails"); },
  IMAGE_EXTENSIONS: new Set([".jpg", ".jpeg", ".png", ".gif", ".webp", ".avif"]),
  VIDEO_EXTENSIONS: new Set([".mp4", ".webm", ".mov"]),
  isWithinMediaDir(resolved: string) {
    const mediaDir = tmpDir;
    return resolved === mediaDir || resolved.startsWith(mediaDir + path.sep);
  },
}));

beforeAll(async () => {
  const sharp = (await import("sharp")).default;
  imageBuffer = await sharp({
    create: { width: 1, height: 1, channels: 3, background: { r: 255, g: 0, b: 0 } },
  }).jpeg().toBuffer();

  const ffmpegPath = (await import("ffmpeg-static")).default;
  if (!ffmpegPath) throw new Error("ffmpeg-static binary not found");

  videoFixturePath = path.join(os.tmpdir(), `thumb-vid-${Date.now()}.mp4`);
  await new Promise<void>((resolve, reject) => {
    execFile(ffmpegPath, [
      "-f", "lavfi",
      "-i", "color=c=red:s=2x2:d=0.1",
      "-frames:v", "1",
      "-c:v", "libx264",
      "-pix_fmt", "yuv420p",
      "-y",
      videoFixturePath,
    ], { timeout: 15_000 }, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
});

afterAll(() => {
  if (videoFixturePath) fs.unlinkSync(videoFixturePath);
});

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
    fs.writeFileSync(path.join(tmpDir, "photo.jpg"), imageBuffer);
    const result = await ensureThumbnail("/api/media/photo.jpg", "/api/media/thumbnails/missing.webp");
    expect(result).toMatch(/^\/api\/media\/thumbnails\/.+_400x400\.webp$/);
    const thumbName = result!.split("/").pop()!;
    expect(fs.existsSync(path.join(tmpDir, "thumbnails", thumbName))).toBe(true);
  });

  it("generates thumbnail for existing local image", async () => {
    const { ensureThumbnail } = await import("@/lib/thumbnail");
    fs.writeFileSync(path.join(tmpDir, "photo.jpg"), imageBuffer);
    const result = await ensureThumbnail("/api/media/photo.jpg");
    expect(result).toMatch(/^\/api\/media\/thumbnails\/.+_400x400\.webp$/);
    const thumbName = result!.split("/").pop()!;
    expect(fs.existsSync(path.join(tmpDir, "thumbnails", thumbName))).toBe(true);
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
    fs.copyFileSync(videoFixturePath, path.join(tmpDir, "video.mp4"));
    const result = await ensureVideoPoster("/api/media/video.mp4", "/api/media/thumbnails/missing-poster.webp");
    expect(result).toMatch(/^\/api\/media\/thumbnails\/.+_poster\.webp$/);
    const posterName = result!.split("/").pop()!;
    expect(fs.existsSync(path.join(tmpDir, "thumbnails", posterName))).toBe(true);
  });

  it("generates poster for existing local video", async () => {
    const { ensureVideoPoster } = await import("@/lib/thumbnail");
    fs.copyFileSync(videoFixturePath, path.join(tmpDir, "video.mp4"));
    const result = await ensureVideoPoster("/api/media/video.mp4");
    expect(result).toMatch(/^\/api\/media\/thumbnails\/.+_poster\.webp$/);
    const posterName = result!.split("/").pop()!;
    expect(fs.existsSync(path.join(tmpDir, "thumbnails", posterName))).toBe(true);
  });

  it("returns null for non-video files", async () => {
    const { ensureVideoPoster } = await import("@/lib/thumbnail");
    fs.writeFileSync(path.join(tmpDir, "photo.jpg"), imageBuffer);
    const result = await ensureVideoPoster("/api/media/photo.jpg");
    expect(result).toBeNull();
  });
});
