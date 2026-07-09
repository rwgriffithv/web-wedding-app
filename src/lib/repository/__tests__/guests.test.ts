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

describe("guests repository", () => {
  it("creates and retrieves a guest by id and username", async () => {
    const { createGuest, getGuestById, getGuestByUsername } = await import("@/lib/repository/guests");
    const created = createGuest("alice", "secret", "Alice", "guest");

    expect(created.username).toBe("alice");
    expect(created.display_name).toBe("Alice");
    expect(created.type).toBe("guest");
    expect(created.id).toBeGreaterThan(0);

    const byId = getGuestById(created.id);
    expect(byId).toBeDefined();
    expect(byId!.username).toBe("alice");

    const byUsername = getGuestByUsername("alice");
    expect(byUsername).toBeDefined();
    expect(byUsername!.id).toBe(created.id);
  });

  it("returns all guests", async () => {
    const { createGuest, getAllGuests } = await import("@/lib/repository/guests");
    createGuest("bob", "pass", "Bob", "guest_plus_one");

    const all = getAllGuests();
    expect(all.length).toBe(2);
    expect(all.map(g => g.username)).toEqual(expect.arrayContaining(["alice", "bob"]));
  });

  it("updates guest fields", async () => {
    const { createGuest, getGuestById, updateGuest } = await import("@/lib/repository/guests");
    const created = createGuest("charlie", "oldpass", "Charlie", "guest");

    updateGuest(created.id, { display_name: "Charlie Updated", type: "guest_plus_one" });
    const updated = getGuestById(created.id);
    expect(updated!.display_name).toBe("Charlie Updated");
    expect(updated!.type).toBe("guest_plus_one");
    expect(updated!.username).toBe("charlie");
  });

  it("returns undefined for unknown id", async () => {
    const { getGuestById } = await import("@/lib/repository/guests");
    expect(getGuestById(999)).toBeUndefined();
  });

  it("returns undefined for unknown username", async () => {
    const { getGuestByUsername } = await import("@/lib/repository/guests");
    expect(getGuestByUsername("nobody")).toBeUndefined();
  });
});
