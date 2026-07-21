"use server";

import { revalidatePath } from "next/cache";
import { requireSession, validateSessionInDb } from "@/lib/auth";
import { getRequiredString } from "@/lib/form-data";
import { GIFTS_TEXT_KEY } from "@/lib/constants";
import { logError } from "@/lib/logger";
import { setConfig } from "@/lib/repository/site-config";

interface GiftsState { success?: boolean; error?: string }

export async function saveGiftsText(prevState: GiftsState | null, formData: FormData): Promise<GiftsState> {
  const session = await requireSession("admin");
  if (!session) return { success: false, error: "Unauthorized" };
  if (!(await validateSessionInDb(session))) return { success: false, error: "Session expired" };

  const text = getRequiredString(formData, GIFTS_TEXT_KEY);
  if (text && text.length > 1000) {
    return { success: false, error: "Intro text must be 1,000 characters or fewer." };
  }
  try {
    setConfig(GIFTS_TEXT_KEY, text ?? "");
    revalidatePath("/admin/gifts");
    revalidatePath("/guide");
    return { success: true };
  } catch (error) {
    logError("Gifts", error);
    return { success: false, error: "Failed to save intro text." };
  }
}
