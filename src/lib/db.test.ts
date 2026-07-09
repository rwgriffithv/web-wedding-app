import Database from "better-sqlite3";

describe("db schema", () => {
  let db: Database.Database;

  beforeAll(() => {
    db = new Database(":memory:");
    db.pragma("journal_mode = WAL");
    db.exec(`
      CREATE TABLE IF NOT EXISTS guests (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        display_name TEXT NOT NULL,
        type TEXT NOT NULL DEFAULT 'guest' CHECK(type IN ('admin', 'guest', 'guest_plus_one')),
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
    `);
  });

  it("creates guests table and inserts a row", () => {
    db.prepare("INSERT INTO guests (username, password, display_name, type) VALUES (?, ?, ?, ?)").run("test", "pass", "Test User", "guest");
    const row = db.prepare("SELECT * FROM guests WHERE username = ?").get("test") as { username: string; display_name: string };
    expect(row.username).toBe("test");
    expect(row.display_name).toBe("Test User");
  });
});
