"use server";

import { revalidatePath } from "next/cache";
import { requireSession, validateSessionInDb } from "@/lib/auth";
import { getRequiredString, getOptionalString, getInt } from "@/lib/form-data";
import { MAX_QUESTION_LENGTH, MAX_ANSWER_LENGTH } from "@/lib/constants";
import { logError } from "@/lib/logger";
import * as faqRepo from "@/lib/repository/faq";
import { answer as answerQuestionRepo } from "@/lib/repository/questions";

interface HelpState { success?: boolean; error?: string }

function validateFaqFields(formData: FormData): { ok: true; question: string; answer: string } | { ok: false; error: string } {
  const question = getRequiredString(formData, "question")?.trim();
  if (!question) return { ok: false, error: "Question is required." };
  if (question.length > MAX_QUESTION_LENGTH) {
    return { ok: false, error: `Question must be ${MAX_QUESTION_LENGTH} characters or fewer.` };
  }

  const answer = getRequiredString(formData, "answer")?.trim();
  if (!answer) return { ok: false, error: "Answer is required." };
  if (answer.length > MAX_ANSWER_LENGTH) {
    return { ok: false, error: `Answer must be ${MAX_ANSWER_LENGTH} characters or fewer.` };
  }

  return { ok: true, question, answer };
}

export async function addFaq(prevState: HelpState | null, formData: FormData): Promise<HelpState> {
  const session = await requireSession("admin");
  if (!session) return { success: false, error: "Unauthorized" };
  if (!(await validateSessionInDb(session))) return { success: false, error: "Session expired" };

  const fields = validateFaqFields(formData);
  if (!fields.ok) return { success: false, error: fields.error };

  try {
    faqRepo.create(fields.question, fields.answer);
    revalidatePath("/admin/help");
    revalidatePath("/help");
    return { success: true };
  } catch (error) {
    logError("Help", error);
    return { success: false, error: "Failed to add FAQ item." };
  }
}

export async function updateFaq(prevState: HelpState | null, formData: FormData): Promise<HelpState> {
  const session = await requireSession("admin");
  if (!session) return { success: false, error: "Unauthorized" };
  if (!(await validateSessionInDb(session))) return { success: false, error: "Session expired" };

  const id = getInt(formData, "faq_id");
  if (id === null) return { success: false, error: "Invalid FAQ item ID." };

  const fields = validateFaqFields(formData);
  if (!fields.ok) return { success: false, error: fields.error };

  try {
    faqRepo.update(id, { question: fields.question, answer: fields.answer });
    revalidatePath("/admin/help");
    revalidatePath("/help");
    return { success: true };
  } catch (error) {
    logError("Help", error);
    return { success: false, error: "Failed to update FAQ item." };
  }
}

export async function deleteFaq(prevState: HelpState | null, formData: FormData): Promise<HelpState> {
  const session = await requireSession("admin");
  if (!session) return { success: false, error: "Unauthorized" };
  if (!(await validateSessionInDb(session))) return { success: false, error: "Session expired" };

  const id = getInt(formData, "faq_id");
  if (id === null) return { success: false, error: "Invalid FAQ item ID." };

  try {
    faqRepo.deleteItem(id);
    revalidatePath("/admin/help");
    revalidatePath("/help");
    return { success: true };
  } catch (error) {
    logError("Help", error);
    return { success: false, error: "Failed to delete FAQ item." };
  }
}

export async function moveFaq(prevState: HelpState | null, formData: FormData): Promise<HelpState> {
  const session = await requireSession("admin");
  if (!session) return { success: false, error: "Unauthorized" };
  if (!(await validateSessionInDb(session))) return { success: false, error: "Session expired" };

  const id = getInt(formData, "faq_id");
  const direction = getOptionalString(formData, "direction");
  if (id === null || !direction || (direction !== "up" && direction !== "down")) {
    return { success: false, error: "Invalid parameters." };
  }

  try {
    const result = faqRepo.swapSortOrder(id, direction);
    if (!result.success) return { success: false, error: result.error ?? "Unknown error" };

    revalidatePath("/admin/help");
    revalidatePath("/help");
    return { success: true };
  } catch (error) {
    logError("Help", error);
    return { success: false, error: "Failed to reorder FAQ item." };
  }
}

export async function answerQuestion(prevState: HelpState | null, formData: FormData): Promise<HelpState> {
  const session = await requireSession("admin");
  if (!session) return { success: false, error: "Unauthorized" };
  if (!(await validateSessionInDb(session))) return { success: false, error: "Session expired" };

  const id = getInt(formData, "question_id");
  if (id === null) return { success: false, error: "Invalid question ID." };

  const answer = getRequiredString(formData, "answer")?.trim();
  if (!answer) return { success: false, error: "Answer is required." };
  if (answer.length > MAX_ANSWER_LENGTH) {
    return { success: false, error: `Answer must be ${MAX_ANSWER_LENGTH} characters or fewer.` };
  }

  try {
    answerQuestionRepo(id, answer);
    revalidatePath("/admin/help");
    revalidatePath("/help");
    return { success: true };
  } catch (error) {
    logError("Help", error);
    return { success: false, error: "Failed to answer question." };
  }
}
