import { MEDIA_MAX_FILE_SIZE_MB_DEFAULT } from "@/lib/constants";

const STORAGE_KEY = "media_max_file_size_mb";

/**
 * Read the configured max upload file size from localStorage (client) or
 * fall back to the default. Returns bytes.
 *
 * Used by FileUpload and DressCodeMultiImageForm for client-side pre-validation
 * before uploading to the server.
 */
export function getMaxFileSizeBytes(): number {
  if (typeof window === "undefined") return MEDIA_MAX_FILE_SIZE_MB_DEFAULT * 1024 * 1024;
  const raw = parseInt(localStorage.getItem(STORAGE_KEY) || "", 10);
  return (Number.isFinite(raw) && raw > 0 ? raw : MEDIA_MAX_FILE_SIZE_MB_DEFAULT) * 1024 * 1024;
}
