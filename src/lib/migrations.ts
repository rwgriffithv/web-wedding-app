import type Database from "better-sqlite3";

export function runMigrations(database: Database.Database): void {
  const columns = database.prepare("PRAGMA table_info(guests)").all() as { name: string }[];
  const colNames = columns.map(c => c.name);

  if (!colNames.includes("party_id")) {
    database.exec("ALTER TABLE guests ADD COLUMN party_id INTEGER REFERENCES parties(id) ON DELETE SET NULL");
  }
  if (!colNames.includes("can_rsvp")) {
    database.exec("ALTER TABLE guests ADD COLUMN can_rsvp INTEGER NOT NULL DEFAULT 1");
  }
  if (!colNames.includes("can_bring_plus_one")) {
    database.exec("ALTER TABLE guests ADD COLUMN can_bring_plus_one INTEGER NOT NULL DEFAULT 0");
  }
}
