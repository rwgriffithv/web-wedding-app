import { getDb, type LodgingOption } from "@/lib/db";

export function getAll(): LodgingOption[] {
  const db = getDb();
  return db.prepare("SELECT * FROM lodging_options ORDER BY sort_order, id").all() as LodgingOption[];
}

export function create(title: string, imageUrl: string, url: string, sortOrder?: number): LodgingOption {
  const db = getDb();
  const maxOrder = db.prepare("SELECT COALESCE(MAX(sort_order), -1) + 1 AS next FROM lodging_options").get() as { next: number };
  const result = db.prepare("INSERT INTO lodging_options (title, image_url, url, sort_order) VALUES (?, ?, ?, ?)").run(title, imageUrl, url, sortOrder ?? maxOrder.next);
  return db.prepare("SELECT * FROM lodging_options WHERE id = ?").get(result.lastInsertRowid) as LodgingOption;
}

export function remove(id: number): void {
  const db = getDb();
  db.prepare("DELETE FROM lodging_options WHERE id = ?").run(id);
}
