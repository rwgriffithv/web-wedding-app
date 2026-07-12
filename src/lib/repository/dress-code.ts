import { getDb, type DressCodeImage } from "@/lib/db";
import { deleteThumbnail } from "@/lib/media";

export function getImages(): DressCodeImage[] {
  const db = getDb();
  return db.prepare("SELECT * FROM dress_code_images ORDER BY sort_order, id").all() as DressCodeImage[];
}

export function createImage(imageUrl: string, thumbnailUrl?: string): DressCodeImage {
  const db = getDb();
  const createTransaction = db.transaction(() => {
    const maxOrder = db.prepare("SELECT COALESCE(MAX(sort_order), -1) + 1 AS next FROM dress_code_images").get() as { next: number };
    return db.prepare("INSERT INTO dress_code_images (image_url, thumbnail_url, sort_order) VALUES (?, ?, ?) RETURNING *").get(imageUrl, thumbnailUrl ?? null, maxOrder.next) as DressCodeImage;
  });
  return createTransaction();
}

export function swapSortOrder(idA: number, orderA: number, idB: number, orderB: number): void {
  const db = getDb();
  db.transaction(() => {
    db.prepare("UPDATE dress_code_images SET sort_order = ? WHERE id = ?").run(orderB, idA);
    db.prepare("UPDATE dress_code_images SET sort_order = ? WHERE id = ?").run(orderA, idB);
  })();
}

export function deleteImage(id: number): void {
  const db = getDb();
  db.transaction(() => {
    const img = db.prepare("SELECT thumbnail_url FROM dress_code_images WHERE id = ?").get(id) as { thumbnail_url: string | null } | undefined;
    if (!img) throw new Error(`Dress code image ${id} not found`);
    deleteThumbnail(img.thumbnail_url);
    db.prepare("DELETE FROM dress_code_images WHERE id = ?").run(id);
  })();
}
