"use server";

import { revalidatePath } from "next/cache";
import { requireSession, validateSessionInDb } from "@/lib/auth";
import { getRequiredString, getOptionalString, getInt, validateMediaUrl } from "@/lib/form-data";
import { createImage, createImages, deleteImage as deleteImageRepo, swapSortOrder } from "@/lib/repository/dress-code";
import { setConfig } from "@/lib/repository/site-config";
import { ensureThumbnail } from "@/lib/thumbnail";
import { deleteThumbnail } from "@/lib/media";

interface DressCodeState { success?: boolean; error?: string }

export async function addImage(prevState: DressCodeState | null, formData: FormData): Promise<DressCodeState> {
  const session = await requireSession("admin");
  if (!session) return { success: false, error: "Unauthorized" };
  if (!(await validateSessionInDb(session))) return { success: false, error: "Session expired" };

  const rawUrls = formData.getAll("image_url");
  const urls = rawUrls.filter((v): v is string => typeof v === "string" && v.length > 0);

  if (urls.length === 0) return { success: false, error: "Image URL is required." };

  for (const url of urls) {
    const urlError = validateMediaUrl(url);
    if (urlError) return { success: false, error: `Invalid URL: ${urlError}` };
  }

  try {
    const thumbnails = await Promise.all(urls.map(url => ensureThumbnail(url)));
    try {
      if (urls.length === 1) {
        createImage(urls[0], thumbnails[0] ?? undefined);
      } else {
        createImages(urls.map((url, i) => ({ imageUrl: url, thumbnailUrl: thumbnails[i] ?? undefined })));
      }
    } catch (dbError) {
      for (const thumb of thumbnails) {
        if (thumb) deleteThumbnail(thumb);
      }
      throw dbError;
    }
    revalidatePath("/admin/dress-code");
    revalidatePath("/guide");
    return { success: true };
  } catch (error) {
    console.error(error);
    return { success: false, error: "Failed to add image." };
  }
}

export async function deleteImage(prevState: DressCodeState | null, formData: FormData): Promise<DressCodeState> {
  const session = await requireSession("admin");
  if (!session) return { success: false, error: "Unauthorized" };
  if (!(await validateSessionInDb(session))) return { success: false, error: "Session expired" };

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
  const session = await requireSession("admin");
  if (!session) return { success: false, error: "Unauthorized" };
  if (!(await validateSessionInDb(session))) return { success: false, error: "Session expired" };

  const id = getInt(formData, "image_id");
  const direction = getOptionalString(formData, "direction");
  if (id === null || !direction || (direction !== "up" && direction !== "down")) {
    return { success: false, error: "Invalid parameters." };
  }

  try {
    const result = swapSortOrder(id, direction);
    if (!result.success) return { success: false, error: result.error! };

    revalidatePath("/admin/dress-code");
    revalidatePath("/guide");
    return { success: true };
  } catch (error) {
    console.error(error);
    return { success: false, error: "Failed to reorder image." };
  }
}

export async function saveDressCodeText(prevState: DressCodeState | null, formData: FormData): Promise<DressCodeState> {
  const session = await requireSession("admin");
  if (!session) return { success: false, error: "Unauthorized" };
  if (!(await validateSessionInDb(session))) return { success: false, error: "Session expired" };

  const text = getRequiredString(formData, "dress_code_text");
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
