"use server";

import { revalidatePath } from "next/cache";
import { requireAdminSessionOrNull, validateSessionInDb } from "@/lib/auth";
import { getString } from "@/lib/form-data";
import { MAX_QUESTION_LENGTH, MAX_ANSWER_LENGTH } from "@/lib/constants";
import * as faqRepo from "@/lib/repository/faq";
import * as questionsRepo from "@/lib/repository/questions";

interface HelpState { success?: boolean; error?: string }

function validateFaqFields(formData: FormData): { ok: true; question: string; answer: string } | { ok: false; error: string } {
  const question = getString(formData, "question")?.trim();
  if (!question) return { ok: false, error: "Question is required." };
  if (question.length > MAX_QUESTION_LENGTH) {
    return { ok: false, error: `Question must be ${MAX_QUESTION_LENGTH} characters or fewer.` };
  }

  const answer = getString(formData, "answer")?.trim();
  if (!answer) return { ok: false, error: "Answer is required." };
  if (answer.length > MAX_ANSWER_LENGTH) {
    return { ok: false, error: `Answer must be ${MAX_ANSWER_LENGTH} characters or fewer.` };
  }

  return { ok: true, question, answer };
}

export async function addFaq(prevState: HelpState | null, formData: FormData): Promise<HelpState> {
  const session = await requireAdminSessionOrNull();
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
    console.error(error);
    return { success: false, error: "Failed to add FAQ item." };
  }
}

export async function updateFaq(prevState: HelpState | null, formData: FormData): Promise<HelpState> {
  const session = await requireAdminSessionOrNull();
  if (!session) return { success: false, error: "Unauthorized" };
  if (!(await validateSessionInDb(session))) return { success: false, error: "Session expired" };

  const idRaw = getString(formData, "faq_id");
  if (!idRaw) return { success: false, error: "Invalid FAQ item ID." };
  const id = parseInt(idRaw, 10);
  if (!Number.isFinite(id) || id < 1) return { success: false, error: "Invalid FAQ item ID." };

  const fields = validateFaqFields(formData);
  if (!fields.ok) return { success: false, error: fields.error };

  try {
    faqRepo.update(id, { question: fields.question, answer: fields.answer });
    revalidatePath("/admin/help");
    revalidatePath("/help");
    return { success: true };
  } catch (error) {
    console.error(error);
    return { success: false, error: "Failed to update FAQ item." };
  }
}

export async function deleteFaq(prevState: HelpState | null, formData: FormData): Promise<HelpState> {
  const session = await requireAdminSessionOrNull();
  if (!session) return { success: false, error: "Unauthorized" };
  if (!(await validateSessionInDb(session))) return { success: false, error: "Session expired" };

  const idRaw = getString(formData, "faq_id");
  if (!idRaw) return { success: false, error: "Invalid FAQ item ID." };
  const id = parseInt(idRaw, 10);
  if (!Number.isFinite(id) || id < 1) return { success: false, error: "Invalid FAQ item ID." };

  try {
    faqRepo.deleteItem(id);
    revalidatePath("/admin/help");
    revalidatePath("/help");
    return { success: true };
  } catch (error) {
    console.error(error);
    return { success: false, error: "Failed to delete FAQ item." };
  }
}

export async function moveFaq(prevState: HelpState | null, formData: FormData): Promise<HelpState> {
  const session = await requireAdminSessionOrNull();
  if (!session) return { success: false, error: "Unauthorized" };
  if (!(await validateSessionInDb(session))) return { success: false, error: "Session expired" };

  const idRaw = getString(formData, "faq_id");
  const direction = getString(formData, "direction");
  if (!idRaw || !direction || (direction !== "up" && direction !== "down")) {
    return { success: false, error: "Invalid parameters." };
  }
  const id = parseInt(idRaw, 10);
  if (!Number.isFinite(id) || id < 1) return { success: false, error: "Invalid FAQ item ID." };

  try {
    const items = faqRepo.getAll();
    const index = items.findIndex(i => i.id === id);
    if (index === -1) return { success: false, error: "FAQ item not found." };

    const neighborIndex = direction === "up" ? index - 1 : index + 1;
    if (neighborIndex < 0 || neighborIndex >= items.length) {
      return { success: false, error: direction === "up" ? "Already at top." : "Already at bottom." };
    }

    const current = items[index];
    const neighbor = items[neighborIndex];
    faqRepo.swapSortOrder(current.id, current.sort_order, neighbor.id, neighbor.sort_order);

    revalidatePath("/admin/help");
    revalidatePath("/help");
    return { success: true };
  } catch (error) {
    console.error(error);
    return { success: false, error: "Failed to reorder FAQ item." };
  }
}

export async function answerQuestion(prevState: HelpState | null, formData: FormData): Promise<HelpState> {
  const session = await requireAdminSessionOrNull();
  if (!session) return { success: false, error: "Unauthorized" };
  if (!(await validateSessionInDb(session))) return { success: false, error: "Session expired" };

  const idRaw = getString(formData, "question_id");
  if (!idRaw) return { success: false, error: "Invalid question ID." };
  const id = parseInt(idRaw, 10);
  if (!Number.isFinite(id) || id < 1) return { success: false, error: "Invalid question ID." };

  const answer = getString(formData, "answer")?.trim();
  if (!answer) return { success: false, error: "Answer is required." };
  if (answer.length > MAX_ANSWER_LENGTH) {
    return { success: false, error: `Answer must be ${MAX_ANSWER_LENGTH} characters or fewer.` };
  }

  try {
    questionsRepo.answer(id, answer);
    revalidatePath("/admin/help");
    revalidatePath("/help");
    return { success: true };
  } catch (error) {
    console.error(error);
    return { success: false, error: "Failed to answer question." };
  }
}
