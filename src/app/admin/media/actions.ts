"use server";

import { revalidatePath } from "next/cache";
import { requireSession, validateSessionInDb } from "@/lib/auth";
import { getRequiredString, getOptionalString, getInt, validateMediaUrl } from "@/lib/form-data";
import { logError } from "@/lib/logger";
import { create, deleteItem as deleteItemRepo, update, swapItemSortOrder, createTab, updateTab, deleteTab as deleteTabRepo, swapTabSortOrder } from "@/lib/repository/media";
import { setConfig } from "@/lib/repository/site-config";
import { ensureThumbnail } from "@/lib/thumbnail";
import { detectMediaType } from "@/lib/media";
import { getMediaMaxFileSizeMb, getMediaMaxFileSizeTtlMs } from "@/lib/site-config";
import { MEDIA_MAX_FILE_SIZE_MB_KEY, MEDIA_MAX_FILE_SIZE_TTL_MS_KEY } from "@/lib/constants";

interface MediaState { success?: boolean; error?: string; tabId?: number; slug?: string }

function toSlug(label: string): string {
  return label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export async function createTabInline(prevState: MediaState | null, formData: FormData): Promise<MediaState> {
  const session = await requireSession("admin");
  if (!session) return { success: false, error: "Unauthorized" };
  if (!(await validateSessionInDb(session))) return { success: false, error: "Session expired" };

  const name = getRequiredString(formData, "tab_name");
  if (!name?.trim()) return { success: false, error: "Tab name is required." };

  const slug = toSlug(name.trim());
  if (!slug) return { success: false, error: "Invalid tab name." };

  try {
    const tab = createTab({ slug, label: name.trim() });
    revalidatePath("/admin/media");
    revalidatePath("/media");
    return { success: true, tabId: tab.id, slug: tab.slug };
  } catch (error) {
    logError("Media", error);
    return { success: false, error: "Failed to create tab. A tab with this name may already exist." };
  }
}

export async function renameTab(prevState: MediaState | null, formData: FormData): Promise<MediaState> {
  const session = await requireSession("admin");
  if (!session) return { success: false, error: "Unauthorized" };
  if (!(await validateSessionInDb(session))) return { success: false, error: "Session expired" };

  const id = getInt(formData, "tab_id");
  const label = getRequiredString(formData, "tab_label");
  if (id === null || !label?.trim()) return { success: false, error: "Tab ID and label are required." };

  try {
    updateTab(id, { label: label.trim() });
    revalidatePath("/admin/media");
    revalidatePath("/media");
    return { success: true };
  } catch (error) {
    logError("Media", error);
    return { success: false, error: "Failed to rename tab." };
  }
}

export async function deleteTab(prevState: MediaState | null, formData: FormData): Promise<MediaState> {
  const session = await requireSession("admin");
  if (!session) return { success: false, error: "Unauthorized" };
  if (!(await validateSessionInDb(session))) return { success: false, error: "Session expired" };

  const id = getInt(formData, "tab_id");
  if (id === null) return { success: false, error: "Invalid tab ID." };

  try {
    deleteTabRepo(id);
    revalidatePath("/admin/media");
    revalidatePath("/media");
    return { success: true };
  } catch (error) {
    logError("Media", error);
    return { success: false, error: "Failed to delete tab." };
  }
}

export async function addItem(prevState: MediaState | null, formData: FormData): Promise<MediaState> {
  const session = await requireSession("admin");
  if (!session) return { success: false, error: "Unauthorized" };
  if (!(await validateSessionInDb(session))) return { success: false, error: "Session expired" };

  const url = getRequiredString(formData, "url");
  const title = getOptionalString(formData, "title");
  const section = getOptionalString(formData, "section");

  if (!url) {
    return { success: false, error: "URL is required." };
  }

  const urlError = validateMediaUrl(url);
  if (urlError) return { success: false, error: `Invalid URL: ${urlError}` };

  const type = detectMediaType(url);

  try {
    const thumbnailUrl = await ensureThumbnail(url);
    create({
      type,
      url,
      thumbnail_url: thumbnailUrl ?? undefined,
      title: title || undefined,
      section: section || "General",
    });
    revalidatePath("/admin/media");
    revalidatePath("/media");
    return { success: true };
  } catch (error) {
    logError("Media", error);
    return { success: false, error: "Failed to add media item." };
  }
}

export async function deleteItem(prevState: MediaState | null, formData: FormData): Promise<MediaState> {
  const session = await requireSession("admin");
  if (!session) return { success: false, error: "Unauthorized" };
  if (!(await validateSessionInDb(session))) return { success: false, error: "Session expired" };

  const id = getInt(formData, "item_id");
  if (id === null) return { success: false, error: "Invalid item ID." };

  try {
    deleteItemRepo(id);
    revalidatePath("/admin/media");
    revalidatePath("/media");
    return { success: true };
  } catch (error) {
    logError("Media", error);
    return { success: false, error: "Failed to delete media item." };
  }
}

export async function updateItem(prevState: MediaState | null, formData: FormData): Promise<MediaState> {
  const session = await requireSession("admin");
  if (!session) return { success: false, error: "Unauthorized" };
  if (!(await validateSessionInDb(session))) return { success: false, error: "Session expired" };

  const id = getInt(formData, "item_id");
  if (id === null) return { success: false, error: "Invalid item ID." };

  const title = getOptionalString(formData, "title");
  const section = getOptionalString(formData, "section");

  const patch: { title?: string; section?: string } = {};
  if (title) patch.title = title;
  if (section) patch.section = section;

  try {
    update(id, patch);
    revalidatePath("/admin/media");
    revalidatePath("/media");
    return { success: true };
  } catch (error) {
    logError("Media", error);
    return { success: false, error: "Failed to update media item." };
  }
}

export async function moveItem(prevState: MediaState | null, formData: FormData): Promise<MediaState> {
  const session = await requireSession("admin");
  if (!session) return { success: false, error: "Unauthorized" };
  if (!(await validateSessionInDb(session))) return { success: false, error: "Session expired" };

  const id = getInt(formData, "item_id");
  const direction = getOptionalString(formData, "direction");
  if (id === null || !direction || (direction !== "up" && direction !== "down")) {
    return { success: false, error: "Invalid parameters." };
  }

  try {
    const result = swapItemSortOrder(id, direction);
    if (!result.success) return { success: false, error: result.error ?? "Unknown error" };

    revalidatePath("/admin/media");
    revalidatePath("/media");
    return { success: true };
  } catch (error) {
    logError("Media", error);
    return { success: false, error: "Failed to reorder media item." };
  }
}

export async function moveTab(prevState: MediaState | null, formData: FormData): Promise<MediaState> {
  const session = await requireSession("admin");
  if (!session) return { success: false, error: "Unauthorized" };
  if (!(await validateSessionInDb(session))) return { success: false, error: "Session expired" };

  const id = getInt(formData, "tab_id");
  const direction = getOptionalString(formData, "direction");
  if (id === null || !direction || (direction !== "up" && direction !== "down")) {
    return { success: false, error: "Invalid parameters." };
  }

  try {
    const result = swapTabSortOrder(id, direction);
    if (!result.success) return { success: false, error: result.error ?? "Unknown error" };

    revalidatePath("/admin/media");
    revalidatePath("/media");
    return { success: true };
  } catch (error) {
    logError("Media", error);
    return { success: false, error: "Failed to reorder tab." };
  }
}

export async function getMediaMaxFileSizeAction(): Promise<{ mb: number; ttlMs: number }> {
  return { mb: getMediaMaxFileSizeMb(), ttlMs: getMediaMaxFileSizeTtlMs() };
}

interface SettingsState { success?: boolean; error?: string }

export async function saveMediaSettings(_prevState: SettingsState | null, formData: FormData): Promise<SettingsState> {
  const session = await requireSession("admin");
  if (!session) return { success: false, error: "Unauthorized" };
  if (!(await validateSessionInDb(session))) return { success: false, error: "Session expired" };

  const raw = getRequiredString(formData, MEDIA_MAX_FILE_SIZE_MB_KEY);
  if (!raw) return { success: false, error: "Max file size is required." };
  const n = parseInt(raw, 10);
  if (!Number.isFinite(n) || n < 0) return { success: false, error: "Max file size must be a non-negative number." };

  const ttlRaw = getOptionalString(formData, MEDIA_MAX_FILE_SIZE_TTL_MS_KEY);
  if (ttlRaw === "") return { success: false, error: "Cache duration is required." };
  const ttl = parseInt(ttlRaw, 10);
  if (!Number.isFinite(ttl) || ttl < 0) return { success: false, error: "Cache duration must be a non-negative number." };

  try {
    setConfig(MEDIA_MAX_FILE_SIZE_MB_KEY, String(n));
    setConfig(MEDIA_MAX_FILE_SIZE_TTL_MS_KEY, String(ttl));
    revalidatePath("/admin/media");
    return { success: true };
  } catch (error) {
    logError("Media", error);
    return { success: false, error: "Failed to save media settings." };
  }
}
