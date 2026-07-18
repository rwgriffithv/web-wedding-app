import path from "node:path";
import fs from "node:fs";
import { MEDIA_DIR, IMAGE_EXTENSIONS, VIDEO_EXTENSIONS, isWithinMediaDir, generateImageThumbnail, generateVideoThumbnail, generateVideoPoster } from "@/lib/media";
import { randomUUID } from "node:crypto";

/**
 * Given a media URL (e.g. "/api/media/file.jpg"), resolve it to an on-disk
 * path and generate a thumbnail if one doesn't already exist.
 *
 * Returns the thumbnail URL path, or null if generation was skipped
 * (remote URL, SVG, unknown type, file not found, etc.).
 */
export async function ensureThumbnail(
  mediaUrl: string,
  existingThumbnailUrl?: string | null,
): Promise<string | null> {
  if (existingThumbnailUrl) {
    // Verify cached thumbnail still exists on disk; regenerate if deleted
    const cachedPath = extractLocalPath(existingThumbnailUrl);
    if (cachedPath) {
      const resolved = path.resolve(MEDIA_DIR, cachedPath);
      if (isWithinMediaDir(resolved) && fs.existsSync(resolved)) {
        return existingThumbnailUrl;
      }
    }
    // Cached file missing or not local — fall through to regenerate
  }

  const localPath = extractLocalPath(mediaUrl);
  if (!localPath) return null;

  const resolved = path.resolve(MEDIA_DIR, localPath);
  if (!isWithinMediaDir(resolved)) return null;

  if (!fs.existsSync(resolved)) return null;

  const ext = path.extname(resolved).toLowerCase();
  const isImage = IMAGE_EXTENSIONS.has(ext) && ext !== ".svg";
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
    console.error("Thumbnail generation failed:", error);
    return null;
  }
}

/**
 * Extract the relative path from a local media URL.
 * "/api/media/photos/img.jpg" → "photos/img.jpg"
 * "https://example.com/img.jpg" → null
 */
function extractLocalPath(url: string): string | null {
  if (!url.startsWith("/api/media/")) return null;
  const relative = url.slice("/api/media/".length);
  if (!relative) return null;
  return relative;
}

/**
 * Generate a full-width poster image from a local video's first frame.
 * Returns the poster URL path, or null if generation was skipped.
 */
export async function ensureVideoPoster(
  videoUrl: string,
  existingPosterUrl?: string | null,
): Promise<string | null> {
  if (existingPosterUrl) return existingPosterUrl;

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
    console.error("Video poster generation failed:", error);
    return null;
  }
}
