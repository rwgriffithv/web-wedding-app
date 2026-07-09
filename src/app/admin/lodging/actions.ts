"use server";

import { revalidatePath } from "next/cache";
import { isAdmin } from "@/lib/auth";
import { create, remove } from "@/lib/repository/lodging";

interface LodgingState { success?: boolean; error?: string }

export async function addOption(prevState: LodgingState | null, formData: FormData): Promise<LodgingState> {
  if (!(await isAdmin())) return { error: "Unauthorized" };

  const title = formData.get("title") as string;
  const imageUrl = formData.get("image_url") as string;
  const url = formData.get("url") as string;

  if (!title || !imageUrl || !url) {
    return { error: "All fields are required." };
  }

  try {
    new URL(url);
    new URL(imageUrl);
  } catch {
    return { error: "Invalid URL format." };
  }

  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    return { error: "Invalid booking URL. Only http/https URLs are allowed." };
  }
  if (!imageUrl.startsWith("http://") && !imageUrl.startsWith("https://")) {
    return { error: "Invalid image URL. Only http/https URLs are allowed." };
  }

  try {
    create(title, imageUrl, url);
    revalidatePath("/admin/lodging");
    revalidatePath("/lodging");
    return { success: true };
  } catch (error) {
    console.error(error);
    return { success: false, error: "Failed to add lodging option." };
  }
}

export async function deleteOption(prevState: LodgingState | null, formData: FormData): Promise<LodgingState> {
  if (!(await isAdmin())) return { error: "Unauthorized" };

  const id = parseInt(formData.get("option_id") as string, 10);
  if (isNaN(id) || id < 1) return { error: "Invalid option ID." };
  remove(id);
  revalidatePath("/admin/lodging");
  revalidatePath("/lodging");
  return { success: true };
}
