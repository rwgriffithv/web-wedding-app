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

describe("faq repository", () => {
  it("creates and retrieves an FAQ item", async () => {
    const { create, getAll } = await import("@/lib/repository/faq");
    const item = create("What is this?", "A wedding website.");

    expect(item.question).toBe("What is this?");
    expect(item.answer).toBe("A wedding website.");
    expect(item.id).toBeGreaterThan(0);

    const all = getAll();
    expect(all.length).toBe(1);
    expect(all[0].question).toBe("What is this?");
  });

  it("orders items by sort_order", async () => {
    const { create, getAll } = await import("@/lib/repository/faq");
    create("Third question?", "Third answer.");
    create("First question?", "First answer.");
    create("Second question?", "Second answer.");

    const all = getAll();
    expect(all.length).toBe(3);
    expect(all[0].question).toBe("Third question?");
    expect(all[1].question).toBe("First question?");
    expect(all[2].question).toBe("Second question?");
    for (let i = 1; i < all.length; i++) {
      expect(all[i].sort_order).toBeGreaterThanOrEqual(all[i - 1].sort_order);
    }
  });

  it("updates an FAQ item", async () => {
    const { create, update, getAll } = await import("@/lib/repository/faq");
    const item = create("Old question?", "Old answer.");

    update(item.id, { question: "New question?", answer: "New answer." });

    const all = getAll();
    expect(all[0].question).toBe("New question?");
    expect(all[0].answer).toBe("New answer.");
  });

  it("deletes an FAQ item", async () => {
    const { create, deleteItem, getAll } = await import("@/lib/repository/faq");
    const item = create("Delete me?", "Yes.");

    deleteItem(item.id);
    expect(getAll().length).toBe(0);
  });

  it("swaps sort order between two items", async () => {
    const { create, getAll, swapSortOrder } = await import("@/lib/repository/faq");
    const a = create("First?", "Answer A");
    const b = create("Second?", "Answer B");

    const result = swapSortOrder(a.id, "down");
    expect(result.success).toBe(true);

    const all = getAll();
    expect(all[0].id).toBe(b.id);
    expect(all[1].id).toBe(a.id);
  });
});
