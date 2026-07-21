import path from "node:path";
import fs from "node:fs";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { randomUUID } from "node:crypto";
import { logError } from "@/lib/logger";
import { MEDIA_DIR, THUMBNAILS_DIR, IMAGE_EXTENSIONS, VIDEO_EXTENSIONS, isWithinMediaDir } from "@/lib/media";

const execFileAsync = promisify(execFile);

const THUMB_SIZE = 400;
const POSTER_MAX = 1920;

fs.mkdirSync(THUMBNAILS_DIR, { recursive: true });

async function getVideoDimensions(inputPath: string): Promise<{ width: number; height: number }> {
  const ffmpegPath = (await import("ffmpeg-static")).default;
  if (!ffmpegPath) throw new Error("ffmpeg-static binary not found");

  try {
    await execFileAsync(ffmpegPath, ["-i", inputPath], { timeout: 5_000 });
  } catch (err: unknown) {
    const stderr = (err as { stderr?: Buffer }).stderr?.toString() ?? "";
    const match = stderr.match(/Stream #\d+:\d+.*?: Video:.*?, (\d+)x(\d+)/);
    if (match) {
      const width = parseInt(match[1], 10);
      const height = parseInt(match[2], 10);
      if (width > 0 && height > 0) return { width, height };
    }
  }
  return { width: 1920, height: 1080 };
}

export async function generateImageThumbnail(
  buffer: Buffer,
  outFilename: string,
): Promise<string> {
  const sharp = (await import("sharp")).default;
  const outPath = path.join(THUMBNAILS_DIR, outFilename);
  await sharp(buffer)
    .resize(THUMB_SIZE, THUMB_SIZE, { fit: "cover" })
    .webp({ quality: 80 })
    .toFile(outPath);
  const stat = await fs.promises.stat(outPath);
  if (stat.size === 0) throw new Error("Thumbnail file is empty");
  return `/api/media/thumbnails/${outFilename}`;
}

export async function generateVideoThumbnail(
  inputPath: string,
  outFilename: string,
): Promise<string> {
  const ffmpegPath = (await import("ffmpeg-static")).default;
  if (!ffmpegPath) throw new Error("ffmpeg-static binary not found");

  const tmpJpg = path.join(THUMBNAILS_DIR, `tmp-${outFilename}.jpg`);
  try {
    await execFileAsync(ffmpegPath, [
      "-i", inputPath,
      "-frames:v", "1",
      "-q:v", "2",
      tmpJpg,
    ], { timeout: 10_000 });

    const frameBuffer = await fs.promises.readFile(tmpJpg);
    const sharp = (await import("sharp")).default;
    const outPath = path.join(THUMBNAILS_DIR, outFilename);
    await sharp(frameBuffer)
      .resize(THUMB_SIZE, THUMB_SIZE, { fit: "cover" })
      .webp({ quality: 80 })
      .toFile(outPath);
    return `/api/media/thumbnails/${outFilename}`;
  } finally {
    await fs.promises.unlink(tmpJpg).catch(() => {});
  }
}

export async function generateVideoPoster(
  inputPath: string,
  outFilename: string,
): Promise<string> {
  const ffmpegPath = (await import("ffmpeg-static")).default;
  if (!ffmpegPath) throw new Error("ffmpeg-static binary not found");

  const { width: srcW, height: srcH } = await getVideoDimensions(inputPath);
  const aspect = srcW / srcH;
  const posterW = aspect >= 1 ? POSTER_MAX : Math.round(POSTER_MAX * aspect);
  const posterH = aspect >= 1 ? Math.round(POSTER_MAX / aspect) : POSTER_MAX;

  const tmpJpg = path.join(THUMBNAILS_DIR, `tmp-poster-${outFilename}.jpg`);
  try {
    await execFileAsync(ffmpegPath, [
      "-i", inputPath,
      "-frames:v", "1",
      "-q:v", "2",
      tmpJpg,
    ], { timeout: 10_000 });

    const frameBuffer = await fs.promises.readFile(tmpJpg);
    const sharp = (await import("sharp")).default;
    const outPath = path.join(THUMBNAILS_DIR, outFilename);
    await sharp(frameBuffer)
      .resize(posterW, posterH, { fit: "cover" })
      .webp({ quality: 80 })
      .toFile(outPath);
    const stat = await fs.promises.stat(outPath);
    if (stat.size === 0) throw new Error("Poster file is empty");
    return `/api/media/thumbnails/${outFilename}`;
  } finally {
    await fs.promises.unlink(tmpJpg).catch(() => {});
  }
}

export async function ensureThumbnail(
  mediaUrl: string,
  existingThumbnailUrl?: string | null,
): Promise<string | null> {
  if (existingThumbnailUrl) {
    const cachedPath = extractLocalPath(existingThumbnailUrl);
    if (cachedPath) {
      const resolved = path.resolve(MEDIA_DIR, cachedPath);
      if (isWithinMediaDir(resolved) && fs.existsSync(resolved)) {
        return existingThumbnailUrl;
      }
    }
  }

  const localPath = extractLocalPath(mediaUrl);
  if (!localPath) return null;

  const resolved = path.resolve(MEDIA_DIR, localPath);
  if (!isWithinMediaDir(resolved)) return null;

  if (!fs.existsSync(resolved)) return null;

  const ext = path.extname(resolved).toLowerCase();
  const isImage = IMAGE_EXTENSIONS.has(ext);
  const isVideo = VIDEO_EXTENSIONS.has(ext);
  if (!isImage && !isVideo) return null;

  const uuid = randomUUID();
  const thumbFilename = `${uuid}_400x400.webp`;

  try {
    if (isImage) {
      const buffer = await fs.promises.readFile(resolved);
      return await generateImageThumbnail(buffer, thumbFilename);
    } else {
      return await generateVideoThumbnail(resolved, thumbFilename);
    }
  } catch (error) {
    logError("Thumbnail", error);
    return null;
  }
}

function extractLocalPath(url: string): string | null {
  if (!url.startsWith("/api/media/")) return null;
  const relative = url.slice("/api/media/".length);
  if (!relative) return null;
  return relative;
}

export async function ensureVideoPoster(
  videoUrl: string,
  existingPosterUrl?: string | null,
): Promise<string | null> {
  if (existingPosterUrl) {
    const cachedPath = extractLocalPath(existingPosterUrl);
    if (cachedPath) {
      const resolved = path.resolve(MEDIA_DIR, cachedPath);
      if (isWithinMediaDir(resolved) && fs.existsSync(resolved)) {
        return existingPosterUrl;
      }
    }
  }

  const localPath = extractLocalPath(videoUrl);
  if (!localPath) return null;

  const resolved = path.resolve(MEDIA_DIR, localPath);
  if (!isWithinMediaDir(resolved)) return null;
  if (!fs.existsSync(resolved)) return null;

  const ext = path.extname(resolved).toLowerCase();
  if (!VIDEO_EXTENSIONS.has(ext)) return null;

  const uuid = randomUUID();
  const posterFilename = `${uuid}_poster.webp`;

  try {
    return await generateVideoPoster(resolved, posterFilename);
  } catch (error) {
    logError("Thumbnail", error);
    return null;
  }
}
