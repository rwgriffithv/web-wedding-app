import { getConfig } from "@/lib/repository/site-config";
import {
  RATE_LIMIT_MAX_ATTEMPTS_DEFAULT,
  RATE_LIMIT_WINDOW_SECONDS_DEFAULT,
  AUTO_BAN_THRESHOLD_DEFAULT,
  AUTO_BAN_WINDOW_DEFAULT,
  SUSPICIOUS_THRESHOLD_DEFAULT,
  MEDIA_MAX_FILE_SIZE_MB_DEFAULT,
} from "@/lib/constants";

export function getSessionMaxSeconds(): number {
  const hours = parseFloat(getConfig("session_max_hours"));
  const seconds = (Number.isFinite(hours) && hours > 0 ? Math.min(hours, 24) : 24) * 60 * 60;
  return Math.max(1, seconds);
}

export function getAutoBanConfig(): { threshold: number; windowSeconds: number } {
  const threshold = parseInt(getConfig("auto_ban_login_threshold"), 10) || AUTO_BAN_THRESHOLD_DEFAULT;
  const windowSeconds = parseInt(getConfig("auto_ban_window_seconds"), 10) || AUTO_BAN_WINDOW_DEFAULT;
  return { threshold, windowSeconds };
}

export function getSuspiciousConfig(): { threshold: number } {
  const threshold = parseInt(getConfig("suspicious_ip_threshold"), 10) || SUSPICIOUS_THRESHOLD_DEFAULT;
  return { threshold };
}

export interface RateLimitConfig {
  maxAttempts: number;
  windowMs: number;
}

export function getRateLimitConfig(
  maxKey: string,
  windowKey: string,
  defaultMax: number,
  defaultWindowSeconds: number,
): RateLimitConfig {
  const max = parseInt(getConfig(maxKey), 10);
  const windowSeconds = parseInt(getConfig(windowKey), 10);
  return {
    maxAttempts: Number.isFinite(max) && max > 0 ? max : defaultMax,
    windowMs: (Number.isFinite(windowSeconds) && windowSeconds > 0 ? windowSeconds : defaultWindowSeconds) * 1000,
  };
}

export function getPageViewDebounceMinutes(): number {
  const minutes = parseInt(getConfig("page_view_debounce_minutes"), 10);
  return Number.isFinite(minutes) && minutes >= 0 ? Math.min(minutes, 1440) : 15;
}

export function getMediaMaxFileSizeMb(): number {
  const mb = parseInt(getConfig("media_max_file_size_mb"), 10);
  return Number.isFinite(mb) && mb > 0 ? mb : MEDIA_MAX_FILE_SIZE_MB_DEFAULT;
}
