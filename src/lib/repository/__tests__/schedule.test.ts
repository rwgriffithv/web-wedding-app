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
    expect(all.length).toBe(4);
    for (let i = 1; i < all.length; i++) {
      expect(all[i].sort_order).toBeGreaterThan(all[i - 1].sort_order);
    }
  });

  it("removes a schedule item", async () => {
    const { create, getAll, remove } = await import("@/lib/repository/schedule");
    const before = getAll().length;
    const item = create("7:00 PM", "Toasts");

    expect(getAll().length).toBe(before + 1);

    remove(item.id);
    expect(getAll().length).toBe(before);
  });
});
