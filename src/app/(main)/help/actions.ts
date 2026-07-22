"use server";

import { revalidatePath } from "next/cache";
import { requireSession, validateSessionInDb, destroySession } from "@/lib/auth";
import { getRequiredString } from "@/lib/form-data";
import { MAX_QUESTION_LENGTH, LOGIN_RATE_LIMIT_MAX_DEFAULT, LOGIN_RATE_LIMIT_WINDOW_SECONDS_DEFAULT, QUESTION_RATE_LIMIT_MAX_KEY, QUESTION_RATE_LIMIT_WINDOW_SECONDS_KEY } from "@/lib/constants";
import { logError } from "@/lib/logger";
import { create } from "@/lib/repository/questions";
import { createRateLimiter, getRateLimitConfig } from "@/lib/rate-limit";

interface HelpState { success?: boolean; error?: string; action?: "cooldown" | "redirect"; cooldownUntil?: number; href?: string }

const questionRateLimiter = createRateLimiter("question");

function getQuestionRateLimitConfig() {
  return getRateLimitConfig(QUESTION_RATE_LIMIT_MAX_KEY, QUESTION_RATE_LIMIT_WINDOW_SECONDS_KEY, LOGIN_RATE_LIMIT_MAX_DEFAULT, LOGIN_RATE_LIMIT_WINDOW_SECONDS_DEFAULT);
}

export async function submitQuestion(prevState: HelpState | null, formData: FormData): Promise<HelpState> {
  const hotSession = await requireSession();
  if (!hotSession) {
    await destroySession();
    return { success: false, action: "redirect", href: "/login" };
  }
  const session = await validateSessionInDb(hotSession);
  if (!session?.partyId) {
    await destroySession();
    return { success: false, action: "redirect", href: "/login" };
  }

  const rlConfig = getQuestionRateLimitConfig();
  const rlResult = questionRateLimiter.check(`party:${session.partyId}`, rlConfig);
  if (!rlResult.allowed) {
    return { success: false, error: "Your party has made too many requests. Please wait before trying again.", action: "cooldown", cooldownUntil: Date.now() + rlResult.retryAfterMs };
  }

  const question = getRequiredString(formData, "question")?.trim();
  if (!question) return { success: false, error: "Question is required." };
  if (question.length > MAX_QUESTION_LENGTH) {
    return { success: false, error: `Question must be ${MAX_QUESTION_LENGTH} characters or fewer.` };
  }

  try {
    create(session.partyId, question);
    revalidatePath("/help");
    return { success: true };
  } catch (error) {
    logError("Help", error);
    return { success: false, error: "Failed to submit question." };
  }
}
