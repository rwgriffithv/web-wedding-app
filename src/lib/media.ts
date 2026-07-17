import path from "node:path";
import fs from "node:fs";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export const MEDIA_DIR = process.env.MEDIA_DIR || path.join(/* turbopackIgnore: true */ process.cwd(), "data", "media");
const MEDIA_DIR_SEP = MEDIA_DIR.endsWith(path.sep) ? MEDIA_DIR : MEDIA_DIR + path.sep;

export const THUMBNAILS_DIR = path.join(MEDIA_DIR, "thumbnails");

export function isWithinMediaDir(resolved: string): boolean {
  return resolved === MEDIA_DIR || resolved.startsWith(MEDIA_DIR_SEP);
}

export const ALLOWED_EXTENSIONS = new Set([
  ".jpg", ".jpeg", ".png", ".gif", ".webp", ".avif", ".svg",
  ".mp4", ".webm", ".mov",
]);

export const IMAGE_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".gif", ".webp", ".avif", ".svg"]);

export { VIDEO_EXTENSIONS, detectMediaType } from "./media-detect";

export const MIME_TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".avif": "image/avif",
  ".svg": "image/svg+xml",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".mov": "video/quicktime",
};

export function deleteThumbnail(thumbnailUrl: string | null): void {
  if (!thumbnailUrl || !thumbnailUrl.startsWith("/api/media/thumbnails/")) return;
  const filename = thumbnailUrl.replace("/api/media/thumbnails/", "");
  const filepath = path.join(THUMBNAILS_DIR, filename);
  const resolved = path.resolve(filepath);
  if (!resolved.startsWith(THUMBNAILS_DIR + path.sep) && resolved !== THUMBNAILS_DIR) return;
  fs.promises.unlink(resolved).catch((err) => { console.warn("Failed to delete thumbnail:", err); });
}

let ensured = false;

export function ensureMediaDir(): void {
  if (ensured) return;
  fs.mkdirSync(MEDIA_DIR, { recursive: true });
  fs.mkdirSync(THUMBNAILS_DIR, { recursive: true });
  ensured = true;
}

const THUMB_SIZE = 400;
const POSTER_MAX = 1920;

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
  fs.mkdirSync(THUMBNAILS_DIR, { recursive: true });
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
  fs.mkdirSync(THUMBNAILS_DIR, { recursive: true });
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
  fs.mkdirSync(THUMBNAILS_DIR, { recursive: true });
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
