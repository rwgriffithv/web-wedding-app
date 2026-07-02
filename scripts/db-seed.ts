import Database from "better-sqlite3";
import path from "path";

const dbPath = process.env.DATABASE_URL?.replace(/^file:/, "") || path.join(process.cwd(), "data", "dev.db");

const db = new Database(dbPath);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'user' CHECK(role IN ('admin', 'user')),
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS page_views (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    path TEXT NOT NULL,
    viewed_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

const existing = db.prepare("SELECT COUNT(*) as count FROM users").get() as { count: number };

if (existing.count === 0) {
  const insertUser = db.prepare("INSERT INTO users (email, name, role) VALUES (?, ?, ?)");

  insertUser.run("admin@example.com", "Admin User", "admin");
  insertUser.run("alice@example.com", "Alice Johnson", "user");
  insertUser.run("bob@example.com", "Bob Smith", "user");
  insertUser.run("charlie@example.com", "Charlie Brown", "user");

  const insertView = db.prepare("INSERT INTO page_views (path) VALUES (?)");
  insertView.run("/");
  insertView.run("/features");
  insertView.run("/about");
  insertView.run("/admin");

  console.log("Database seeded with demo data.");
} else {
  console.log("Database already has data. Skipping seed.");
}

db.close();
