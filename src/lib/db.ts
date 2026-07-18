import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import { getEnvConfig } from "./config";
import { hashPassword } from "./auth";
import { DDL } from "./schema";

export type { Guest, User, SafeUser, Party, SiteConfig, LodgingOption, DressCodeImage, RsvpResponse, MediaItem, MediaTab, ScheduleItem, GuestRsvpStatus, FaqItem, Question, CombinedIp } from "./types";

const DB_PATH = process.env.DATABASE_URL?.replace(/^file:/, "") || path.join(process.cwd(), "data", "dev.db");

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!db) {
    fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
    db = new Database(DB_PATH);
    db.pragma("journal_mode = WAL");
    db.pragma("foreign_keys = ON");
    db.pragma("busy_timeout = 5000");

    db.exec(DDL);

    seedDefaults(db);
  }
  return db;
}

function seedDefaults(database: Database.Database): void {
  const existingAdmin = database.prepare("SELECT COUNT(*) as count FROM users WHERE type = 'admin'").get() as { count: number };

  if (existingAdmin.count === 0) {
    database.prepare(
      "INSERT OR IGNORE INTO users (username, password, display_name, type, party_id) VALUES (?, ?, ?, ?, ?)"
    ).run(getEnvConfig().adminUsername, hashPassword(getEnvConfig().adminPassword), "Admin", "admin", null);
  }
}
