import Database from "better-sqlite3";
import { DDL } from "@/lib/db-schema";

const TABLES = [
  "rate_limit_violations",
  "banned_ips",
  "questions",
  "faq_items",
  "rsvp_responses",
  "media_items",
  "media_tabs",
  "lodging_options",
  "dress_code_images",
  "schedule_items",
  "site_config",
  "users",
  "guests",
  "parties",
];

export function createTestDb(): Database.Database {
  const db = new Database(":memory:");
  db.exec(DDL);
  return db;
}

export function truncateAll(db: Database.Database): void {
  for (const table of TABLES) {
    db.prepare(`DELETE FROM ${table}`).run();
  }
}
