"use server";

import { revalidatePath } from "next/cache";
import { requireAdminSessionOrNull, validateSessionInDb } from "@/lib/auth";
import { getString } from "@/lib/form-data";
import { setConfig } from "@/lib/repository/site-config";

interface GiftsState { success?: boolean; error?: string }

export async function saveGiftsText(prevState: GiftsState | null, formData: FormData): Promise<GiftsState> {
  const session = await requireAdminSessionOrNull();
  if (!session) return { success: false, error: "Unauthorized" };
  if (!(await validateSessionInDb(session))) return { success: false, error: "Session expired" };

  const text = getString(formData, "gifts_text");
  if (text && text.length > 1000) {
    return { success: false, error: "Intro text must be 1,000 characters or fewer." };
  }
  try {
    setConfig("gifts_text", text ?? "");
    revalidatePath("/admin/gifts");
    revalidatePath("/guide");
    return { success: true };
  } catch (error) {
    console.error(error);
    return { success: false, error: "Failed to save intro text." };
  }
}
