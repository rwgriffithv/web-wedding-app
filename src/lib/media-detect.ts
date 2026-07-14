export const VIDEO_EXTENSIONS = new Set([".mp4", ".webm", ".mov"]);

export function detectMediaType(url: string): "image" | "video" {
  const ext = url.split(".").pop()?.split("?")[0]?.toLowerCase();
  if (ext && VIDEO_EXTENSIONS.has(`.${ext}`)) return "video";
  return "image";
}
