import { getDb, type FaqItem } from "@/lib/db";
import { swapSortOrder as swap } from "@/lib/repository/sort";

export function getAll(): FaqItem[] {
  const db = getDb();
  return db.prepare("SELECT * FROM faq_items ORDER BY sort_order, id").all() as FaqItem[];
}

export function getById(id: number): FaqItem | undefined {
  const db = getDb();
  return db.prepare("SELECT * FROM faq_items WHERE id = ?").get(id) as FaqItem | undefined;
}

export function create(question: string, answer: string): FaqItem {
  const db = getDb();
  const createTransaction = db.transaction(() => {
    const maxOrder = db.prepare("SELECT COALESCE(MAX(sort_order), -1) + 1 AS next FROM faq_items").get() as { next: number };
    return db.prepare("INSERT INTO faq_items (question, answer, sort_order) VALUES (?, ?, ?) RETURNING *").get(question, answer, maxOrder.next) as FaqItem;
  });
  return createTransaction();
}

export function update(id: number, data: { question?: string; answer?: string }): void {
  const db = getDb();
  let result;
  if (data.question !== undefined && data.answer !== undefined) {
    result = db.prepare("UPDATE faq_items SET question = ?, answer = ? WHERE id = ?").run(data.question, data.answer, id);
  } else if (data.question !== undefined) {
    result = db.prepare("UPDATE faq_items SET question = ? WHERE id = ?").run(data.question, id);
  } else if (data.answer !== undefined) {
    result = db.prepare("UPDATE faq_items SET answer = ? WHERE id = ?").run(data.answer, id);
  } else {
    throw new Error("No fields to update");
  }
  if (result.changes === 0) throw new Error(`FAQ item ${id} not found`);
}

export function swapSortOrder(id: number, direction: "up" | "down"): { success: boolean; error?: string } {
  const db = getDb();
  return swap(db, "faq_items", id, direction, "FAQ item not found.");
}

export function deleteItem(id: number): void {
  const db = getDb();
  const result = db.prepare("DELETE FROM faq_items WHERE id = ?").run(id);
  if (result.changes === 0) throw new Error(`FAQ item ${id} not found`);
}
