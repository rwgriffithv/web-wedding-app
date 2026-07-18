import Database from "better-sqlite3";
import path from "path";

const dbPath = process.env.DATABASE_URL?.replace(/^file:/, "") || path.join(process.cwd(), "data", "dev.db");

export function openDb() {
  const db = new Database(dbPath);
  db.pragma("journal_mode = WAL");
  return db;
}

export function getPageViewsForUser(userId: number): number {
  const db = openDb();
  const row = db.prepare("SELECT total_page_views FROM users WHERE id = ?").get(userId) as { total_page_views: number } | undefined;
  db.close();
  return row?.total_page_views ?? 0;
}

export function getPageViewsByUsername(username: string): number {
  const db = openDb();
  const row = db.prepare("SELECT total_page_views FROM users WHERE username = ?").get(username) as { total_page_views: number } | undefined;
  db.close();
  return row?.total_page_views ?? 0;
}

export function setPageViewDebounce(minutes: number) {
  const db = openDb();
  db.prepare("INSERT OR REPLACE INTO site_config (key, value) VALUES (?, ?)").run("page_view_debounce_minutes", String(minutes));
  db.close();
}
