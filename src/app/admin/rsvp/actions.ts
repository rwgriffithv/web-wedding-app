"use server";

import { revalidatePath } from "next/cache";
import { isAdmin } from "@/lib/auth";
import { getString } from "@/lib/form-data";
import { setConfig } from "@/lib/repository/site-config";

interface DeadlineState {
  success?: boolean;
  error?: string;
}

export async function saveRsvpDeadline(
  _prev: DeadlineState | null,
  formData: FormData,
): Promise<DeadlineState> {
  if (!(await isAdmin())) return { success: false, error: "Unauthorized" };

  const value = getString(formData, "rsvp_deadline") ?? "";
  if (value) {
    const date = new Date(value);
    if (isNaN(date.getTime())) {
      return { success: false, error: "Invalid date." };
    }
  }

  setConfig("rsvp_deadline", value);
  revalidatePath("/admin/rsvp");
  revalidatePath("/admin/site");
  return { success: true };
}
