"use server";

import { revalidatePath } from "next/cache";
import { isAdmin } from "@/lib/auth";
import { getString } from "@/lib/form-data";
import { setConfig, getConfig } from "@/lib/repository/site-config";
import { ensureVideoPoster } from "@/lib/thumbnail";

interface SiteConfigState { success?: boolean; error?: string }

const CONFIG_KEYS = [
  "landing_title", "landing_background",
  "home_title", "home_subtitle", "home_date", "home_time", "home_location", "home_background_video",
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
};

export async function saveSiteConfig(prevState: SiteConfigState | null, formData: FormData): Promise<SiteConfigState> {
  if (!(await isAdmin())) return { success: false, error: "Unauthorized" };

  try {
    for (const key of CONFIG_KEYS) {
      const value = getString(formData, key) ?? "";
      const maxLen = MAX_LENGTHS[key] ?? 2000;
      if (value.length > maxLen) {
        return { success: false, error: `"${key}" must be ${maxLen} characters or fewer.` };
      }
      setConfig(key, value);
    }

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
