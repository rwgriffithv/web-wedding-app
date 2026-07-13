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

describe("guests repository", () => {
  it("creates and retrieves a guest by id", async () => {
    const { createGuest, getGuestById } = await import("@/lib/repository/guests");
    const created = createGuest("Alice");

    expect(created.display_name).toBe("Alice");
    expect(created.id).toBeGreaterThan(0);

    const byId = getGuestById(created.id);
    expect(byId).toBeDefined();
    expect(byId!.display_name).toBe("Alice");
  });

  it("returns all guests", async () => {
    const { createGuest, getAll } = await import("@/lib/repository/guests");
    createGuest("Alice");
    createGuest("Bob");

    const all = getAll();
    expect(all.length).toBe(2);
    expect(all.map(g => g.display_name)).toEqual(expect.arrayContaining(["Alice", "Bob"]));
  });

  it("updates guest fields", async () => {
    const { createGuest, getGuestById, updateGuest } = await import("@/lib/repository/guests");
    const created = createGuest("Charlie");

    updateGuest(created.id, { display_name: "Charlie Updated", can_bring_plus_one: 1 });
    const updated = getGuestById(created.id);
    expect(updated!.display_name).toBe("Charlie Updated");
    expect(updated!.can_bring_plus_one).toBe(1);
  });

  it("returns undefined for unknown id", async () => {
    const { getGuestById } = await import("@/lib/repository/guests");
    expect(getGuestById(999)).toBeUndefined();
  });

  it("preserves unexpected field during partial update", async () => {
    const { createGuest, getGuestById, updateGuest } = await import("@/lib/repository/guests");
    const created = createGuest("Dave", null, 0, 1);
    expect(created.unexpected).toBe(1);

    updateGuest(created.id, { display_name: "Dave Updated" });
    const updated = getGuestById(created.id);
    expect(updated!.display_name).toBe("Dave Updated");
    expect(updated!.unexpected).toBe(1);
  });
});
