"use server";

import { revalidatePath } from "next/cache";
import { isAdmin } from "@/lib/auth";
import { create, remove } from "@/lib/repository/schedule";

interface ScheduleState { success?: boolean; error?: string }

export async function addItem(prevState: ScheduleState | null, formData: FormData): Promise<ScheduleState> {
  if (!(await isAdmin())) return { error: "Unauthorized" };

  const time = formData.get("time");
  const label = formData.get("label");

  if (typeof time !== "string" || typeof label !== "string" || !time || !label) {
    return { error: "Both fields are required." };
  }

  try {
    create(time, label);
    revalidatePath("/admin/schedule");
    revalidatePath("/schedule");
    revalidatePath("/home");
    return { success: true };
  } catch (error) {
    console.error(error);
    return { error: "Failed to add schedule item." };
  }
}

export async function deleteItem(prevState: ScheduleState | null, formData: FormData): Promise<ScheduleState> {
  if (!(await isAdmin())) return { error: "Unauthorized" };

  const rawId = formData.get("item_id");
  if (typeof rawId !== "string") return { error: "Invalid item ID." };
  const id = parseInt(rawId, 10);
  if (isNaN(id) || id < 1) return { error: "Invalid item ID." };
  remove(id);
  revalidatePath("/admin/schedule");
  revalidatePath("/schedule");
  revalidatePath("/home");
  return { success: true };
}
