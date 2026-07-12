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

describe("rsvp repository", () => {
  it("submits and retrieves a response by guest id", async () => {
    const { submitResponse, getResponseByGuest } = await import("@/lib/repository/rsvp");
    db.prepare("INSERT INTO guests (id, display_name) VALUES (1, 'Guest 1')").run();

    const response = submitResponse(1, "Guest 1", true, "Plus One");
    expect(response.guest_id).toBe(1);
    expect(response.guest_name).toBe("Guest 1");
    expect(response.attending).toBe(1);
    expect(response.plus_one_name).toBe("Plus One");

    const retrieved = getResponseByGuest(1);
    expect(retrieved).toBeDefined();
    expect(retrieved!.attending).toBe(1);
  });

  it("updates an existing response", async () => {
    const { submitResponse, getResponseByGuest } = await import("@/lib/repository/rsvp");
    db.prepare("INSERT INTO guests (id, display_name) VALUES (1, 'Guest 1')").run();

    submitResponse(1, "Guest 1", false);
    const updated = getResponseByGuest(1);
    expect(updated!.attending).toBe(0);
    expect(updated!.plus_one_name).toBeNull();
  });

  it("lists all responses", async () => {
    const { getAllResponses, submitResponse } = await import("@/lib/repository/rsvp");
    db.prepare("INSERT INTO guests (id, display_name) VALUES (1, 'Guest 1')").run();
    db.prepare("INSERT INTO guests (id, display_name) VALUES (2, 'Guest 2')").run();
    submitResponse(1, "Guest 1", true);
    submitResponse(2, "Guest 2", true);

    const all = getAllResponses();
    expect(all.length).toBe(2);
  });

  it("returns response count", async () => {
    const { getResponseCount, submitResponse } = await import("@/lib/repository/rsvp");
    db.prepare("INSERT INTO guests (id, display_name) VALUES (1, 'Guest 1')").run();
    db.prepare("INSERT INTO guests (id, display_name) VALUES (2, 'Guest 2')").run();
    submitResponse(1, "Guest 1", true);
    submitResponse(2, "Guest 2", false);

    const count = getResponseCount();
    expect(count.total).toBe(2);
    expect(count.attending).toBe(1);
  });

  it("returns undefined for guest with no response", async () => {
    const { getResponseByGuest } = await import("@/lib/repository/rsvp");
    expect(getResponseByGuest(999)).toBeUndefined();
  });
});
