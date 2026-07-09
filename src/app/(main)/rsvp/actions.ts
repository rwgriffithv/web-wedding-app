"use server";

import { revalidatePath } from "next/cache";
import { parseSession, getCurrentGuest } from "@/lib/auth";
import { getGuestById } from "@/lib/repository/guests";
import { getPartyById } from "@/lib/repository/party";
import { submitResponse } from "@/lib/repository/rsvp";

interface RsvpState { success?: boolean; error?: string }

export async function submitRsvp(prevState: RsvpState | null, formData: FormData): Promise<RsvpState> {
  const session = await parseSession();
  if (!session) return { error: "Not authenticated." };

  const memberId = parseInt(formData.get("member_id") as string, 10);
  if (isNaN(memberId) || memberId < 1) return { error: "Invalid member." };

  const name = formData.get(`name_${memberId}`) as string;
  const attending = formData.get(`attending_${memberId}`) as string;
  if (!name || !attending) return { success: false, error: "Name and attendance are required." };

  if (session.type === "admin") {
    return rsvpMember(memberId, name, attending, formData);
  }

  if (session.type === "guest") {
    const guest = await getCurrentGuest();
    if (!guest || guest.id !== memberId) return { error: "You can only RSVP for yourself." };
    return rsvpMember(memberId, name, attending, formData);
  }

  if (session.type === "party") {
    if (!session.partyId) return { error: "Invalid party session." };
    const party = getPartyById(session.partyId);
    if (!party) return { error: "Party not found." };

    const member = getGuestById(memberId);
    if (!member || member.party_id !== session.partyId) {
      return { error: "You can only RSVP for members of your party." };
    }
    return rsvpMember(memberId, name, attending, formData);
  }

  return { error: "Unknown session type." };
}

async function rsvpMember(memberId: number, name: string, attending: string, formData: FormData): Promise<RsvpState> {
  const plusOne = formData.get(`plus_one_${memberId}`) as string;

  try {
    submitResponse(memberId, name, attending === "yes", plusOne || undefined);
    revalidatePath("/rsvp");
    revalidatePath("/admin/rsvp");
    return { success: true };
  } catch (error) {
    console.error(error);
    return { success: false, error: "Failed to submit RSVP. Please try again." };
  }
}
