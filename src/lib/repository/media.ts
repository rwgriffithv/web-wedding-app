import { getDb, type MediaItem, type MediaTab } from "@/lib/db";
import { deleteThumbnail } from "@/lib/media";

export function getAll(): MediaItem[] {
  const db = getDb();
  return db.prepare("SELECT * FROM media_items ORDER BY sort_order, id").all() as MediaItem[];
}

export function getBySection(section: string): MediaItem[] {
  const db = getDb();
  return db.prepare("SELECT * FROM media_items WHERE section = ? ORDER BY sort_order, id").all(section) as MediaItem[];
}

export function create(data: { type: "image" | "video"; url: string; thumbnail_url?: string; title?: string; section?: string }): MediaItem {
  const db = getDb();
  const createTransaction = db.transaction(() => {
    const maxOrder = db.prepare("SELECT COALESCE(MAX(sort_order), -1) + 1 AS next FROM media_items").get() as { next: number };
    return db.prepare("INSERT INTO media_items (type, url, thumbnail_url, title, section, sort_order) VALUES (?, ?, ?, ?, ?, ?) RETURNING *").get(
      data.type, data.url, data.thumbnail_url ?? null, data.title ?? null, data.section ?? "General", maxOrder.next
    ) as MediaItem;
  });
  return createTransaction();
}

export function update(id: number, data: { title?: string; section?: string }): void {
  const db = getDb();
  const fields: string[] = [];
  const values: (string | number)[] = [];
  if (data.title !== undefined) { fields.push("title = ?"); values.push(data.title); }
  if (data.section !== undefined) { fields.push("section = ?"); values.push(data.section); }
  if (fields.length === 0) throw new Error("No fields to update");
  values.push(id);
  const result = db.prepare(`UPDATE media_items SET ${fields.join(", ")} WHERE id = ?`).run(...values);
  if (result.changes === 0) throw new Error(`Media item ${id} not found`);
}

export function deleteItem(id: number): void {
  const db = getDb();
  db.transaction(() => {
    const item = db.prepare("SELECT thumbnail_url FROM media_items WHERE id = ?").get(id) as { thumbnail_url: string | null } | undefined;
    if (!item) throw new Error(`Media item ${id} not found`);
    deleteThumbnail(item.thumbnail_url);
    db.prepare("DELETE FROM media_items WHERE id = ?").run(id);
  })();
}

export function swapItemSortOrder(idA: number, orderA: number, idB: number, orderB: number): void {
  const db = getDb();
  db.transaction(() => {
    db.prepare("UPDATE media_items SET sort_order = ? WHERE id = ?").run(orderB, idA);
    db.prepare("UPDATE media_items SET sort_order = ? WHERE id = ?").run(orderA, idB);
  })();
}

export function getAllTabs(): MediaTab[] {
  const db = getDb();
  return db.prepare("SELECT * FROM media_tabs ORDER BY sort_order, id").all() as MediaTab[];
}

export function createTab(data: { slug: string; label: string }): MediaTab {
  const db = getDb();
  const createTransaction = db.transaction(() => {
    const maxOrder = db.prepare("SELECT COALESCE(MAX(sort_order), -1) + 1 AS next FROM media_tabs").get() as { next: number };
    return db.prepare("INSERT INTO media_tabs (slug, label, sort_order) VALUES (?, ?, ?) RETURNING *").get(
      data.slug, data.label, maxOrder.next
    ) as MediaTab;
  });
  return createTransaction();
}

export function updateTab(id: number, data: { label?: string; sort_order?: number }): void {
  const db = getDb();
  const fields: string[] = [];
  const values: (string | number)[] = [];
  if (data.label !== undefined) { fields.push("label = ?"); values.push(data.label); }
  if (data.sort_order !== undefined) { fields.push("sort_order = ?"); values.push(data.sort_order); }
  if (fields.length === 0) throw new Error("No fields to update");
  values.push(id);
  const result = db.prepare(`UPDATE media_tabs SET ${fields.join(", ")} WHERE id = ?`).run(...values);
  if (result.changes === 0) throw new Error(`Media tab ${id} not found`);
}

export function deleteTab(id: number): void {
  const db = getDb();
  db.transaction(() => {
    const tab = db.prepare("SELECT slug FROM media_tabs WHERE id = ?").get(id) as { slug: string } | undefined;
    if (!tab) throw new Error(`Media tab ${id} not found`);
    const items = db.prepare("SELECT thumbnail_url FROM media_items WHERE section = ?").all(tab.slug) as { thumbnail_url: string | null }[];
    db.prepare("DELETE FROM media_items WHERE section = ?").run(tab.slug);
    db.prepare("DELETE FROM media_tabs WHERE id = ?").run(id);
    for (const item of items) {
      deleteThumbnail(item.thumbnail_url);
    }
  })();
}

export function swapTabSortOrder(idA: number, orderA: number, idB: number, orderB: number): void {
  const db = getDb();
  db.transaction(() => {
    db.prepare("UPDATE media_tabs SET sort_order = ? WHERE id = ?").run(orderB, idA);
    db.prepare("UPDATE media_tabs SET sort_order = ? WHERE id = ?").run(orderA, idB);
  })();
}
