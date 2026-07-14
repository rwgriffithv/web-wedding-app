"use server";

import { revalidatePath } from "next/cache";
import { parseSession } from "@/lib/auth";
import { getConfig } from "@/lib/repository/site-config";
import { getGuestById } from "@/lib/repository/guests";
import { getPartyById } from "@/lib/repository/party";
import { submitResponse } from "@/lib/repository/rsvp";
import { getString } from "@/lib/form-data";

export interface RsvpState {
  success?: boolean;
  error?: string;
}

export async function submitRsvp(_prevState: RsvpState | null, formData: FormData): Promise<RsvpState> {
  const session = await parseSession();
  if (!session) return { success: false, error: "Not authenticated." };

  if (session.type === "admin" || session.type === "viewer") {
    return { success: false, error: "RSVP is not available for user logins. Please use your Party Code to RSVP." };
  }

  const deadlineStr = getConfig("rsvp_deadline");
  if (deadlineStr) {
    const deadline = new Date(deadlineStr);
    if (new Date() > deadline) {
      return { success: false, error: "RSVP submissions are closed." };
    }
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
  let plusOne: string | undefined;

  if (isAttending) {
    const bringPlusOne = getString(formData, `bring_plus_one_${memberId}`);
    if (bringPlusOne === "yes") {
      const plusOneRaw = getString(formData, `plus_one_${memberId}`);
      if (!plusOneRaw) {
        return { success: false, error: "Please enter your plus-one's name." };
      }
      plusOne = plusOneRaw.slice(0, 200);
    }
  }

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
