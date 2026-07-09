import { describe, it, expect, beforeAll, afterAll } from "vitest";
import Database from "better-sqlite3";
import { DDL } from "@/lib/schema";

let db: Database.Database;

vi.mock("@/lib/db", () => ({
  getDb: () => db,
}));

beforeAll(() => {
  db = new Database(":memory:");
  db.exec(DDL);
});

afterAll(() => {
  db.close();
});

describe("lodging repository", () => {
  it("creates and retrieves lodging options", async () => {
    const { create, getAll } = await import("@/lib/repository/lodging");
    create("Test Hotel", "https://example.com/img.jpg", "https://example.com");

    const all = getAll();
    expect(all.length).toBe(1);
    expect(all[0].title).toBe("Test Hotel");
    expect(all[0].url).toBe("https://example.com");
  });

  it("deletes a lodging option", async () => {
    const { create, getAll, remove } = await import("@/lib/repository/lodging");
    const created = create("To Delete", "https://example.com/img.jpg", "https://example.com");
    expect(getAll().length).toBe(2);

    remove(created.id);
    const remaining = getAll();
    expect(remaining.length).toBe(1);
    expect(remaining[0].title).toBe("Test Hotel");
  });
});
