import { getDb, type MediaItem } from "@/lib/db";

export function getAll(): MediaItem[] {
  const db = getDb();
  return db.prepare("SELECT * FROM media_items ORDER BY sort_order, id").all() as MediaItem[];
}

export function getBySection(section: string): MediaItem[] {
  const db = getDb();
  return db.prepare("SELECT * FROM media_items WHERE section = ? ORDER BY sort_order, id").all(section) as MediaItem[];
}

export function getSections(): string[] {
  const db = getDb();
  return (db.prepare("SELECT DISTINCT section FROM media_items ORDER BY section").all() as { section: string }[]).map(r => r.section);
}

export function create(data: { type: "image" | "video"; url: string; thumbnail_url?: string; title?: string; section?: string }): MediaItem {
  const db = getDb();
  const maxOrder = db.prepare("SELECT COALESCE(MAX(sort_order), -1) + 1 AS next FROM media_items").get() as { next: number };
  const result = db.prepare("INSERT INTO media_items (type, url, thumbnail_url, title, section, sort_order) VALUES (?, ?, ?, ?, ?, ?)").run(
    data.type, data.url, data.thumbnail_url ?? null, data.title ?? null, data.section ?? "General", maxOrder.next
  );
  return db.prepare("SELECT * FROM media_items WHERE id = ?").get(result.lastInsertRowid) as MediaItem;
}

export function remove(id: number): void {
  const db = getDb();
  db.prepare("DELETE FROM media_items WHERE id = ?").run(id);
}
