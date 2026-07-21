import { MEDIA_MAX_FILE_SIZE_MB_KEY } from "@/lib/constants";
import { getCachedValue } from "@/lib/localstorage-cache";

/**
 * Read the configured max upload file size from localStorage (client).
 * Returns the value in bytes, or null if no cached value exists.
 *
 * When null, the consumer should skip client-side pre-validation and let
 * the server decide. The server always enforces the authoritative limit.
 */
export function getMaxFileSizeBytes(): number | null {
  if (typeof window === "undefined") return null;
  const cached = getCachedValue<number>(MEDIA_MAX_FILE_SIZE_MB_KEY);
  if (cached !== null && Number.isFinite(cached) && cached >= 0) {
    return cached * 1024 * 1024;
  }
  return null;
}
