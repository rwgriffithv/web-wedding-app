"use server";

import { revalidatePath } from "next/cache";
import { parseSession } from "@/lib/auth";
import { getString } from "@/lib/form-data";
import { MAX_QUESTION_LENGTH } from "@/lib/constants";
import { create } from "@/lib/repository/questions";
import { createRateLimiter } from "@/lib/rate-limit";
import { getConfig } from "@/lib/repository/site-config";

interface HelpState { success?: boolean; error?: string }

const questionRateLimiter = createRateLimiter("question", 5, 60_000);

function getQuestionRateLimitConfig() {
  const max = parseInt(getConfig("question_rate_limit_max"), 10);
  const window = parseInt(getConfig("question_rate_limit_window"), 10);
  return {
    maxAttempts: Number.isFinite(max) && max > 0 ? max : 5,
    windowMs: (Number.isFinite(window) && window > 0 ? window : 60) * 1000,
  };
}

export async function submitQuestion(prevState: HelpState | null, formData: FormData): Promise<HelpState> {
  const session = await parseSession();
  if (!session?.partyId) return { success: false, error: "Not logged in as a party." };

  if (!questionRateLimiter.check(`party:${session.partyId}`, getQuestionRateLimitConfig())) {
    return { success: false, error: "Too many submissions. Please wait before trying again." };
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
