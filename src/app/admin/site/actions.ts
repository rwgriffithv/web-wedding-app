"use server";

import { revalidatePath } from "next/cache";
import { isAdmin } from "@/lib/auth";
import { getString } from "@/lib/form-data";
import { setConfig, setConfigs, getConfig } from "@/lib/repository/site-config";
import { ensureVideoPoster } from "@/lib/thumbnail";
import { deleteThumbnail } from "@/lib/media";

interface SiteConfigState { success?: boolean; error?: string }

interface ConfigField {
  maxLength: number;
  numeric?: { max: number };
  date?: boolean;
}

const CONFIG_SCHEMA: Record<string, ConfigField> = {
  landing_title:              { maxLength: 200 },
  landing_background:         { maxLength: 2000 },
  rate_limit_max_attempts:    { maxLength: 10, numeric: { max: 1000 } },
  rate_limit_window_seconds:  { maxLength: 10, numeric: { max: 1000 } },
  session_max_hours:          { maxLength: 10, numeric: { max: 24 } },
  page_view_debounce_minutes: { maxLength: 10, numeric: { max: 1440 } },
  home_title:                 { maxLength: 200 },
  home_subtitle:              { maxLength: 500 },
  home_date:                  { maxLength: 50 },
  home_time:                  { maxLength: 50 },
  home_location:              { maxLength: 500 },
  home_background_video:      { maxLength: 1000 },
  banner_text:                { maxLength: 500 },
};

const CONFIG_KEYS = Object.keys(CONFIG_SCHEMA) as (keyof typeof CONFIG_SCHEMA)[];

export async function saveSiteConfig(prevState: SiteConfigState | null, formData: FormData): Promise<SiteConfigState> {
  if (!(await isAdmin())) return { success: false, error: "Unauthorized" };

  try {
    const entries: [string, string][] = [];
    for (const key of CONFIG_KEYS) {
      const field = CONFIG_SCHEMA[key];
      const value = getString(formData, key) ?? "";

      if (value.length > field.maxLength) {
        return { success: false, error: `"${key}" must be ${field.maxLength} characters or fewer.` };
      }

      if (field.numeric) {
        if (!value) {
          return { success: false, error: `"${key}" is required.` };
        }
        const num = parseInt(value, 10);
        if (!Number.isFinite(num) || num <= 0 || num > field.numeric.max) {
          return { success: false, error: `"${key}" must be a positive number (1–${field.numeric.max}).` };
        }
      }

      if (field.date && value) {
        const date = new Date(value);
        if (isNaN(date.getTime())) {
          return { success: false, error: `"${key}" must be a valid date.` };
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
