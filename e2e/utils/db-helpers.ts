import Database from "better-sqlite3";
import path from "path";

import { PAGE_VIEW_DEBOUNCE_MINUTES_KEY } from "../../src/lib/constants";

const dbPath = process.env.DATABASE_URL?.replace(/^file:/, "") || path.join(process.cwd(), "data", "dev.db");

export function openDb() {
  const db = new Database(dbPath);
  db.pragma("journal_mode = WAL");
  return db;
}

export function getPageViewsByUsername(username: string): number {
  const db = openDb();
  const row = db.prepare("SELECT total_page_views FROM users WHERE username = ?").get(username) as { total_page_views: number } | undefined;
  db.close();
  return row?.total_page_views ?? 0;
}

export function setPageViewDebounce(minutes: number) {
  const db = openDb();
  db.prepare("INSERT OR REPLACE INTO site_config (key, value) VALUES (?, ?)").run(PAGE_VIEW_DEBOUNCE_MINUTES_KEY, String(minutes));
  db.close();
}
