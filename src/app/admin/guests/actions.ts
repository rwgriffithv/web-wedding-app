"use server";

import { revalidatePath } from "next/cache";
import { isAdmin } from "@/lib/auth";
import { updateGuest as updateGuestRepo, createGuest, getGuestById } from "@/lib/repository/guests";

interface GuestState { success?: boolean; error?: string }

const ALLOWED_TYPES = ["guest", "guest_plus_one"] as const;

export async function updateGuest(prevState: GuestState | null, formData: FormData): Promise<GuestState> {
  if (!(await isAdmin())) return { error: "Unauthorized" };

  const id = parseInt(formData.get("guest_id") as string, 10);
  if (isNaN(id) || id < 1) return { error: "Invalid guest ID." };

  const existing = getGuestById(id);
  if (!existing) return { error: "Guest not found." };
  if (existing.type === "admin") return { error: "Cannot modify admin account." };

  const username = formData.get("username") as string;
  const password = formData.get("password") as string;
  const type = formData.get("type") as string;

  const canRsvpRaw = formData.get("can_rsvp") as string;
  const canBringPlusOneRaw = formData.get("can_bring_plus_one") as string;

  if (password && password.trim().length === 0) {
    return { error: "Password cannot be empty." };
  }

  const canRsvp = canRsvpRaw === "1" ? 1 : 0;
  const canBringPlusOne = canBringPlusOneRaw === "1" ? 1 : 0;

  try {
    updateGuestRepo(id, {
      ...(username ? { username } : {}),
      ...(password && password.trim() ? { password: password.trim() } : {}),
      ...(type && ALLOWED_TYPES.includes(type as "guest" | "guest_plus_one") ? { type } : {}),
      can_rsvp: canRsvp,
      can_bring_plus_one: canBringPlusOne,
    });
    revalidatePath("/admin/guests");
    return { success: true };
  } catch (error) {
    console.error(error);
    return { success: false, error: "Failed to update guest." };
  }
}

export async function addGuest(prevState: GuestState | null, formData: FormData): Promise<GuestState> {
  if (!(await isAdmin())) return { error: "Unauthorized" };

  const displayName = formData.get("display_name") as string;
  const username = formData.get("username") as string;
  const password = formData.get("password") as string;
  const type = formData.get("type") as string;
  const canRsvpRaw = formData.get("can_rsvp") as string;
  const canBringPlusOneRaw = formData.get("can_bring_plus_one") as string;

  if (!displayName || !username || !password) {
    return { success: false, error: "All fields are required." };
  }

  if (!ALLOWED_TYPES.includes(type as "guest" | "guest_plus_one")) {
    return { error: "Invalid guest type." };
  }

  if (password.trim().length === 0) {
    return { error: "Password cannot be empty." };
  }

  const canRsvp = canRsvpRaw === "1" ? 1 : 0;
  const canBringPlusOne = canBringPlusOneRaw === "1" ? 1 : 0;

  try {
    createGuest(username, password, displayName, type as "guest" | "guest_plus_one", null, canRsvp, canBringPlusOne);
    revalidatePath("/admin/guests");
    return { success: true };
  } catch (error) {
    console.error(error);
    return { success: false, error: "Failed to create guest. Username may already exist." };
  }
}
