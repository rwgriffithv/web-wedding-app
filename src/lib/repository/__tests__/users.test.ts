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
    expect(user.password).not.toBe("password123");
    expect(user.id).toBeGreaterThan(0);

    const found = getUserById(user.id);
    expect(found).toBeDefined();
    expect(found!.username).toBe("alice");
  });

  it("looks up user by username", async () => {
    const { createUser, getUserByUsername } = await import("@/lib/repository/users");
    createUser("bob", "pass1234", "Bob Viewer", "viewer");

    const found = getUserByUsername("bob");
    expect(found).toBeDefined();
    expect(found!.type).toBe("viewer");
  });

  it("returns undefined for unknown username", async () => {
    const { getUserByUsername } = await import("@/lib/repository/users");
    expect(getUserByUsername("nonexistent")).toBeUndefined();
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
    const { createUser, getUserByPartyId } = await import("@/lib/repository/users");
    db.prepare("INSERT INTO parties (name, code) VALUES ('Test', 'TEST-123456')").run();
    const party = db.prepare("SELECT * FROM parties WHERE code = 'TEST-123456'").get() as { id: number };

    createUser("party-user", "pass1234", "Party User", "party", party.id);

    const found = getUserByPartyId(party.id);
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
    const { createUser, updateUser, getUserByUsername } = await import("@/lib/repository/users");
    createUser("pwduser", "pass1234", "Test User", "viewer");
    const originalHash = getUserByUsername("pwduser")!.password;

    updateUser(getUserByUsername("pwduser")!.id, { password: "newpassword" });
    const updated = getUserByUsername("pwduser")!;
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
    const { createPartyUser, getUserByUsername } = await import("@/lib/repository/users");
    db.prepare("INSERT INTO parties (name, code) VALUES ('Party', 'PRTY-123456')").run();
    const party = db.prepare("SELECT * FROM parties WHERE code = 'PRTY-123456'").get() as { id: number; code: string; name: string };

    createPartyUser(party.code, party.name, party.id);
    const found = getUserByUsername(party.code);
    expect(found).toBeDefined();
    expect(found!.type).toBe("party");
    expect(found!.username).toBe(party.code);
    expect(found!.party_id).toBe(party.id);
  });

  it("deletePartyUser removes all party users for a party", async () => {
    const { createPartyUser, deleteUsersByPartyId, getUserByPartyId } = await import("@/lib/repository/users");
    db.prepare("INSERT INTO parties (name, code) VALUES ('DelParty', 'DELP-123456')").run();
    const party = db.prepare("SELECT * FROM parties WHERE code = 'DELP-123456'").get() as { id: number; code: string; name: string };

    createPartyUser(party.code, party.name, party.id);
    expect(getUserByPartyId(party.id)).toBeDefined();

    deleteUsersByPartyId(party.id);
    expect(getUserByPartyId(party.id)).toBeUndefined();
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

    incrementPageViews(user.id);
    expect(getUserById(user.id)!.total_page_views).toBe(1);

    incrementPageViews(user.id);
    expect(getUserById(user.id)!.total_page_views).toBe(2);
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
