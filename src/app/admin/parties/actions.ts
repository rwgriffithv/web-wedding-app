"use server";

import { revalidatePath } from "next/cache";
import { isAdmin } from "@/lib/auth";
import { getString, getInt } from "@/lib/form-data";
import { updateParty as updatePartyRepo, deleteParty, getPartyById, setInvited as setInvitedRepo } from "@/lib/repository/party";

interface PartyState { success?: boolean; error?: string }

export async function updateParty(prevState: PartyState | null, formData: FormData): Promise<PartyState> {
  if (!(await isAdmin())) return { success: false, error: "Unauthorized" };

  const id = getInt(formData, "party_id");
  if (id === null) return { success: false, error: "Invalid party ID." };

  const existing = getPartyById(id);
  if (!existing) return { success: false, error: "Party not found." };

  const name = getString(formData, "name");
  const code = getString(formData, "code");

  if (!name?.trim()) return { success: false, error: "Party name is required." };
  if (!code?.trim()) return { success: false, error: "Party code is required." };

  if (code.trim().length > 50) return { success: false, error: "Party code must be 50 characters or fewer." };

  try {
    updatePartyRepo(id, { name: name.trim(), code: code.trim() });
    revalidatePath("/admin/parties");
    revalidatePath("/admin/guests");
    return { success: true };
  } catch (error) {
    console.error(error);
    return { success: false, error: "Failed to update party. Code may already exist." };
  }
}

export async function removeParty(prevState: PartyState | null, formData: FormData): Promise<PartyState> {
  if (!(await isAdmin())) return { success: false, error: "Unauthorized" };

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

export async function toggleInvited(prevState: PartyState | null, formData: FormData): Promise<PartyState> {
  if (!(await isAdmin())) return { success: false, error: "Unauthorized" };

  const id = getInt(formData, "party_id");
  if (id === null) return { success: false, error: "Invalid party ID." };

  const invited = getString(formData, "invited");
  if (invited === null) return { success: false, error: "Invalid invited value." };

  try {
    setInvitedRepo(id, invited === "1");
    revalidatePath("/admin/parties");
    return { success: true };
  } catch (error) {
    console.error(error);
    return { success: false, error: "Failed to update invited status." };
  }
}
