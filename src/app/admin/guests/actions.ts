"use server";

import { revalidatePath } from "next/cache";
import { parseAdminSession, validateSessionForMutation } from "@/lib/auth";
import { getString, getInt } from "@/lib/form-data";
import { getDb } from "@/lib/db";
import { updateGuest as updateGuestRepo, createGuest, deleteGuest, getGuestById } from "@/lib/repository/guests";
import { createParty, deleteEmptyParty } from "@/lib/repository/party";

export interface GuestState { success?: boolean; error?: string; partyId?: number }

export async function createPartyInline(prevState: GuestState | null, formData: FormData): Promise<GuestState> {
  const session = await parseAdminSession();
  if (!session) return { success: false, error: "Unauthorized" };
  if (!(await validateSessionForMutation(session))) return { success: false, error: "Session expired" };

  const name = getString(formData, "party_name");
  if (!name?.trim()) return { success: false, error: "Party name is required." };

  try {
    const party = createParty(name.trim());
    revalidatePath("/admin/guests");
    return { success: true, partyId: party.id };
  } catch (error) {
    console.error(error);
    return { success: false, error: "Failed to create party." };
  }
}

export async function updateGuest(prevState: GuestState | null, formData: FormData): Promise<GuestState> {
  const session = await parseAdminSession();
  if (!session) return { success: false, error: "Unauthorized" };
  if (!(await validateSessionForMutation(session))) return { success: false, error: "Session expired" };

  const id = getInt(formData, "guest_id");
  if (id === null) return { success: false, error: "Invalid guest ID." };

  const existing = getGuestById(id);
  if (!existing) return { success: false, error: "Guest not found." };

  const displayName = getString(formData, "display_name");
  const partyIdRaw = getString(formData, "party_id");
  const canBringPlusOneRaw = getString(formData, "can_bring_plus_one");
  const unexpectedRaw = getString(formData, "unexpected");

  if (!displayName?.trim()) return { success: false, error: "Display name is required." };

  const partyId = partyIdRaw ? parseInt(partyIdRaw, 10) : null;
  if (partyId !== null && (isNaN(partyId) || partyId < 1)) return { success: false, error: "Invalid party ID." };

  const canBringPlusOne = canBringPlusOneRaw === "1" ? 1 : 0;
  const unexpected = unexpectedRaw === "1" ? 1 : 0;
  const oldPartyId = existing.party_id;

  try {
    const db = getDb();
    db.transaction(() => {
      updateGuestRepo(id, {
        display_name: displayName,
        party_id: partyId,
        can_bring_plus_one: canBringPlusOne,
        unexpected,
      });

      if (oldPartyId !== null && oldPartyId !== partyId) {
        deleteEmptyParty(oldPartyId);
      }
    })();

    revalidatePath("/admin/guests");
    return { success: true };
  } catch (error) {
    console.error(error);
    return { success: false, error: "Failed to update guest." };
  }
}

export async function addGuest(prevState: GuestState | null, formData: FormData): Promise<GuestState> {
  const session = await parseAdminSession();
  if (!session) return { success: false, error: "Unauthorized" };
  if (!(await validateSessionForMutation(session))) return { success: false, error: "Session expired" };

  const displayName = getString(formData, "display_name");
  const partyIdRaw = getString(formData, "party_id");
  const canBringPlusOneRaw = getString(formData, "can_bring_plus_one");
  const unexpectedRaw = getString(formData, "unexpected");

  if (!displayName?.trim()) {
    return { success: false, error: "Display name is required." };
  }

  const partyId = partyIdRaw ? parseInt(partyIdRaw, 10) : null;
  if (!partyId || isNaN(partyId) || partyId < 1) return { success: false, error: "Party is required." };

  const canBringPlusOne = canBringPlusOneRaw === "1" ? 1 : 0;
  const unexpected = unexpectedRaw === "1" ? 1 : 0;

  try {
    createGuest(displayName.trim(), partyId, canBringPlusOne, unexpected);
    revalidatePath("/admin/guests");
    return { success: true };
  } catch (error) {
    console.error(error);
    return { success: false, error: "Failed to create guest." };
  }
}

export async function removeGuest(prevState: GuestState | null, formData: FormData): Promise<GuestState> {
  const session = await parseAdminSession();
  if (!session) return { success: false, error: "Unauthorized" };
  if (!(await validateSessionForMutation(session))) return { success: false, error: "Session expired" };

  const id = getInt(formData, "guest_id");
  if (id === null) return { success: false, error: "Invalid guest ID." };

  const existing = getGuestById(id);
  if (!existing) return { success: false, error: "Guest not found." };

  const oldPartyId = existing.party_id;

  try {
    const db = getDb();
    db.transaction(() => {
      deleteGuest(id);
      if (oldPartyId !== null) {
        deleteEmptyParty(oldPartyId);
      }
    })();

    revalidatePath("/admin/guests");
    return { success: true };
  } catch (error) {
    console.error(error);
    return { success: false, error: "Failed to delete guest." };
  }
}
