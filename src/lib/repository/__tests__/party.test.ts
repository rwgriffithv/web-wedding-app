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

describe("party repository", () => {
  it("creates a party with auto-generated code", async () => {
    const { createParty, getPartyById } = await import("@/lib/repository/party");
    const party = createParty("Smith Family");

    expect(party.name).toBe("Smith Family");
    expect(party.id).toBeGreaterThan(0);
    expect(party.code).toMatch(/^[A-Z]{1,4}-[A-Z0-9]{6}$/);

    const found = getPartyById(party.id);
    expect(found).toBeDefined();
    expect(found!.name).toBe("Smith Family");
  });

  it("creates a party with custom code", async () => {
    const { createParty } = await import("@/lib/repository/party");
    const party = createParty("Johnson Family", "CUST-123456");

    expect(party.code).toBe("CUST-123456");
  });

  it("looks up party by code (case-insensitive)", async () => {
    const { createParty, getPartyByCode } = await import("@/lib/repository/party");
    const party = createParty("Williams Family");

    const found = getPartyByCode(party.code.toLowerCase());
    expect(found).toBeDefined();
    expect(found!.id).toBe(party.id);
  });

  it("returns undefined for unknown code", async () => {
    const { getPartyByCode } = await import("@/lib/repository/party");
    expect(getPartyByCode("NONEXISTENT")).toBeUndefined();
  });

  it("returns all parties sorted by name", async () => {
    const { createParty, getAll } = await import("@/lib/repository/party");
    createParty("Zeta Family");
    createParty("Alpha Family");
    createParty("Middle Family");

    const all = getAll();
    expect(all.length).toBe(3);
    expect(all[0].name).toBe("Alpha Family");
    expect(all[1].name).toBe("Middle Family");
    expect(all[2].name).toBe("Zeta Family");
  });

  it("createParty creates a corresponding party user", async () => {
    const { createParty } = await import("@/lib/repository/party");
    const party = createParty("Test Family");

    const user = db.prepare("SELECT * FROM users WHERE party_id = ? AND type = 'party'").get(party.id) as { username: string; display_name: string } | undefined;
    expect(user).toBeDefined();
    expect(user!.username).toBe(party.code);
    expect(user!.display_name).toBe("Test Family");
  });

  it("deleteEmptyParty deletes party when no guests", async () => {
    const { createParty, deleteEmptyParty, getPartyById } = await import("@/lib/repository/party");
    const party = createParty("Empty Family");

    deleteEmptyParty(party.id);
    expect(getPartyById(party.id)).toBeUndefined();
  });

  it("deleteEmptyParty preserves party when guests exist", async () => {
    const { createParty, deleteEmptyParty, getPartyById } = await import("@/lib/repository/party");
    const party = createParty("Occupied Family");

    db.prepare("INSERT INTO guests (display_name, party_id) VALUES ('Guest', ?)").run(party.id);

    deleteEmptyParty(party.id);
    expect(getPartyById(party.id)).toBeDefined();
  });

  it("updateParty updates party invited status", async () => {
    const { createParty, updateParty, getPartyById } = await import("@/lib/repository/party");
    const party = createParty("Updateable Family");

    expect(getPartyById(party.id)!.invited).toBe(0);

    updateParty(party.id, { invited: 1 });
    expect(getPartyById(party.id)!.invited).toBe(1);

    updateParty(party.id, { invited: 0 });
    expect(getPartyById(party.id)!.invited).toBe(0);
  });
});
