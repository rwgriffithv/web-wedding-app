"use server";

import { revalidatePath } from "next/cache";
import { isAdmin } from "@/lib/auth";
import { getString, getInt, validateMediaUrl } from "@/lib/form-data";
import { create, update, getAll, swapSortOrder, deleteOption as deleteOptionRepo } from "@/lib/repository/lodging";
import { setConfig } from "@/lib/repository/site-config";
import { ensureThumbnail } from "@/lib/thumbnail";

interface LodgingState { success?: boolean; error?: string }

export async function addOption(prevState: LodgingState | null, formData: FormData): Promise<LodgingState> {
  if (!(await isAdmin())) return { success: false, error: "Unauthorized" };

  const title = getString(formData, "title");
  const imageUrl = getString(formData, "image_url");
  const url = getString(formData, "url");

  if (!title || !imageUrl || !url) {
    return { success: false, error: "All fields are required." };
  }

  const urlError = validateMediaUrl(url);
  if (urlError) return { success: false, error: `Invalid booking URL. ${urlError}` };

  const imageError = validateMediaUrl(imageUrl);
  if (imageError) return { success: false, error: `Invalid image URL. ${imageError}` };

  try {
    const thumbnailUrl = await ensureThumbnail(imageUrl);
    create({ title, image_url: imageUrl, url, thumbnail_url: thumbnailUrl });
    revalidatePath("/admin/lodging");
    revalidatePath("/guide");
    return { success: true };
  } catch (error) {
    console.error(error);
    return { success: false, error: "Failed to add lodging option." };
  }
}

export async function updateOption(prevState: LodgingState | null, formData: FormData): Promise<LodgingState> {
  if (!(await isAdmin())) return { success: false, error: "Unauthorized" };

  const id = getInt(formData, "option_id");
  if (id === null) return { success: false, error: "Invalid option ID." };

  const title = getString(formData, "title");
  const imageUrl = getString(formData, "image_url");
  const url = getString(formData, "url");

  if (!title || !imageUrl || !url) {
    return { success: false, error: "All fields are required." };
  }

  const urlError = validateMediaUrl(url);
  if (urlError) return { success: false, error: `Invalid booking URL. ${urlError}` };

  const imageError = validateMediaUrl(imageUrl);
  if (imageError) return { success: false, error: `Invalid image URL. ${imageError}` };

  try {
    const existing = getAll().find(o => o.id === id);
    const thumbnailUrl = imageUrl !== existing?.image_url
      ? await ensureThumbnail(imageUrl)
      : existing?.thumbnail_url ?? null;
    update(id, { title, image_url: imageUrl, thumbnail_url: thumbnailUrl, url });
    revalidatePath("/admin/lodging");
    revalidatePath("/guide");
    return { success: true };
  } catch (error) {
    console.error(error);
    return { success: false, error: "Failed to update lodging option." };
  }
}

export async function moveOption(prevState: LodgingState | null, formData: FormData): Promise<LodgingState> {
  if (!(await isAdmin())) return { success: false, error: "Unauthorized" };

  const id = getInt(formData, "option_id");
  const direction = getString(formData, "direction");
  if (id === null || !direction || (direction !== "up" && direction !== "down")) {
    return { success: false, error: "Invalid parameters." };
  }

  try {
    const items = getAll();
    const index = items.findIndex(o => o.id === id);
    if (index === -1) return { success: false, error: "Option not found." };

    const neighborIndex = direction === "up" ? index - 1 : index + 1;
    if (neighborIndex < 0 || neighborIndex >= items.length) {
      return { success: false, error: direction === "up" ? "Already at top." : "Already at bottom." };
    }

    const current = items[index];
    const neighbor = items[neighborIndex];
    swapSortOrder(current.id, current.sort_order, neighbor.id, neighbor.sort_order);

    revalidatePath("/admin/lodging");
    revalidatePath("/guide");
    return { success: true };
  } catch (error) {
    console.error(error);
    return { success: false, error: "Failed to reorder lodging option." };
  }
}

export async function deleteOption(prevState: LodgingState | null, formData: FormData): Promise<LodgingState> {
  if (!(await isAdmin())) return { success: false, error: "Unauthorized" };

  const id = getInt(formData, "option_id");
  if (id === null) return { success: false, error: "Invalid option ID." };

  try {
    deleteOptionRepo(id);
    revalidatePath("/admin/lodging");
    revalidatePath("/guide");
    return { success: true };
  } catch (error) {
    console.error(error);
    return { success: false, error: "Failed to delete lodging option." };
  }
}

export async function saveLodgingText(prevState: LodgingState | null, formData: FormData): Promise<LodgingState> {
  if (!(await isAdmin())) return { success: false, error: "Unauthorized" };

  const text = getString(formData, "lodging_text");
  if (text && text.length > 1000) {
    return { success: false, error: "Intro text must be 1,000 characters or fewer." };
  }
  try {
    setConfig("lodging_text", text ?? "");
    revalidatePath("/admin/lodging");
    revalidatePath("/guide");
    return { success: true };
  } catch (error) {
    console.error(error);
    return { success: false, error: "Failed to save intro text." };
  }
}
