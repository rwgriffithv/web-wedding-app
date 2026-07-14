"use server";

import { revalidatePath } from "next/cache";
import { isAdmin } from "@/lib/auth";
import { getString } from "@/lib/form-data";
import { setConfig, setConfigs, getConfig } from "@/lib/repository/site-config";
import { ensureVideoPoster } from "@/lib/thumbnail";
import { deleteThumbnail } from "@/lib/media";

interface SiteConfigState { success?: boolean; error?: string }

const CONFIG_KEYS = [
  "landing_title", "landing_background",
  "rate_limit_max_attempts", "rate_limit_window_seconds",
  "session_max_hours",
  "rsvp_rate_limit_max", "rsvp_rate_limit_window",
  "question_rate_limit_max", "question_rate_limit_window",
  "home_title", "home_subtitle", "home_date", "home_time", "home_location", "home_background_video",
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
  session_max_hours: 10,
  rsvp_rate_limit_max: 10,
  rsvp_rate_limit_window: 10,
  question_rate_limit_max: 10,
  question_rate_limit_window: 10,
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
      if (key === "rate_limit_max_attempts" || key === "rate_limit_window_seconds" || key === "session_max_hours" || key === "rsvp_rate_limit_max" || key === "rsvp_rate_limit_window" || key === "question_rate_limit_max" || key === "question_rate_limit_window") {
        if (!value) {
          return { success: false, error: `"${key}" is required.` };
        }
        const num = parseInt(value, 10);
        const maxVal = key === "session_max_hours" ? 24 : 1000;
        if (!Number.isFinite(num) || num <= 0 || num > maxVal) {
          return { success: false, error: `"${key}" must be a positive number (1–${maxVal}).` };
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
    const existingPoster = getConfig("home_background_video_poster");
    if (videoUrl && videoUrl.startsWith("/api/media/")) {
      const poster = await ensureVideoPoster(videoUrl);
      if (poster) {
        if (existingPoster && existingPoster !== poster) {
          deleteThumbnail(existingPoster);
        }
        setConfig("home_background_video_poster", poster);
      }
    } else if (!videoUrl) {
      if (existingPoster) {
        deleteThumbnail(existingPoster);
      }
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
