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

describe("users repository", () => {
  it("creates a user with hashed password", async () => {
    const { createUser, getUserById } = await import("@/lib/repository/users");
    const user = createUser("alice", "password123", "Alice Admin", "admin");

    expect(user.username).toBe("alice");
    expect(user.display_name).toBe("Alice Admin");
    expect(user.type).toBe("admin");
    expect((user as Record<string, unknown>).password).not.toBe("password123");
    expect(user.id).toBeGreaterThan(0);

    const found = getUserById(user.id);
    expect(found).toBeDefined();
    expect(found!.username).toBe("alice");
  });

  it("looks up user by username", async () => {
    const { createUser, getUserWithPassword } = await import("@/lib/repository/users");
    createUser("bob", "pass1234", "Bob Viewer", "viewer");

    const found = getUserWithPassword("bob");
    expect(found).toBeDefined();
    expect(found!.type).toBe("viewer");
  });

  it("returns undefined for unknown username", async () => {
    const { getUserWithPassword } = await import("@/lib/repository/users");
    expect(getUserWithPassword("nonexistent")).toBeUndefined();
  });

  it("returns undefined for unknown id", async () => {
    const { getUserById } = await import("@/lib/repository/users");
    expect(getUserById(999)).toBeUndefined();
  });

  it("returns all users sorted by type then name", async () => {
    const { createUser, getAllUsers } = await import("@/lib/repository/users");
    createUser("viewer1", "pass1234", "Charlie", "viewer");
    createUser("admin1", "pass1234", "Alice", "admin");
    createUser("party1", "pass1234", "Bob", "party");

    const all = getAllUsers();
    expect(all.length).toBe(3);
    expect(all[0].type).toBe("admin");
    expect(all[1].type).toBe("party");
    expect(all[2].type).toBe("viewer");
  });

  it("looks up user by party id", async () => {
    const { createUser, getPartyUserWithPassword } = await import("@/lib/repository/users");
    db.prepare("INSERT INTO parties (name, code) VALUES ('Test', 'TEST-123456')").run();
    const party = db.prepare("SELECT * FROM parties WHERE code = 'TEST-123456'").get() as { id: number };

    createUser("party-user", "pass1234", "Party User", "party", party.id);

    const found = getPartyUserWithPassword(party.id);
    expect(found).toBeDefined();
    expect(found!.type).toBe("party");
  });

  it("updates username", async () => {
    const { createUser, updateUser, getUserById } = await import("@/lib/repository/users");
    const user = createUser("oldname", "pass1234", "Test User", "viewer");

    updateUser(user.id, { username: "newname" });
    const updated = getUserById(user.id);
    expect(updated!.username).toBe("newname");
  });

  it("updates password (hashed)", async () => {
    const { createUser, updateUser, getUserWithPassword } = await import("@/lib/repository/users");
    createUser("pwduser", "pass1234", "Test User", "viewer");
    const originalHash = getUserWithPassword("pwduser")!.password;

    updateUser(getUserWithPassword("pwduser")!.id, { password: "newpassword" });
    const updated = getUserWithPassword("pwduser")!;
    expect(updated.password).not.toBe("newpassword");
    expect(updated.password).not.toBe(originalHash);
  });

  it("updates user type", async () => {
    const { createUser, updateUser, getUserById } = await import("@/lib/repository/users");
    const user = createUser("typeuser", "pass1234", "Test User", "viewer");

    updateUser(user.id, { type: "admin" });
    const updated = getUserById(user.id);
    expect(updated!.type).toBe("admin");
  });

  it("updates party_id", async () => {
    const { createUser, updateUser, getUserById } = await import("@/lib/repository/users");
    db.prepare("INSERT INTO parties (name, code) VALUES ('Test', 'TSTD-123456')").run();
    const party = db.prepare("SELECT * FROM parties WHERE code = 'TSTD-123456'").get() as { id: number };

    const user = createUser("partyuser", "pass1234", "Test User", "viewer");
    updateUser(user.id, { party_id: party.id });
    const updated = getUserById(user.id);
    expect(updated!.party_id).toBe(party.id);
  });

  it("deletes a user", async () => {
    const { createUser, deleteUser, getUserById } = await import("@/lib/repository/users");
    const user = createUser("deluser", "pass1234", "Delete Me", "viewer");

    deleteUser(user.id);
    expect(getUserById(user.id)).toBeUndefined();
  });

  it("createPartyUser creates party-type user with code as credentials", async () => {
    const { createPartyUser, getUserWithPassword } = await import("@/lib/repository/users");
    db.prepare("INSERT INTO parties (name, code) VALUES ('Party', 'PRTY-123456')").run();
    const party = db.prepare("SELECT * FROM parties WHERE code = 'PRTY-123456'").get() as { id: number; code: string; name: string };

    createPartyUser(party.code, party.name, party.id);
    const found = getUserWithPassword(party.code);
    expect(found).toBeDefined();
    expect(found!.type).toBe("party");
    expect(found!.username).toBe(party.code);
    expect(found!.party_id).toBe(party.id);
  });

  it("deletePartyUser removes all party users for a party", async () => {
    const { createPartyUser, deleteUsersByPartyId, getPartyUserWithPassword } = await import("@/lib/repository/users");
    db.prepare("INSERT INTO parties (name, code) VALUES ('DelParty', 'DELP-123456')").run();
    const party = db.prepare("SELECT * FROM parties WHERE code = 'DELP-123456'").get() as { id: number; code: string; name: string };

    createPartyUser(party.code, party.name, party.id);
    expect(getPartyUserWithPassword(party.id)).toBeDefined();

    deleteUsersByPartyId(party.id);
    expect(getPartyUserWithPassword(party.id)).toBeUndefined();
  });

  it("recordLogin sets last_login_at", async () => {
    const { createUser, recordLogin, getUserById } = await import("@/lib/repository/users");
    const user = createUser("loginuser", "pass1234", "Login User", "party");

    expect(getUserById(user.id)!.last_login_at).toBeNull();

    recordLogin(user.id);
    const updated = getUserById(user.id)!;
    expect(updated.last_login_at).not.toBeNull();
    expect(new Date(updated.last_login_at!).getTime()).toBeGreaterThan(0);
  });

  it("incrementPageViews increments total_page_views", async () => {
    const { createUser, incrementPageViews, getUserById } = await import("@/lib/repository/users");
    const user = createUser("viewuser", "pass1234", "View User", "party");

    expect(getUserById(user.id)!.total_page_views).toBe(0);

    incrementPageViews(user.id, 0);
    expect(getUserById(user.id)!.total_page_views).toBe(1);

    incrementPageViews(user.id, 0);
    expect(getUserById(user.id)!.total_page_views).toBe(2);
  });

  it("incrementPageViews respects debounce window", async () => {
    const { createUser, incrementPageViews, getUserById } = await import("@/lib/repository/users");
    const user = createUser("debounce", "pass1234", "Debounce User", "party");

    incrementPageViews(user.id, 0);
    expect(getUserById(user.id)!.total_page_views).toBe(1);

    const blocked = incrementPageViews(user.id, 1440);
    expect(blocked).toBe(false);
    expect(getUserById(user.id)!.total_page_views).toBe(1);
  });

  it("incrementPageViews throws for non-existent user", async () => {
    const { incrementPageViews } = await import("@/lib/repository/users");
    expect(() => incrementPageViews(999999, 15)).toThrow("User 999999 not found");
  });

  it("incrementPageViews always counts when debounceMinutes is 0", async () => {
    const { createUser, incrementPageViews, getUserById } = await import("@/lib/repository/users");
    const user = createUser("nodebounce", "pass1234", "No Debounce", "party");

    incrementPageViews(user.id, 0);
    incrementPageViews(user.id, 0);
    incrementPageViews(user.id, 0);
    incrementPageViews(user.id, 0);
    incrementPageViews(user.id, 0);
    expect(getUserById(user.id)!.total_page_views).toBe(5);
  });

  it("incrementPageViews updates last_page_view_at", async () => {
    const { createUser, incrementPageViews, getUserById } = await import("@/lib/repository/users");
    const user = createUser("lastview", "pass1234", "Last View", "party");

    expect(getUserById(user.id)!.last_page_view_at).toBeNull();

    incrementPageViews(user.id, 15);
    const updated = getUserById(user.id)!;
    expect(updated.last_page_view_at).not.toBeNull();
    expect(new Date(updated.last_page_view_at!).getTime()).toBeGreaterThan(0);
  });

  it("incrementPageViews returns true when counted, false when debounced", async () => {
    const { createUser, incrementPageViews } = await import("@/lib/repository/users");
    const user = createUser("returnval", "pass1234", "Return Val", "party");

    expect(incrementPageViews(user.id, 15)).toBe(true);
    expect(incrementPageViews(user.id, 15)).toBe(false);
  });

  it("getPartyActivity returns party users ordered by last login", async () => {
    const { createUser, recordLogin, getPartyActivity } = await import("@/lib/repository/users");
    db.prepare("INSERT INTO parties (name, code) VALUES ('ActParty', 'ACTP-123456')").run();
    const party = db.prepare("SELECT * FROM parties WHERE code = 'ACTP-123456'").get() as { id: number; code: string; name: string };

    const user1 = createUser("act1", "pass1234", "First", "party", party.id);
    const user2 = createUser("act2", "pass1234", "Second", "party", party.id);

    recordLogin(user1.id);
    recordLogin(user2.id);

    const activity = getPartyActivity();
    expect(activity.length).toBe(2);
    expect(activity[0].total_page_views).toBe(0);
    expect(activity[0].last_login_at).not.toBeNull();
  });
});
