import { getConfig } from "@/lib/repository/site-config";
import {
  AUTO_BAN_THRESHOLD_DEFAULT,
  AUTO_BAN_WINDOW_DEFAULT,
  SUSPICIOUS_THRESHOLD_DEFAULT,
  MEDIA_MAX_FILE_SIZE_MB_KEY,
  MEDIA_MAX_FILE_SIZE_MB_DEFAULT,
  MEDIA_MAX_FILE_SIZE_TTL_SECONDS_KEY,
  MEDIA_MAX_FILE_SIZE_TTL_SECONDS_DEFAULT,
  SESSION_MAX_HOURS_KEY,
  SESSION_MAX_HOURS_DEFAULT,
  AUTO_BAN_LOGIN_THRESHOLD_KEY,
  AUTO_BAN_WINDOW_SECONDS_KEY,
  SUSPICIOUS_IP_THRESHOLD_KEY,
  PAGE_VIEW_DEBOUNCE_MINUTES_KEY,
  PAGE_VIEW_DEBOUNCE_MINUTES_DEFAULT,
} from "@/lib/constants";

export function getSessionMaxSeconds(): number {
  const hours = parseFloat(getConfig(SESSION_MAX_HOURS_KEY));
  const seconds = (Number.isFinite(hours) && hours > 0 ? Math.min(hours, SESSION_MAX_HOURS_DEFAULT) : SESSION_MAX_HOURS_DEFAULT) * 60 * 60;
  return Math.max(1, seconds);
}

export function getAutoBanConfig(): { threshold: number; windowSeconds: number } {
  const threshold = parseInt(getConfig(AUTO_BAN_LOGIN_THRESHOLD_KEY), 10) || AUTO_BAN_THRESHOLD_DEFAULT;
  const windowSeconds = parseInt(getConfig(AUTO_BAN_WINDOW_SECONDS_KEY), 10) || AUTO_BAN_WINDOW_DEFAULT;
  return { threshold, windowSeconds };
}

export function getSuspiciousConfig(): { threshold: number } {
  const threshold = parseInt(getConfig(SUSPICIOUS_IP_THRESHOLD_KEY), 10) || SUSPICIOUS_THRESHOLD_DEFAULT;
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
  const minutes = parseInt(getConfig(PAGE_VIEW_DEBOUNCE_MINUTES_KEY), 10);
  return Number.isFinite(minutes) && minutes >= 0 ? Math.min(minutes, 1440) : PAGE_VIEW_DEBOUNCE_MINUTES_DEFAULT;
}

export function getMediaMaxFileSizeMb(): number {
  const mb = parseInt(getConfig(MEDIA_MAX_FILE_SIZE_MB_KEY), 10);
  return Number.isFinite(mb) && mb >= 0 ? mb : MEDIA_MAX_FILE_SIZE_MB_DEFAULT;
}

export function getMediaMaxFileSizeTtlSeconds(): number {
  const ttl = parseInt(getConfig(MEDIA_MAX_FILE_SIZE_TTL_SECONDS_KEY), 10);
  return Number.isFinite(ttl) && ttl >= 0 ? ttl : MEDIA_MAX_FILE_SIZE_TTL_SECONDS_DEFAULT;
}
