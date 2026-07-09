import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import { getConfig } from "./config";
import { hashPassword } from "./auth";
import { DDL } from "./schema";
import { runMigrations } from "./migrations";

const DB_PATH = process.env.DATABASE_URL?.replace(/^file:/, "") || path.join(process.cwd(), "data", "dev.db");

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!db) {
    fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
    db = new Database(DB_PATH);
    db.pragma("journal_mode = WAL");
    db.pragma("foreign_keys = ON");

    db.exec(DDL);
    runMigrations(db);

    seedDefaults(db);
  }
  return db;
}

function seedDefaults(database: Database.Database): void {
  const existingAdmin = database.prepare("SELECT COUNT(*) as count FROM guests WHERE type = 'admin'").get() as { count: number };

  if (existingAdmin.count === 0) {
    database.prepare(
      "INSERT OR IGNORE INTO guests (username, password, display_name, type, party_id, can_rsvp, can_bring_plus_one) VALUES (?, ?, ?, ?, ?, ?, ?)"
    ).run(getConfig().adminUsername, hashPassword(getConfig().adminPassword), "Admin", "admin", null, 1, 0);
  }
}

export interface Guest {
  id: number;
  username: string;
  password: string;
  display_name: string;
  type: "admin" | "guest" | "guest_plus_one";
  party_id: number | null;
  can_rsvp: number;
  can_bring_plus_one: number;
  created_at: string;
}

export interface Party {
  id: number;
  name: string;
  code: string;
  created_at: string;
}

export interface SiteConfig {
  key: string;
  value: string;
}

export interface LodgingOption {
  id: number;
  title: string;
  image_url: string;
  url: string;
  sort_order: number;
}

export interface DressCodeImage {
  id: number;
  image_url: string;
  sort_order: number;
}

export interface RsvpResponse {
  id: number;
  guest_id: number;
  guest_name: string;
  attending: number;
  plus_one_name: string | null;
  created_at: string;
}

export interface MediaItem {
  id: number;
  type: "image" | "video";
  url: string;
  thumbnail_url: string | null;
  title: string | null;
  section: string;
  sort_order: number;
}

export interface ScheduleItem {
  id: number;
  time: string;
  label: string;
  sort_order: number;
}
