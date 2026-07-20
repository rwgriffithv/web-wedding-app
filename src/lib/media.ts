import path from "node:path";
import fs from "node:fs";
export { ALLOWED_EXTENSIONS, IMAGE_EXTENSIONS, VIDEO_EXTENSIONS, detectMediaType, MIME_TYPES } from "@/lib/media-types";

export const MEDIA_DIR = process.env.MEDIA_DIR || path.join(/* turbopackIgnore: true */ process.cwd(), "data", "media");
const MEDIA_DIR_SEP = MEDIA_DIR.endsWith(path.sep) ? MEDIA_DIR : MEDIA_DIR + path.sep;

export const THUMBNAILS_DIR = path.join(MEDIA_DIR, "thumbnails");

export function isWithinMediaDir(resolved: string): boolean {
  return resolved === MEDIA_DIR || resolved.startsWith(MEDIA_DIR_SEP);
}

export function deleteThumbnail(thumbnailUrl: string | null): void {
  if (!thumbnailUrl || !thumbnailUrl.startsWith("/api/media/thumbnails/")) return;
  const filename = thumbnailUrl.slice("/api/media/thumbnails/".length);
  if (!filename) return;
  const filepath = path.join(THUMBNAILS_DIR, filename);
  const resolved = path.resolve(filepath);
  if (!resolved.startsWith(THUMBNAILS_DIR + path.sep) && resolved !== THUMBNAILS_DIR) return;
  try {
    fs.unlinkSync(resolved);
  } catch (err) {
    console.warn("Failed to delete thumbnail:", err);
  }
}

let ensured = false;

export function ensureMediaDir(): void {
  if (ensured) return;
  fs.mkdirSync(MEDIA_DIR, { recursive: true });
  fs.mkdirSync(THUMBNAILS_DIR, { recursive: true });
  ensured = true;
}
