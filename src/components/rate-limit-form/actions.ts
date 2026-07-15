"use server";

import { revalidatePath } from "next/cache";
import { parseAdminSession, validateSessionForMutation } from "@/lib/auth";
import { getString } from "@/lib/form-data";
import { setConfigs } from "@/lib/repository/site-config";

const ALLOWED_KEYS = new Set([
  "rate_limit_max_attempts",
  "rate_limit_window_seconds",
  "rsvp_rate_limit_max",
  "rsvp_rate_limit_window",
  "question_rate_limit_max",
  "question_rate_limit_window",
]);

interface RateLimitState {
  success?: boolean;
  error?: string;
}

export async function saveRateLimitConfig(
  _prev: RateLimitState | null,
  formData: FormData,
): Promise<RateLimitState> {
  const session = await parseAdminSession();
  if (!session) return { success: false, error: "Unauthorized" };
  if (!(await validateSessionForMutation(session))) return { success: false, error: "Session expired" };

  try {
    const entries: [string, string][] = [];
    for (const key of formData.keys()) {
      if (key === "_key") continue;
      if (!ALLOWED_KEYS.has(key)) {
        return { success: false, error: `Unknown config key: "${key}".` };
      }
      const value = getString(formData, key) ?? "";
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
    console.error(error);
    return { success: false, error: "Failed to save rate limit config." };
  }
}
