"use server";

import { revalidatePath } from "next/cache";
import { requireSession, validateSessionInDb } from "@/lib/auth";
import { getRequiredString, getOptionalString } from "@/lib/form-data";
import { logError } from "@/lib/logger";
import { setConfig, setConfigs, getConfig } from "@/lib/repository/site-config";
import { HOME_BACKGROUND_VIDEO_POSTER_KEY, HOME_TITLE_KEY, HOME_DATE_KEY, HOME_TIME_KEY, HOME_VENUE_KEY, HOME_LOCATION_KEY, HOME_BACKGROUND_VIDEO_KEY, BANNER_TEXT_KEY, LANDING_TITLE_KEY, LANDING_BACKGROUND_KEY } from "@/lib/constants";
import { ensureVideoPoster } from "@/lib/thumbnail";
import { deleteThumbnail } from "@/lib/media";

interface SiteConfigState { success?: boolean; error?: string }

interface ConfigField {
  maxLength: number;
  numeric?: { max: number };
  date?: boolean;
}

const CONFIG_SCHEMA: Record<string, ConfigField> = {
  [LANDING_TITLE_KEY]:              { maxLength: 200 },
  [LANDING_BACKGROUND_KEY]:         { maxLength: 2000 },
  [HOME_TITLE_KEY]:                 { maxLength: 200 },
  [HOME_DATE_KEY]:                  { maxLength: 50 },
  [HOME_TIME_KEY]:                  { maxLength: 50 },
  [HOME_VENUE_KEY]:                 { maxLength: 500 },
  [HOME_LOCATION_KEY]:              { maxLength: 500 },
  [HOME_BACKGROUND_VIDEO_KEY]:      { maxLength: 1000 },
  [BANNER_TEXT_KEY]:                { maxLength: 500 },
};

const CONFIG_KEYS = Object.keys(CONFIG_SCHEMA) as (keyof typeof CONFIG_SCHEMA)[];

export async function saveSiteConfig(prevState: SiteConfigState | null, formData: FormData): Promise<SiteConfigState> {
  const session = await requireSession("admin");
  if (!session) return { success: false, error: "Unauthorized" };
  if (!(await validateSessionInDb(session))) return { success: false, error: "Session expired" };

  try {
    const entries: [string, string][] = [];
    for (const key of CONFIG_KEYS) {
      const field = CONFIG_SCHEMA[key];
      const value = getOptionalString(formData, key);

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

    const videoUrl = getOptionalString(formData, HOME_BACKGROUND_VIDEO_KEY);
    const existingPoster = getConfig(HOME_BACKGROUND_VIDEO_POSTER_KEY);
    try {
      if (videoUrl && videoUrl.startsWith("/api/media/")) {
        const poster = await ensureVideoPoster(videoUrl);
        if (poster) {
          if (existingPoster && existingPoster !== poster) {
            deleteThumbnail(existingPoster);
          }
          setConfig(HOME_BACKGROUND_VIDEO_POSTER_KEY, poster);
        }
      } else if (!videoUrl) {
        if (existingPoster) {
          deleteThumbnail(existingPoster);
        }
        setConfig(HOME_BACKGROUND_VIDEO_POSTER_KEY, "");
      }
    } catch {
      // Poster generation is best-effort — text configs are already saved
    }

    revalidatePath("/admin/site");
    revalidatePath("/");
    revalidatePath("/home");
    return { success: true };
  } catch (error) {
    logError("Site", error);
    return { success: false, error: "Failed to save configuration." };
  }
}
