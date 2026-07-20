// SVG intentionally excluded from MIME_TYPES_IMAGE — serving image/svg+xml enables stored XSS via <object>, <embed>, or CSS.
const MIME_TYPES_IMAGE: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".avif": "image/avif",
};

const MIME_TYPES_VIDEO: Record<string, string> = {
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".mov": "video/quicktime",
};

export const IMAGE_EXTENSIONS = new Set(Object.keys(MIME_TYPES_IMAGE));
export const VIDEO_EXTENSIONS = new Set(Object.keys(MIME_TYPES_VIDEO));
export const ALLOWED_EXTENSIONS = new Set([...IMAGE_EXTENSIONS, ...VIDEO_EXTENSIONS]);
export const MIME_TYPES: Record<string, string> = { ...MIME_TYPES_IMAGE, ...MIME_TYPES_VIDEO };

export function detectMediaType(url: string): "image" | "video" {
  const ext = url.split(".").pop()?.split("?")[0]?.toLowerCase();
  if (ext && VIDEO_EXTENSIONS.has(`.${ext}`)) return "video";
  return "image";
}
