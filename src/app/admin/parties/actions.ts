"use server";

import { revalidatePath } from "next/cache";
import { isAdmin } from "@/lib/auth";
import { createParty, deleteParty, updateParty, regeneratePartyCode } from "@/lib/repository/party";
import { updateGuest } from "@/lib/repository/guests";

interface PartyState { success?: boolean; error?: string }

export async function addParty(prevState: PartyState | null, formData: FormData): Promise<PartyState> {
  if (!(await isAdmin())) return { error: "Unauthorized" };

  const name = formData.get("name") as string;
  if (!name || !name.trim()) return { error: "Party name is required." };

  try {
    createParty(name.trim());
    revalidatePath("/admin/parties");
    return { success: true };
  } catch (error) {
    console.error(error);
    return { success: false, error: "Failed to create party." };
  }
}

export async function editParty(prevState: PartyState | null, formData: FormData): Promise<PartyState> {
  if (!(await isAdmin())) return { error: "Unauthorized" };

  const id = parseInt(formData.get("party_id") as string, 10);
  if (isNaN(id) || id < 1) return { error: "Invalid party ID." };

  const name = formData.get("name") as string;
  if (!name || !name.trim()) return { error: "Party name is required." };

  try {
    updateParty(id, { name: name.trim() });
    revalidatePath("/admin/parties");
    return { success: true };
  } catch (error) {
    console.error(error);
    return { success: false, error: "Failed to update party." };
  }
}

export async function removeParty(prevState: PartyState | null, formData: FormData): Promise<PartyState> {
  if (!(await isAdmin())) return { error: "Unauthorized" };

  const id = parseInt(formData.get("party_id") as string, 10);
  if (isNaN(id) || id < 1) return { error: "Invalid party ID." };

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

export async function regenerateCode(prevState: PartyState | null, formData: FormData): Promise<PartyState> {
  if (!(await isAdmin())) return { error: "Unauthorized" };

  const id = parseInt(formData.get("party_id") as string, 10);
  if (isNaN(id) || id < 1) return { error: "Invalid party ID." };

  try {
    regeneratePartyCode(id);
    revalidatePath("/admin/parties");
    return { success: true };
  } catch (error) {
    console.error(error);
    return { success: false, error: "Failed to regenerate code." };
  }
}

export async function assignToParty(prevState: PartyState | null, formData: FormData): Promise<PartyState> {
  if (!(await isAdmin())) return { error: "Unauthorized" };

  const guestId = parseInt(formData.get("guest_id") as string, 10);
  const partyIdRaw = formData.get("party_id") as string;

  if (isNaN(guestId) || guestId < 1) return { error: "Invalid guest ID." };

  const partyId = partyIdRaw ? parseInt(partyIdRaw, 10) : null;
  if (partyId !== null && (isNaN(partyId) || partyId < 1)) return { error: "Invalid party ID." };

  try {
    updateGuest(guestId, { party_id: partyId });
    revalidatePath("/admin/parties");
    revalidatePath("/admin/guests");
    return { success: true };
  } catch (error) {
    console.error(error);
    return { success: false, error: "Failed to assign guest to party." };
  }
}
