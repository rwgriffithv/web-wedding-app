import { getDb, type LodgingOption } from "@/lib/db";
import { deleteThumbnail } from "@/lib/media";
import { swapSortOrder as swap } from "@/lib/repository/sort";

export function getAll(): LodgingOption[] {
  const db = getDb();
  return db.prepare("SELECT * FROM lodging_options ORDER BY sort_order, id").all() as LodgingOption[];
}

export function create(data: { title: string; image_url: string; url: string; thumbnail_url?: string | null; sort_order?: number }): LodgingOption {
  const db = getDb();
  const createTransaction = db.transaction(() => {
    const maxOrder = db.prepare("SELECT COALESCE(MAX(sort_order), -1) + 1 AS next FROM lodging_options").get() as { next: number };
    return db.prepare("INSERT INTO lodging_options (title, image_url, thumbnail_url, url, sort_order) VALUES (?, ?, ?, ?, ?) RETURNING *").get(
      data.title, data.image_url, data.thumbnail_url ?? null, data.url, data.sort_order ?? maxOrder.next,
    ) as LodgingOption;
  });
  return createTransaction();
}

export function update(id: number, data: { title?: string; image_url?: string; thumbnail_url?: string | null; url?: string }): void {
  const db = getDb();
  const fields: string[] = [];
  const values: (string | number | null)[] = [];
  if (data.title !== undefined) { fields.push("title = ?"); values.push(data.title); }
  if (data.image_url !== undefined) { fields.push("image_url = ?"); values.push(data.image_url); }
  if (data.thumbnail_url !== undefined) { fields.push("thumbnail_url = ?"); values.push(data.thumbnail_url); }
  if (data.url !== undefined) { fields.push("url = ?"); values.push(data.url); }
  if (fields.length === 0) throw new Error("No fields to update");
  values.push(id);
  const result = db.prepare(`UPDATE lodging_options SET ${fields.join(", ")} WHERE id = ?`).run(...values);
  if (result.changes === 0) throw new Error(`Lodging option ${id} not found`);
}

export function swapSortOrder(id: number, direction: "up" | "down"): { success: boolean; error?: string } {
  const db = getDb();
  return swap(db, "lodging_options", id, direction, "Lodging option not found.");
}

export function deleteOption(id: number): void {
  const db = getDb();
  db.transaction(() => {
    const item = db.prepare("SELECT thumbnail_url FROM lodging_options WHERE id = ?").get(id) as { thumbnail_url: string | null } | undefined;
    if (!item) throw new Error(`Lodging option ${id} not found`);
    deleteThumbnail(item.thumbnail_url);
    db.prepare("DELETE FROM lodging_options WHERE id = ?").run(id);
  })();
}
