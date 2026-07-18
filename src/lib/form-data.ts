/**
 * Safely extract a string value from FormData.
 * Returns null if the value is missing, empty, or not a string (e.g. File).
 */
export function getString(formData: FormData, key: string): string | null {
  const value = formData.get(key);
  return typeof value === "string" && value.length > 0 ? value : null;
}

/**
 * Safely extract and parse an integer from FormData.
 * Returns null if the value is missing, not a string, or not a valid positive integer.
 */
export function getInt(formData: FormData, key: string): number | null {
  const raw = getString(formData, key);
  if (raw === null) return null;
  const n = parseInt(raw, 10);
  return Number.isFinite(n) && n >= 1 ? n : null;
}

/**
 * Validate that a URL string is a well-formed HTTP(S) URL.
 * Returns an error message if invalid, or null if valid.
 */
function validateHttpUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return "Only http/https URLs are allowed.";
    }
  } catch {
    return "Invalid URL format.";
  }
  return null;
}

const LOCAL_MEDIA_PATH_RE = /^\/[a-zA-Z0-9_\-.]+(?:\/[a-zA-Z0-9_\-.]+)*\/?$/;

export function validateMediaUrl(url: string): string | null {
  if (url.startsWith("/")) {
    if (!LOCAL_MEDIA_PATH_RE.test(url)) return "Invalid local path format.";
    const segments = url.split("/").filter(Boolean);
    if (segments.some(s => s === "." || s === "..")) return "Invalid path segment.";
    return null;
  }
  return validateHttpUrl(url);
}
