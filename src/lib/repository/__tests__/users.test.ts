import { describe, it, expect, beforeAll, beforeEach, afterAll } from "vitest";
import { createTestDb, truncateAll } from "@/test/db-test-utils";
import type Database from "better-sqlite3";

let db: Database.Database;

vi.mock("@/lib/db", () => ({
  getDb: () => db,
}));

beforeAll(() => { db = createTestDb(); });
beforeEach(() => { truncateAll(db); });
afterAll(() => { db.close(); });

function insertUser(username = "testuser"): { id: number } {
  const result = db.prepare(
    "INSERT INTO users (username, password, display_name, type) VALUES (?, ?, ?, ?)"
  ).run(username, "hashed-pw", "Test User", "party");
  return { id: Number(result.lastInsertRowid) };
}

describe("incrementPageViews", () => {
  it("increments page view count for new user (no last_page_view_at)", async () => {
    const { incrementPageViews } = await import("@/lib/repository/users");
    const { id } = insertUser();

    const result = incrementPageViews(id, 15);
    expect(result).toBe(true);

    const user = db.prepare("SELECT total_page_views, last_page_view_at FROM users WHERE id = ?").get(id) as { total_page_views: number; last_page_view_at: string | null };
    expect(user.total_page_views).toBe(1);
    expect(user.last_page_view_at).not.toBeNull();
  });

  it("increments again after debounce window passes", async () => {
    const { incrementPageViews } = await import("@/lib/repository/users");
    const { id } = insertUser("debounce-user");

    // First call always succeeds
    incrementPageViews(id, 1);

    // Set last_page_view_at to 2 minutes ago (past the 1-minute debounce)
    db.prepare("UPDATE users SET last_page_view_at = datetime('now', '-2 minutes') WHERE id = ?").run(id);

    const result = incrementPageViews(id, 1);
    expect(result).toBe(true);

    const user = db.prepare("SELECT total_page_views FROM users WHERE id = ?").get(id) as { total_page_views: number };
    expect(user.total_page_views).toBe(2);
  });

  it("does not increment within debounce window", async () => {
    const { incrementPageViews } = await import("@/lib/repository/users");
    const { id } = insertUser("no-duplicate-user");

    // First call
    incrementPageViews(id, 15);

    // Second call immediately — should be blocked by debounce
    const result = incrementPageViews(id, 15);
    expect(result).toBe(false);

    const user = db.prepare("SELECT total_page_views FROM users WHERE id = ?").get(id) as { total_page_views: number };
    expect(user.total_page_views).toBe(1);
  });

  it("always increments when debounceMinutes is 0", async () => {
    const { incrementPageViews } = await import("@/lib/repository/users");
    const { id } = insertUser("zero-debounce");

    incrementPageViews(id, 0);
    incrementPageViews(id, 0);
    incrementPageViews(id, 0);

    const user = db.prepare("SELECT total_page_views FROM users WHERE id = ?").get(id) as { total_page_views: number };
    expect(user.total_page_views).toBe(3);
  });

  it("throws for nonexistent user", async () => {
    const { incrementPageViews } = await import("@/lib/repository/users");
    expect(() => incrementPageViews(99999, 15)).toThrow("User 99999 not found");
  });
});
