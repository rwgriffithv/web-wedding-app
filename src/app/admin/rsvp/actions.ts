"use server";

import { revalidatePath } from "next/cache";
import { requireSession, validateSessionInDb } from "@/lib/auth";
import { getOptionalString } from "@/lib/form-data";
import { RSVP_DEADLINE_KEY } from "@/lib/constants";
import { logError } from "@/lib/logger";
import { setConfig } from "@/lib/repository/site-config";

interface DeadlineState {
  success?: boolean;
  error?: string;
}

export async function saveRsvpDeadline(
  _prev: DeadlineState | null,
  formData: FormData,
): Promise<DeadlineState> {
  const session = await requireSession("admin");
  if (!session) return { success: false, error: "Unauthorized" };
  if (!(await validateSessionInDb(session))) return { success: false, error: "Session expired" };

  const value = getOptionalString(formData, RSVP_DEADLINE_KEY);
  if (value) {
    const date = new Date(value);
    if (isNaN(date.getTime())) {
      return { success: false, error: "Invalid date." };
    }
  }

  try {
    setConfig(RSVP_DEADLINE_KEY, value);
    revalidatePath("/admin/rsvp");
    revalidatePath("/admin/site");
    revalidatePath("/rsvp");
    return { success: true };
  } catch (error) {
    logError("RsvpAdmin", error);
    return { success: false, error: "Failed to save RSVP deadline." };
  }
}
