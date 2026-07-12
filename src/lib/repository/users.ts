import { getDb, type User, type SafeUser } from "@/lib/db";
import { hashPassword } from "@/lib/auth";

const SAFE_COLUMNS = "id, username, display_name, type, party_id, created_at, last_login_at, total_page_views";

function toSafeUser(row: User): SafeUser {
  const { password: _, ...safe } = row;
  return safe;
}

export function getUserByUsername(username: string): User | undefined {
  const db = getDb();
  return db.prepare("SELECT * FROM users WHERE username = ?").get(username) as User | undefined;
}

export function getUserById(id: number): SafeUser | undefined {
  const db = getDb();
  const row = db.prepare(`SELECT ${SAFE_COLUMNS} FROM users WHERE id = ?`).get(id) as User | undefined;
  return row ? toSafeUser(row) : undefined;
}

export function getAllUsers(): SafeUser[] {
  const db = getDb();
  const rows = db.prepare(`SELECT ${SAFE_COLUMNS} FROM users ORDER BY type, display_name`).all() as User[];
  return rows.map(toSafeUser);
}

export function getUserByPartyId(partyId: number): User | undefined {
  const db = getDb();
  return db.prepare("SELECT * FROM users WHERE party_id = ? AND type = 'party'").get(partyId) as User | undefined;
}

export function createUser(username: string, password: string, displayName: string, type: "admin" | "viewer" | "party", partyId?: number | null): SafeUser {
  const db = getDb();
  const row = db.prepare(
    `INSERT INTO users (username, password, display_name, type, party_id) VALUES (?, ?, ?, ?, ?) RETURNING ${SAFE_COLUMNS}`
  ).get(username, hashPassword(password), displayName, type, partyId ?? null) as User;
  return toSafeUser(row);
}

export function updateUser(id: number, data: { username?: string; password?: string; display_name?: string; type?: "admin" | "viewer" | "party"; party_id?: number | null }): void {
  const db = getDb();
  const fields: string[] = [];
  const values: (string | number | null)[] = [];

  if (data.username !== undefined) { fields.push("username = ?"); values.push(data.username); }
  if (data.password !== undefined) { fields.push("password = ?"); values.push(hashPassword(data.password)); }
  if (data.display_name !== undefined) { fields.push("display_name = ?"); values.push(data.display_name); }
  if (data.type !== undefined) { fields.push("type = ?"); values.push(data.type); }
  if (data.party_id !== undefined) { fields.push("party_id = ?"); values.push(data.party_id); }

  if (fields.length === 0) throw new Error("No fields to update");
  values.push(id);
  const result = db.prepare(`UPDATE users SET ${fields.join(", ")} WHERE id = ?`).run(...values);
  if (result.changes === 0) throw new Error(`User ${id} not found`);
}

export function deleteUser(id: number): void {
  const db = getDb();
  const result = db.prepare("DELETE FROM users WHERE id = ?").run(id);
  if (result.changes === 0) throw new Error(`User ${id} not found`);
}

export function createPartyUser(code: string, partyName: string, partyId: number): void {
  createUser(code, code, partyName, "party", partyId);
}

export function deleteUsersByPartyId(partyId: number): void {
  const db = getDb();
  db.prepare("DELETE FROM users WHERE party_id = ? AND type = 'party'").run(partyId);
}

export function recordLogin(userId: number): void {
  const db = getDb();
  const result = db.prepare("UPDATE users SET last_login_at = datetime('now') WHERE id = ?").run(userId);
  if (result.changes === 0) throw new Error(`User ${userId} not found`);
}

export function incrementPageViews(userId: number): void {
  const db = getDb();
  const result = db.prepare("UPDATE users SET total_page_views = total_page_views + 1 WHERE id = ?").run(userId);
  if (result.changes === 0) throw new Error(`User ${userId} not found`);
}

export function getPartyActivity(): SafeUser[] {
  const db = getDb();
  const rows = db.prepare(
    `SELECT ${SAFE_COLUMNS} FROM users WHERE type = 'party' ORDER BY last_login_at DESC NULLS LAST, total_page_views DESC`
  ).all() as User[];
  return rows.map(toSafeUser);
}
