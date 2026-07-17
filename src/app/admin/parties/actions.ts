"use server";

import { revalidatePath } from "next/cache";
import { requireSession, validateSessionInDb } from "@/lib/auth";
import { getString, getInt } from "@/lib/form-data";
import { updateParty as updatePartyRepo, deleteParty, getPartyById } from "@/lib/repository/party";

interface PartyState { success?: boolean; error?: string }

export async function updateParty(prevState: PartyState | null, formData: FormData): Promise<PartyState> {
  const session = await requireSession("admin");
  if (!session) return { success: false, error: "Unauthorized" };
  if (!(await validateSessionInDb(session))) return { success: false, error: "Session expired" };

  const id = getInt(formData, "party_id");
  if (id === null) return { success: false, error: "Invalid party ID." };

  const existing = getPartyById(id);
  if (!existing) return { success: false, error: "Party not found." };

  const name = getString(formData, "name");
  const code = getString(formData, "code");
  const invited = getString(formData, "invited");

  if (!name?.trim()) return { success: false, error: "Party name is required." };
  if (!code?.trim()) return { success: false, error: "Party code is required." };

  if (code.trim().length > 50) return { success: false, error: "Party code must be 50 characters or fewer." };

  try {
    updatePartyRepo(id, {
      name: name.trim(),
      code: code.trim(),
      invited: invited === "1" ? 1 : 0,
    });
    revalidatePath("/admin/parties");
    revalidatePath("/admin/guests");
    return { success: true };
  } catch (error) {
    console.error(error);
    return { success: false, error: "Failed to update party. Code may already exist." };
  }
}

export async function removeParty(prevState: PartyState | null, formData: FormData): Promise<PartyState> {
  const session = await requireSession("admin");
  if (!session) return { success: false, error: "Unauthorized" };
  if (!(await validateSessionInDb(session))) return { success: false, error: "Session expired" };

  const id = getInt(formData, "party_id");
  if (id === null) return { success: false, error: "Invalid party ID." };

  const existing = getPartyById(id);
  if (!existing) return { success: false, error: "Party not found." };

  try {
    deleteParty(id);
    revalidatePath("/admin/parties");
    revalidatePath("/admin/guests");
    return { success: true };
  } catch (error) {
    console.error(error);
    return { success: false, error: "Failed to delete party." };
  }
}
