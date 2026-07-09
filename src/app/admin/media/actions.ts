"use server";

import { revalidatePath } from "next/cache";
import { isAdmin } from "@/lib/auth";
import { create, remove } from "@/lib/repository/media";

interface MediaState { success?: boolean; error?: string }

const ALLOWED_MEDIA_TYPES = ["image", "video"] as const;

export async function addItem(prevState: MediaState | null, formData: FormData): Promise<MediaState> {
  if (!(await isAdmin())) return { error: "Unauthorized" };

  const type = formData.get("type") as string;
  const url = formData.get("url") as string;
  const thumbnailUrl = formData.get("thumbnail_url") as string;
  const title = formData.get("title") as string;
  const section = formData.get("section") as string;

  if (!type || !url) {
    return { error: "Type and URL are required." };
  }

  if (!ALLOWED_MEDIA_TYPES.includes(type as "image" | "video")) {
    return { error: "Invalid media type." };
  }

  try {
    create({
      type: type as "image" | "video",
      url,
      thumbnail_url: thumbnailUrl || undefined,
      title: title || undefined,
      section: section || "General",
    });
    revalidatePath("/admin/media");
    revalidatePath("/media");
    return { success: true };
  } catch (error) {
    console.error(error);
    return { success: false, error: "Failed to add media item." };
  }
}

export async function deleteItem(prevState: MediaState | null, formData: FormData): Promise<MediaState> {
  if (!(await isAdmin())) return { error: "Unauthorized" };

  const id = parseInt(formData.get("item_id") as string, 10);
  if (isNaN(id) || id < 1) return { error: "Invalid item ID." };
  remove(id);
  revalidatePath("/admin/media");
  revalidatePath("/media");
  return { success: true };
}
