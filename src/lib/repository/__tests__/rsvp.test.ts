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

  it("computes dashboard counts correctly", async () => {
    const { submitResponse, getDashboardCounts } = await import("@/lib/repository/rsvp");

    // Set up parties and guests
    db.prepare("INSERT INTO parties (id, name, code, invited) VALUES (1, 'Party A', 'A001', 1)").run();
    db.prepare("INSERT INTO parties (id, name, code, invited) VALUES (2, 'Party B', 'B002', 0)").run();
    // Guest 1: invited party, attending with plus one
    db.prepare("INSERT INTO guests (id, display_name, party_id, can_bring_plus_one, unexpected) VALUES (1, 'Guest 1', 1, 1, 0)").run();
    // Guest 2: invited party, attending, no plus one
    db.prepare("INSERT INTO guests (id, display_name, party_id, can_bring_plus_one, unexpected) VALUES (2, 'Guest 2', 1, 0, 0)").run();
    // Guest 3: not in invited party, no RSVP, not unexpected, CAN bring plus one (potential +1)
    db.prepare("INSERT INTO guests (id, display_name, party_id, can_bring_plus_one, unexpected) VALUES (3, 'Guest 3', 2, 1, 0)").run();
    // Guest 4: not in invited party, no RSVP, unexpected (should not count)
    db.prepare("INSERT INTO guests (id, display_name, party_id, can_bring_plus_one, unexpected) VALUES (4, 'Guest 4', 2, 0, 1)").run();

    submitResponse(1, "Guest 1", true, "Plus One A");
    submitResponse(2, "Guest 2", true);

    const counts = getDashboardCounts();

    // Invited: Guest 1 + Guest 2 in invited party
    expect(counts.invited.guests).toBe(2);
    // Guest 1 RSVP'd yes with plus_one_name → 1
    expect(counts.invited.plus_ones).toBe(1);
    expect(counts.invited.total).toBe(3);

    // Expected: Guest 1 (attending) + Guest 2 (attending) + Guest 3 (not unexpected, no RSVP)
    // Guest 4 is unexpected → excluded
    expect(counts.expected.guests).toBe(3);
    // Guest 1: confirmed plus-one (RSVP'd yes with name) = 1
    // Guest 3: potential plus-one (no RSVP, not unexpected, can_bring_plus_one=1) = 1
    expect(counts.expected.plus_ones).toBe(2);
    expect(counts.expected.total).toBe(5);

    // Confirmed: Guest 1 + Guest 2 (both attending)
    expect(counts.confirmed.guests).toBe(2);
    expect(counts.confirmed.plus_ones).toBe(1);
    expect(counts.confirmed.total).toBe(3);
  });
});
