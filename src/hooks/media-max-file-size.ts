"use client";

import { useCallback, useEffect, useState } from "react";
import { getMaxFileSizeBytes } from "@/lib/upload-limits";
import { getMediaMaxFileSizeAction } from "@/app/admin/media/actions";
import { MEDIA_MAX_FILE_SIZE_MB_KEY } from "@/lib/constants";
import { getCachedValue, setCachedValue } from "@/lib/localstorage-cache";

/**
 * Hook that returns the max upload file size in bytes and a refresh function.
 *
 * Hot path: reads from localStorage synchronously (no network).
 * Cold path: if the cached value is missing, fetches the authoritative
 * value from the server and re-caches it with its configured TTL.
 *
 * While maxBytes is null (no cache yet), consumers should skip client-side
 * pre-validation and let the server decide. The server enforces the limit.
 */
export function useMediaMaxFileSize(): { maxBytes: number | null; refreshMaxBytes: () => Promise<number | null> } {
  const [maxBytes, setMaxBytes] = useState(() => getMaxFileSizeBytes());

  const refreshMaxBytes = useCallback(async () => {
    try {
      const { mb, ttlMs } = await getMediaMaxFileSizeAction();
      const bytes = mb * 1024 * 1024;
      setCachedValue(MEDIA_MAX_FILE_SIZE_MB_KEY, mb, ttlMs);
      setMaxBytes(bytes);
      return bytes;
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    if (getCachedValue<number>(MEDIA_MAX_FILE_SIZE_MB_KEY) === null) {
      getMediaMaxFileSizeAction().then(({ mb, ttlMs }) => {
        const bytes = mb * 1024 * 1024;
        setCachedValue(MEDIA_MAX_FILE_SIZE_MB_KEY, mb, ttlMs);
        setMaxBytes(bytes);
      }).catch(() => {});
    }
  }, []);

  return { maxBytes, refreshMaxBytes };
}
