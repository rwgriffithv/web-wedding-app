"use server";

import { revalidatePath } from "next/cache";
import { isAdmin } from "@/lib/auth";
import { setConfig } from "@/lib/repository/site-config";

interface SiteConfigState { success?: boolean; error?: string }

const CONFIG_KEYS = [
  "landing_title", "landing_background",
  "home_title", "home_subtitle", "home_date", "home_location", "home_background_video",
  "dress_code_text",
];

export async function saveSiteConfig(prevState: SiteConfigState | null, formData: FormData): Promise<SiteConfigState> {
  if (!(await isAdmin())) return { error: "Unauthorized" };

  try {
    for (const key of CONFIG_KEYS) {
      const value = formData.get(key);
      setConfig(key, value?.toString() ?? "");
    }
    revalidatePath("/admin/site");
    revalidatePath("/");
    revalidatePath("/home");
    revalidatePath("/dress-code");
    return { success: true };
  } catch (error) {
    console.error(error);
    return { success: false, error: "Failed to save configuration." };
  }
}
