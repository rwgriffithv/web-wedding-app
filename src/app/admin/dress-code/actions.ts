"use server";

import { revalidatePath } from "next/cache";
import { isAdmin } from "@/lib/auth";
import { addImage as addImageRepo, removeImage } from "@/lib/repository/dress-code";

interface ImageState { success?: boolean; error?: string }

export async function addImage(prevState: ImageState | null, formData: FormData): Promise<ImageState> {
  if (!(await isAdmin())) return { error: "Unauthorized" };

  const imageUrl = formData.get("image_url") as string;
  if (!imageUrl) return { error: "Image URL is required." };
  try {
    addImageRepo(imageUrl);
    revalidatePath("/admin/dress-code");
    revalidatePath("/dress-code");
    return { success: true };
  } catch (error) {
    console.error(error);
    return { success: false, error: "Failed to add image." };
  }
}

export async function deleteImage(prevState: ImageState | null, formData: FormData): Promise<ImageState> {
  if (!(await isAdmin())) return { error: "Unauthorized" };

  const id = parseInt(formData.get("image_id") as string, 10);
  if (isNaN(id) || id < 1) return { error: "Invalid image ID." };
  removeImage(id);
  revalidatePath("/admin/dress-code");
  revalidatePath("/dress-code");
  return { success: true };
}
