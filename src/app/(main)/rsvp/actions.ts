"use server";

import { revalidatePath } from "next/cache";
import { requireSession, validateSessionInDb, destroySession } from "@/lib/auth";
import { getConfig } from "@/lib/repository/site-config";
import { getGuestById } from "@/lib/repository/guests";
import { getPartyById, updateParty } from "@/lib/repository/party";
import { submitResponse } from "@/lib/repository/rsvp";
import { createRateLimiter, getRateLimitConfig } from "@/lib/rate-limit";
import { getRequiredString } from "@/lib/form-data";
import { logError } from "@/lib/logger";
import { RSVP_RATE_LIMIT_MAX_DEFAULT, RSVP_RATE_LIMIT_MAX_KEY, RSVP_RATE_LIMIT_WINDOW_SECONDS_KEY, LOGIN_RATE_LIMIT_WINDOW_SECONDS_DEFAULT, RSVP_DEADLINE_KEY } from "@/lib/constants";

export interface RsvpState {
  success?: boolean;
  error?: string;
  action?: "cooldown" | "redirect";
  cooldownUntil?: number;
  href?: string;
}

const rsvpRateLimiter = createRateLimiter("rsvp");

function getRsvpRateLimitConfig() {
  return getRateLimitConfig(RSVP_RATE_LIMIT_MAX_KEY, RSVP_RATE_LIMIT_WINDOW_SECONDS_KEY, RSVP_RATE_LIMIT_MAX_DEFAULT, LOGIN_RATE_LIMIT_WINDOW_SECONDS_DEFAULT);
}

export async function submitRsvp(_prevState: RsvpState | null, formData: FormData): Promise<RsvpState> {
  const hotSession = await requireSession();
  if (!hotSession) {
    await destroySession();
    return { success: false, action: "redirect", href: "/login" };
  }
  const session = await validateSessionInDb(hotSession);
  if (!session) {
    await destroySession();
    return { success: false, action: "redirect", href: "/login" };
  }

  if (session.type === "admin" || session.type === "viewer") {
    return { success: false, error: "RSVP is not available for user logins. Please use your Party Code to RSVP." };
  }

  const deadlineStr = getConfig(RSVP_DEADLINE_KEY);
  if (deadlineStr) {
    const deadline = new Date(deadlineStr);
    if (new Date() > deadline) {
      return { success: false, error: "RSVP submissions are closed." };
    }
  }

  const memberIdRaw = getRequiredString(formData, "member_id");
  if (!memberIdRaw) return { success: false, error: "Invalid member." };
  const memberId = parseInt(memberIdRaw, 10);
  if (isNaN(memberId) || memberId < 1) return { success: false, error: "Invalid member." };

  const attending = getRequiredString(formData, `attending_${memberId}`);
  if (!attending) return { success: false, error: "Attendance is required." };
  if (attending !== "yes" && attending !== "no") return { success: false, error: "Invalid attendance value." };

  if (session.type === "party") {
    if (!session.partyId) return { success: false, error: "Invalid party session." };
    const party = getPartyById(session.partyId);
    if (!party) return { success: false, error: "Party not found." };

    const rlConfig = getRsvpRateLimitConfig();
    const rlResult = rsvpRateLimiter.check(`party:${session.partyId}`, rlConfig);
    if (!rlResult.allowed) {
      return { success: false, error: "Your party has made too many submissions. Please wait before trying again.", action: "cooldown", cooldownUntil: Date.now() + rlResult.retryAfterMs };
    }

    const member = getGuestById(memberId);
    if (!member || member.party_id !== session.partyId) {
      return { success: false, error: "You can only RSVP for members of your party." };
    }
    const result = await rsvpMember(memberId, member.display_name, attending, formData);
    if (result.success && !party.invited) {
      try {
        updateParty(session.partyId, { invited: 1 });
        revalidatePath("/admin/parties");
      } catch (err) {
        logError("Rsvp:auto-invite", err);
      }
    }
    return result;
  }

  return { success: false, error: "Unknown session type." };
}

async function rsvpMember(memberId: number, name: string, attending: string, formData: FormData): Promise<RsvpState> {
  const isAttending = attending === "yes";
  let plusOne: string | undefined;

  if (isAttending) {
    const bringPlusOne = getRequiredString(formData, `bring_plus_one_${memberId}`);
    if (bringPlusOne === "yes") {
      const plusOneRaw = getRequiredString(formData, `plus_one_${memberId}`);
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
    logError("Rsvp", error);
    return { success: false, error: "Failed to submit RSVP. Please try again." };
  }
}
