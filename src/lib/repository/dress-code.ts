import { getDb, type DressCodeImage } from "@/lib/db";

export function getImages(): DressCodeImage[] {
  const db = getDb();
  return db.prepare("SELECT * FROM dress_code_images ORDER BY sort_order, id").all() as DressCodeImage[];
}

export function addImage(imageUrl: string): DressCodeImage {
  const db = getDb();
  const maxOrder = db.prepare("SELECT COALESCE(MAX(sort_order), -1) + 1 AS next FROM dress_code_images").get() as { next: number };
  const result = db.prepare("INSERT INTO dress_code_images (image_url, sort_order) VALUES (?, ?)").run(imageUrl, maxOrder.next);
  return db.prepare("SELECT * FROM dress_code_images WHERE id = ?").get(result.lastInsertRowid) as DressCodeImage;
}

export function removeImage(id: number): void {
  const db = getDb();
  db.prepare("DELETE FROM dress_code_images WHERE id = ?").run(id);
}


