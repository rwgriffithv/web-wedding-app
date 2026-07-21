"use server";

import { revalidatePath } from "next/cache";
import { requireSession, validateSessionInDb } from "@/lib/auth";
import { getOptionalString } from "@/lib/form-data";
import { logError } from "@/lib/logger";
import { setConfigs } from "@/lib/repository/site-config";
import {
  LOGIN_RATE_LIMIT_MAX_KEY,
  LOGIN_RATE_LIMIT_WINDOW_SECONDS_KEY,
  RSVP_RATE_LIMIT_MAX_KEY,
  RSVP_RATE_LIMIT_WINDOW_SECONDS_KEY,
  QUESTION_RATE_LIMIT_MAX_KEY,
  QUESTION_RATE_LIMIT_WINDOW_SECONDS_KEY,
} from "@/lib/constants";

const ALLOWED_KEYS = new Set([
  LOGIN_RATE_LIMIT_MAX_KEY,
  LOGIN_RATE_LIMIT_WINDOW_SECONDS_KEY,
  RSVP_RATE_LIMIT_MAX_KEY,
  RSVP_RATE_LIMIT_WINDOW_SECONDS_KEY,
  QUESTION_RATE_LIMIT_MAX_KEY,
  QUESTION_RATE_LIMIT_WINDOW_SECONDS_KEY,
]);

interface RateLimitState {
  success?: boolean;
  error?: string;
}

export async function saveRateLimitConfig(
  _prev: RateLimitState | null,
  formData: FormData,
): Promise<RateLimitState> {
  const session = await requireSession("admin");
  if (!session) return { success: false, error: "Unauthorized" };
  if (!(await validateSessionInDb(session))) return { success: false, error: "Session expired" };

  try {
    const entries: [string, string][] = [];
    for (const key of formData.keys()) {
      if (key === "_key") continue;
      if (!ALLOWED_KEYS.has(key)) {
        return { success: false, error: `Unknown config key: "${key}".` };
      }
      const value = getOptionalString(formData, key);
      const num = parseInt(value, 10);
      if (!Number.isFinite(num) || num <= 0 || num > 1000) {
        return {
          success: false,
          error: `"${key}" must be a positive number (1–1000).`,
        };
      }
      entries.push([key, value]);
    }
    if (entries.length === 0) {
      return { success: false, error: "No fields to save." };
    }

    setConfigs(entries);
    revalidatePath("/admin/rsvp");
    revalidatePath("/admin/help");
    revalidatePath("/admin/site");
    revalidatePath("/admin/security");
    return { success: true };
  } catch (error) {
    logError("RateLimitForm", error);
    return { success: false, error: "Failed to save rate limit config." };
  }
}
