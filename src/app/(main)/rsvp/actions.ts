"use server";

import { revalidatePath } from "next/cache";
import { parseSession } from "@/lib/auth";
import { getGuestById } from "@/lib/repository/guests";
import { getPartyById } from "@/lib/repository/party";
import { submitResponse } from "@/lib/repository/rsvp";
import { getString } from "@/lib/form-data";

interface RsvpState { success?: boolean; error?: string }

export async function submitRsvp(prevState: RsvpState | null, formData: FormData): Promise<RsvpState> {
  const session = await parseSession();
  if (!session) return { success: false, error: "Not authenticated." };

  if (session.type === "admin" || session.type === "viewer") {
    return { success: false, error: "RSVP is not available for user logins. Please use your Party Code to RSVP." };
  }

  const memberIdRaw = getString(formData, "member_id");
  if (!memberIdRaw) return { success: false, error: "Invalid member." };
  const memberId = parseInt(memberIdRaw, 10);
  if (isNaN(memberId) || memberId < 1) return { success: false, error: "Invalid member." };

  const attending = getString(formData, `attending_${memberId}`);
  if (!attending) return { success: false, error: "Attendance is required." };
  if (attending !== "yes" && attending !== "no") return { success: false, error: "Invalid attendance value." };

  if (session.type === "party") {
    if (!session.partyId) return { success: false, error: "Invalid party session." };
    const party = getPartyById(session.partyId);
    if (!party) return { success: false, error: "Party not found." };

    const member = getGuestById(memberId);
    if (!member || member.party_id !== session.partyId) {
      return { success: false, error: "You can only RSVP for members of your party." };
    }
    return rsvpMember(memberId, member.display_name, attending, formData);
  }

  return { success: false, error: "Unknown session type." };
}

async function rsvpMember(memberId: number, name: string, attending: string, formData: FormData): Promise<RsvpState> {
  const isAttending = attending === "yes";
  const plusOneRaw = isAttending ? getString(formData, `plus_one_${memberId}`) : undefined;
  const plusOne = plusOneRaw && plusOneRaw.length > 0 ? plusOneRaw.slice(0, 200) : undefined;

  try {
    submitResponse(memberId, name, isAttending, plusOne);
    revalidatePath("/rsvp");
    revalidatePath("/admin/rsvp");
    return { success: true };
  } catch (error) {
    console.error(error);
    return { success: false, error: "Failed to submit RSVP. Please try again." };
  }
}
