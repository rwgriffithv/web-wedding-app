"use server";

import { revalidatePath } from "next/cache";
import { validateSessionInDb } from "@/lib/auth";
import { getString } from "@/lib/form-data";
import { MAX_QUESTION_LENGTH, RATE_LIMIT_MAX_ATTEMPTS_DEFAULT, RATE_LIMIT_WINDOW_SECONDS_DEFAULT } from "@/lib/constants";
import { create } from "@/lib/repository/questions";
import { createRateLimiter, getRateLimitConfig } from "@/lib/rate-limit";

interface HelpState { success?: boolean; error?: string; action?: "cooldown" | "redirect"; cooldownUntil?: number; href?: string }

const questionRateLimiter = createRateLimiter("question");

function getQuestionRateLimitConfig() {
  return getRateLimitConfig("question_rate_limit_max", "question_rate_limit_window", RATE_LIMIT_MAX_ATTEMPTS_DEFAULT, RATE_LIMIT_WINDOW_SECONDS_DEFAULT);
}

export async function submitQuestion(prevState: HelpState | null, formData: FormData): Promise<HelpState> {
  const session = await validateSessionInDb();
  if (!session?.partyId) return { success: false, action: "redirect", href: "/login" };

  const rlConfig = getQuestionRateLimitConfig();
  if (!questionRateLimiter.check(`party:${session.partyId}`, rlConfig)) {
    return { success: false, error: "Your party has made too many requests. Please wait before trying again.", action: "cooldown", cooldownUntil: Date.now() + rlConfig.windowMs };
  }

  const question = getString(formData, "question")?.trim();
  if (!question) return { success: false, error: "Question is required." };
  if (question.length > MAX_QUESTION_LENGTH) {
    return { success: false, error: `Question must be ${MAX_QUESTION_LENGTH} characters or fewer.` };
  }

  try {
    create(session.partyId, question);
    revalidatePath("/help");
    return { success: true };
  } catch (error) {
    console.error(error);
    return { success: false, error: "Failed to submit question." };
  }
}
