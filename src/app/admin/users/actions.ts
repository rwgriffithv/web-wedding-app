"use server";

import { revalidatePath } from "next/cache";
import { requireSession, validateSessionInDb } from "@/lib/auth";
import { getEnvConfig } from "@/lib/env";
import { getRequiredString, getOptionalString, getInt } from "@/lib/form-data";
import { createUser as createUserRepo, updateUser as updateUserRepo, deleteUser as deleteUserRepo, getUserById } from "@/lib/repository/users";
import { revokeSessionsByPasswordChange, clearPasswordRevocation } from "@/lib/session-revocation";

interface UserState { success?: boolean; error?: string }

const ALLOWED_TYPES = ["admin", "viewer"] as const;

export async function addUser(prevState: UserState | null, formData: FormData): Promise<UserState> {
  const session = await requireSession("admin");
  if (!session) return { success: false, error: "Unauthorized" };
  if (!(await validateSessionInDb(session))) return { success: false, error: "Session expired" };

  const displayName = getRequiredString(formData, "display_name");
  const username = getRequiredString(formData, "username");
  const password = getRequiredString(formData, "password");
  const type = getRequiredString(formData, "type");

  if (!displayName || !username || !password) {
    return { success: false, error: "All fields are required." };
  }

  if (username.length > 50) {
    return { success: false, error: "Username must be 50 characters or fewer." };
  }

  if (!ALLOWED_TYPES.includes(type as "admin" | "viewer")) {
    return { success: false, error: "Invalid user type." };
  }

  if (password.trim().length < 8) {
    return { success: false, error: "Password must be at least 8 characters." };
  }

  try {
    createUserRepo(username.trim(), password.trim(), displayName.trim(), type as "admin" | "viewer");
    revalidatePath("/admin/users");
    return { success: true };
  } catch (error) {
    console.error(error);
    return { success: false, error: "Failed to create user. Username may already exist." };
  }
}

export async function updateUser(prevState: UserState | null, formData: FormData): Promise<UserState> {
  const session = await requireSession("admin");
  if (!session) return { success: false, error: "Unauthorized" };
  if (!(await validateSessionInDb(session))) return { success: false, error: "Session expired" };

  const id = getInt(formData, "user_id");
  if (id === null) return { success: false, error: "Invalid user ID." };

  const existing = getUserById(id);
  if (!existing) return { success: false, error: "User not found." };
  if (existing.type === "admin" && existing.username === getEnvConfig().adminUsername) {
    return { success: false, error: "Cannot modify the primary admin account." };
  }

  const password = getOptionalString(formData, "password");
  const type = getOptionalString(formData, "type");

  if (password && password.trim().length === 0) {
    return { success: false, error: "Password cannot be empty." };
  }

  if (type && !ALLOWED_TYPES.includes(type as "admin" | "viewer")) {
    return { success: false, error: "Invalid user type." };
  }

  const validType = type && ALLOWED_TYPES.includes(type as "admin" | "viewer")
    ? (type as "admin" | "viewer")
    : undefined;

  if (validType === "admin" && existing.type !== "admin") {
    return { success: false, error: "Cannot promote users to admin. Contact the primary admin." };
  }

  try {
    updateUserRepo(id, {
      ...(password && password.trim() ? { password: password.trim() } : {}),
      ...(validType ? { type: validType } : {}),
    });
    if (password && password.trim()) revokeSessionsByPasswordChange(id);
    revalidatePath("/admin/users");
    return { success: true };
  } catch (error) {
    console.error(error);
    return { success: false, error: "Failed to update user." };
  }
}

export async function removeUser(prevState: UserState | null, formData: FormData): Promise<UserState> {
  const session = await requireSession("admin");
  if (!session) return { success: false, error: "Unauthorized" };
  if (!(await validateSessionInDb(session))) return { success: false, error: "Session expired" };

  const id = getInt(formData, "user_id");
  if (id === null) return { success: false, error: "Invalid user ID." };

  const existing = getUserById(id);
  if (!existing) return { success: false, error: "User not found." };
  if (existing.type === "admin" && existing.username === getEnvConfig().adminUsername) {
    return { success: false, error: "Cannot delete the primary admin account." };
  }

  if (session.userId != null && session.userId === id) {
    return { success: false, error: "Cannot delete your own account." };
  }

  try {
    deleteUserRepo(id);
    clearPasswordRevocation(id);
    revalidatePath("/admin/users");
    return { success: true };
  } catch (error) {
    console.error(error);
    return { success: false, error: "Failed to delete user." };
  }
}
