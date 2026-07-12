import { getDb, type ScheduleItem } from "@/lib/db";

export function getAll(): ScheduleItem[] {
  const db = getDb();
  return db.prepare("SELECT * FROM schedule_items ORDER BY sort_order, id").all() as ScheduleItem[];
}

export function create(time: string, label: string): ScheduleItem {
  const db = getDb();
  const createTransaction = db.transaction(() => {
    const maxOrder = db.prepare("SELECT COALESCE(MAX(sort_order), -1) + 1 AS next FROM schedule_items").get() as { next: number };
    return db.prepare("INSERT INTO schedule_items (time, label, sort_order) VALUES (?, ?, ?) RETURNING *").get(time, label, maxOrder.next) as ScheduleItem;
  });
  return createTransaction();
}

export function update(id: number, data: { time?: string; label?: string }): void {
  const db = getDb();
  const fields: string[] = [];
  const values: (string | number)[] = [];
  if (data.time !== undefined) { fields.push("time = ?"); values.push(data.time); }
  if (data.label !== undefined) { fields.push("label = ?"); values.push(data.label); }
  if (fields.length === 0) throw new Error("No fields to update");
  values.push(id);
  const result = db.prepare(`UPDATE schedule_items SET ${fields.join(", ")} WHERE id = ?`).run(...values);
  if (result.changes === 0) throw new Error(`Schedule item ${id} not found`);
}

export function swapSortOrder(idA: number, orderA: number, idB: number, orderB: number): void {
  const db = getDb();
  db.transaction(() => {
    db.prepare("UPDATE schedule_items SET sort_order = ? WHERE id = ?").run(orderB, idA);
    db.prepare("UPDATE schedule_items SET sort_order = ? WHERE id = ?").run(orderA, idB);
  })();
}

export function deleteItem(id: number): void {
  const db = getDb();
  const result = db.prepare("DELETE FROM schedule_items WHERE id = ?").run(id);
  if (result.changes === 0) throw new Error(`Schedule item ${id} not found`);
}
