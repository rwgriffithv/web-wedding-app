"use server";

import { revalidatePath } from "next/cache";
import { isAdmin } from "@/lib/auth";
import { getString } from "@/lib/form-data";
import { setConfig, setConfigs, getConfig } from "@/lib/repository/site-config";
import { ensureVideoPoster } from "@/lib/thumbnail";

interface SiteConfigState { success?: boolean; error?: string }

const CONFIG_KEYS = [
  "landing_title", "landing_background",
  "home_title", "home_subtitle", "home_date", "home_time", "home_location", "home_background_video",
  "rate_limit_max_attempts", "rate_limit_window_seconds",
  "rsvp_deadline",
];

const MAX_LENGTHS: Record<string, number> = {
  landing_title: 200,
  home_title: 200,
  home_subtitle: 500,
  home_date: 50,
  home_time: 50,
  home_location: 500,
  landing_background: 2000,
  home_background_video: 2000,
  rate_limit_max_attempts: 10,
  rate_limit_window_seconds: 10,
  rsvp_deadline: 50,
};

export async function saveSiteConfig(prevState: SiteConfigState | null, formData: FormData): Promise<SiteConfigState> {
  if (!(await isAdmin())) return { success: false, error: "Unauthorized" };

  try {
    const entries: [string, string][] = [];
    for (const key of CONFIG_KEYS) {
      const value = getString(formData, key) ?? "";
      const maxLen = MAX_LENGTHS[key] ?? 2000;
      if (value.length > maxLen) {
        return { success: false, error: `"${key}" must be ${maxLen} characters or fewer.` };
      }
      if (key === "rate_limit_max_attempts" || key === "rate_limit_window_seconds") {
        if (!value) {
          return { success: false, error: `"${key}" is required.` };
        }
        const num = parseInt(value, 10);
        if (!Number.isFinite(num) || num <= 0 || num > 1000) {
          return { success: false, error: `"${key}" must be a positive number (1–1000).` };
        }
      }
      if (key === "rsvp_deadline" && value) {
        const date = new Date(value);
        if (isNaN(date.getTime())) {
          return { success: false, error: `"rsvp_deadline" must be a valid date.` };
        }
      }
      entries.push([key, value]);
    }
    setConfigs(entries);

    const videoUrl = getString(formData, "home_background_video") ?? "";
    if (videoUrl && videoUrl.startsWith("/api/media/")) {
      const existingPoster = getConfig("home_background_video_poster");
      const poster = await ensureVideoPoster(videoUrl, existingPoster);
      if (poster && poster !== existingPoster) {
        setConfig("home_background_video_poster", poster);
      }
    } else if (!videoUrl) {
      setConfig("home_background_video_poster", "");
    }

    revalidatePath("/admin/site");
    revalidatePath("/");
    revalidatePath("/home");
    return { success: true };
  } catch (error) {
    console.error(error);
    return { success: false, error: "Failed to save configuration." };
  }
}
