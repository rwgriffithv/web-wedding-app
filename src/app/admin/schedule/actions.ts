"use server";

import { revalidatePath } from "next/cache";
import { requireSession, validateSessionInDb } from "@/lib/auth";
import { getString, getInt } from "@/lib/form-data";
import { create, update, deleteItem as deleteItemRepo, swapSortOrder } from "@/lib/repository/schedule";
import { setConfig } from "@/lib/repository/site-config";

interface ScheduleState { success?: boolean; error?: string }

const TIME_PATTERN = /^(?:(?:1[0-2]|0?[1-9]):[0-5]\d\s?(?:AM|PM|am|pm)|(?:[01]?\d|2[0-3]):[0-5]\d)$/;

export async function addItem(prevState: ScheduleState | null, formData: FormData): Promise<ScheduleState> {
  const session = await requireSession("admin");
  if (!session) return { success: false, error: "Unauthorized" };
  if (!(await validateSessionInDb(session))) return { success: false, error: "Session expired" };

  const time = getString(formData, "time");
  const label = getString(formData, "label");

  if (!time || !label) {
    return { success: false, error: "Both fields are required." };
  }

  if (!TIME_PATTERN.test(time)) {
    return { success: false, error: "Time must be 12-hour (e.g. \"3:00 PM\") or 24-hour (e.g. \"15:00\")." };
  }

  try {
    create(time, label);
    revalidatePath("/admin/schedule");
    revalidatePath("/guide");
    revalidatePath("/home");
    return { success: true };
  } catch (error) {
    console.error(error);
    return { success: false, error: "Failed to add schedule item." };
  }
}

export async function updateItem(prevState: ScheduleState | null, formData: FormData): Promise<ScheduleState> {
  const session = await requireSession("admin");
  if (!session) return { success: false, error: "Unauthorized" };
  if (!(await validateSessionInDb(session))) return { success: false, error: "Session expired" };

  const id = getInt(formData, "item_id");
  if (id === null) return { success: false, error: "Invalid item ID." };

  const time = getString(formData, "time");
  const label = getString(formData, "label");

  if (!time || !label) {
    return { success: false, error: "Both fields are required." };
  }

  if (!TIME_PATTERN.test(time)) {
    return { success: false, error: "Time must be 12-hour (e.g. \"3:00 PM\") or 24-hour (e.g. \"15:00\")." };
  }

  try {
    update(id, { time, label });
    revalidatePath("/admin/schedule");
    revalidatePath("/guide");
    revalidatePath("/home");
    return { success: true };
  } catch (error) {
    console.error(error);
    return { success: false, error: "Failed to update schedule item." };
  }
}

export async function moveItem(prevState: ScheduleState | null, formData: FormData): Promise<ScheduleState> {
  const session = await requireSession("admin");
  if (!session) return { success: false, error: "Unauthorized" };
  if (!(await validateSessionInDb(session))) return { success: false, error: "Session expired" };

  const id = getInt(formData, "item_id");
  const direction = getString(formData, "direction");
  if (id === null || !direction || (direction !== "up" && direction !== "down")) {
    return { success: false, error: "Invalid parameters." };
  }

  try {
    const result = swapSortOrder(id, direction);
    if (!result.success) return { success: false, error: result.error! };

    revalidatePath("/admin/schedule");
    revalidatePath("/guide");
    revalidatePath("/home");
    return { success: true };
  } catch (error) {
    console.error(error);
    return { success: false, error: "Failed to reorder schedule item." };
  }
}

export async function deleteItem(prevState: ScheduleState | null, formData: FormData): Promise<ScheduleState> {
  const session = await requireSession("admin");
  if (!session) return { success: false, error: "Unauthorized" };
  if (!(await validateSessionInDb(session))) return { success: false, error: "Session expired" };

  const id = getInt(formData, "item_id");
  if (id === null) return { success: false, error: "Invalid item ID." };

  try {
    deleteItemRepo(id);
    revalidatePath("/admin/schedule");
    revalidatePath("/guide");
    revalidatePath("/home");
    return { success: true };
  } catch (error) {
    console.error(error);
    return { success: false, error: "Failed to delete schedule item." };
  }
}

export async function saveScheduleText(prevState: ScheduleState | null, formData: FormData): Promise<ScheduleState> {
  const session = await requireSession("admin");
  if (!session) return { success: false, error: "Unauthorized" };
  if (!(await validateSessionInDb(session))) return { success: false, error: "Session expired" };

  const text = getString(formData, "schedule_text");
  if (text && text.length > 1000) {
    return { success: false, error: "Intro text must be 1,000 characters or fewer." };
  }
  try {
    // Empty string is intentional: admin can clear the intro text entirely.
    // `?? ""` ensures the config key always stores a string (never null).
    setConfig("schedule_text", text ?? "");
    revalidatePath("/admin/schedule");
    revalidatePath("/guide");
    return { success: true };
  } catch (error) {
    console.error(error);
    return { success: false, error: "Failed to save intro text." };
  }
}
