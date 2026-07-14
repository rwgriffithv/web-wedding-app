"use server";

import { revalidatePath } from "next/cache";
import { parseSession } from "@/lib/auth";
import { getString } from "@/lib/form-data";
import { MAX_QUESTION_LENGTH } from "@/lib/constants";
import { create } from "@/lib/repository/questions";

interface HelpState { success?: boolean; error?: string }

export async function submitQuestion(prevState: HelpState | null, formData: FormData): Promise<HelpState> {
  const session = await parseSession();
  if (!session?.partyId) return { success: false, error: "Not logged in as a party." };

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
