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

describe("schedule repository", () => {
  it("creates and retrieves schedule items", async () => {
    const { create, getAll } = await import("@/lib/repository/schedule");
    const item = create("3:00 PM", "Ceremony");

    expect(item.time).toBe("3:00 PM");
    expect(item.label).toBe("Ceremony");
    expect(item.id).toBeGreaterThan(0);

    const all = getAll();
    expect(all.length).toBe(1);
    expect(all[0].time).toBe("3:00 PM");
  });

  it("orders items by sort_order", async () => {
    const { create, getAll } = await import("@/lib/repository/schedule");
    create("9:00 PM", "Dancing");
    create("6:00 PM", "Dinner");
    create("4:00 PM", "Cocktail Hour");

    const all = getAll();
    expect(all.length).toBe(3);
    for (let i = 1; i < all.length; i++) {
      expect(all[i].sort_order).toBeGreaterThan(all[i - 1].sort_order);
    }
  });

  it("removes a schedule item", async () => {
    const { create, getAll, deleteItem } = await import("@/lib/repository/schedule");
    const item = create("7:00 PM", "Toasts");
    expect(getAll().length).toBe(1);

    deleteItem(item.id);
    expect(getAll().length).toBe(0);
  });
});
