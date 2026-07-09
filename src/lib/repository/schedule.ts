import { getDb, type ScheduleItem } from "@/lib/db";

export function getAll(): ScheduleItem[] {
  const db = getDb();
  return db.prepare("SELECT * FROM schedule_items ORDER BY sort_order, id").all() as ScheduleItem[];
}

export function create(time: string, label: string): ScheduleItem {
  const db = getDb();
  const maxOrder = db.prepare("SELECT COALESCE(MAX(sort_order), -1) + 1 AS next FROM schedule_items").get() as { next: number };
  const result = db.prepare("INSERT INTO schedule_items (time, label, sort_order) VALUES (?, ?, ?)").run(time, label, maxOrder.next);
  return db.prepare("SELECT * FROM schedule_items WHERE id = ?").get(result.lastInsertRowid) as ScheduleItem;
}

export function remove(id: number): void {
  const db = getDb();
  db.prepare("DELETE FROM schedule_items WHERE id = ?").run(id);
}
