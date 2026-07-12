"use server";

import { revalidatePath } from "next/cache";
import { isAdmin } from "@/lib/auth";
import { getString, getInt } from "@/lib/form-data";
import { create, update, deleteItem as deleteItemRepo, getAll, swapSortOrder } from "@/lib/repository/schedule";

interface ScheduleState { success?: boolean; error?: string }

export async function addItem(prevState: ScheduleState | null, formData: FormData): Promise<ScheduleState> {
  if (!(await isAdmin())) return { success: false, error: "Unauthorized" };

  const time = getString(formData, "time");
  const label = getString(formData, "label");

  if (!time || !label) {
    return { success: false, error: "Both fields are required." };
  }

  try {
    create(time, label);
    revalidatePath("/admin/schedule");
    revalidatePath("/schedule");
    revalidatePath("/home");
    return { success: true };
  } catch (error) {
    console.error(error);
    return { success: false, error: "Failed to add schedule item." };
  }
}

export async function updateItem(prevState: ScheduleState | null, formData: FormData): Promise<ScheduleState> {
  if (!(await isAdmin())) return { success: false, error: "Unauthorized" };

  const id = getInt(formData, "item_id");
  if (id === null) return { success: false, error: "Invalid item ID." };

  const time = getString(formData, "time");
  const label = getString(formData, "label");

  if (!time || !label) {
    return { success: false, error: "Both fields are required." };
  }

  try {
    update(id, { time, label });
    revalidatePath("/admin/schedule");
    revalidatePath("/schedule");
    revalidatePath("/home");
    return { success: true };
  } catch (error) {
    console.error(error);
    return { success: false, error: "Failed to update schedule item." };
  }
}

export async function moveItem(prevState: ScheduleState | null, formData: FormData): Promise<ScheduleState> {
  if (!(await isAdmin())) return { success: false, error: "Unauthorized" };

  const id = getInt(formData, "item_id");
  const direction = getString(formData, "direction");
  if (id === null || !direction || (direction !== "up" && direction !== "down")) {
    return { success: false, error: "Invalid parameters." };
  }

  try {
    const items = getAll();
    const index = items.findIndex(i => i.id === id);
    if (index === -1) return { success: false, error: "Item not found." };

    const neighborIndex = direction === "up" ? index - 1 : index + 1;
    if (neighborIndex < 0 || neighborIndex >= items.length) {
      return { success: false, error: direction === "up" ? "Already at top." : "Already at bottom." };
    }

    const current = items[index];
    const neighbor = items[neighborIndex];
    swapSortOrder(current.id, current.sort_order, neighbor.id, neighbor.sort_order);

    revalidatePath("/admin/schedule");
    revalidatePath("/schedule");
    revalidatePath("/home");
    return { success: true };
  } catch (error) {
    console.error(error);
    return { success: false, error: "Failed to reorder schedule item." };
  }
}

export async function deleteItem(prevState: ScheduleState | null, formData: FormData): Promise<ScheduleState> {
  if (!(await isAdmin())) return { success: false, error: "Unauthorized" };

  const id = getInt(formData, "item_id");
  if (id === null) return { success: false, error: "Invalid item ID." };

  try {
    deleteItemRepo(id);
    revalidatePath("/admin/schedule");
    revalidatePath("/schedule");
    revalidatePath("/home");
    return { success: true };
  } catch (error) {
    console.error(error);
    return { success: false, error: "Failed to delete schedule item." };
  }
}
