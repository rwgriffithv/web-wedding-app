"use server";

import { revalidatePath } from "next/cache";
import { isAdmin } from "@/lib/auth";
import { getString, getInt, validateMediaUrl } from "@/lib/form-data";
import { createImage, deleteImage as deleteImageRepo, getImages, swapSortOrder } from "@/lib/repository/dress-code";
import { setConfig } from "@/lib/repository/site-config";
import { ensureThumbnail } from "@/lib/thumbnail";

interface DressCodeState { success?: boolean; error?: string }

export async function addImage(prevState: DressCodeState | null, formData: FormData): Promise<DressCodeState> {
  if (!(await isAdmin())) return { success: false, error: "Unauthorized" };

  const imageUrl = getString(formData, "image_url");
  if (!imageUrl) return { success: false, error: "Image URL is required." };
  const urlError = validateMediaUrl(imageUrl);
  if (urlError) return { success: false, error: urlError };

  try {
    const thumbnailUrl = await ensureThumbnail(imageUrl);
    createImage(imageUrl, thumbnailUrl ?? undefined);
    revalidatePath("/admin/dress-code");
    revalidatePath("/guide");
    return { success: true };
  } catch (error) {
    console.error(error);
    return { success: false, error: "Failed to add image." };
  }
}

export async function deleteImage(prevState: DressCodeState | null, formData: FormData): Promise<DressCodeState> {
  if (!(await isAdmin())) return { success: false, error: "Unauthorized" };

  const id = getInt(formData, "image_id");
  if (id === null) return { success: false, error: "Invalid image ID." };

  try {
    deleteImageRepo(id);
    revalidatePath("/admin/dress-code");
    revalidatePath("/guide");
    return { success: true };
  } catch (error) {
    console.error(error);
    return { success: false, error: "Failed to delete image." };
  }
}

export async function moveImage(prevState: DressCodeState | null, formData: FormData): Promise<DressCodeState> {
  if (!(await isAdmin())) return { success: false, error: "Unauthorized" };

  const id = getInt(formData, "image_id");
  const direction = getString(formData, "direction");
  if (id === null || !direction || (direction !== "up" && direction !== "down")) {
    return { success: false, error: "Invalid parameters." };
  }

  try {
    const images = getImages();
    const index = images.findIndex(i => i.id === id);
    if (index === -1) return { success: false, error: "Image not found." };

    const neighborIndex = direction === "up" ? index - 1 : index + 1;
    if (neighborIndex < 0 || neighborIndex >= images.length) {
      return { success: false, error: direction === "up" ? "Already at top." : "Already at bottom." };
    }

    const current = images[index];
    const neighbor = images[neighborIndex];
    swapSortOrder(current.id, current.sort_order, neighbor.id, neighbor.sort_order);

    revalidatePath("/admin/dress-code");
    revalidatePath("/guide");
    return { success: true };
  } catch (error) {
    console.error(error);
    return { success: false, error: "Failed to reorder image." };
  }
}

export async function saveDressCodeText(prevState: DressCodeState | null, formData: FormData): Promise<DressCodeState> {
  if (!(await isAdmin())) return { success: false, error: "Unauthorized" };

  const text = getString(formData, "dress_code_text");
  if (text && text.length > 5000) {
    return { success: false, error: "Description must be 5,000 characters or fewer." };
  }
  try {
    setConfig("dress_code_text", text ?? "");
    revalidatePath("/admin/dress-code");
    revalidatePath("/guide");
    return { success: true };
  } catch (error) {
    console.error(error);
    return { success: false, error: "Failed to save dress code description." };
  }
}
