import { getDb, type Guest } from "@/lib/db";
import { hashPassword } from "@/lib/auth";

export function getGuestByUsername(username: string): Guest | undefined {
  const db = getDb();
  return db.prepare("SELECT * FROM guests WHERE username = ?").get(username) as Guest | undefined;
}

export function getGuestById(id: number): Guest | undefined {
  const db = getDb();
  return db.prepare("SELECT * FROM guests WHERE id = ?").get(id) as Guest | undefined;
}

export function getAllGuests(): Guest[] {
  const db = getDb();
  return db.prepare("SELECT * FROM guests ORDER BY type, display_name").all() as Guest[];
}

export function getGuestsByPartyId(partyId: number): Guest[] {
  const db = getDb();
  return db.prepare("SELECT * FROM guests WHERE party_id = ? ORDER BY display_name").all(partyId) as Guest[];
}

export function updateGuest(id: number, data: { username?: string; password?: string; display_name?: string; type?: string; party_id?: number | null; can_rsvp?: number; can_bring_plus_one?: number }): void {
  const db = getDb();
  const fields: string[] = [];
  const values: (string | number | null)[] = [];

  if (data.username !== undefined) { fields.push("username = ?"); values.push(data.username); }
  if (data.password !== undefined) { fields.push("password = ?"); values.push(hashPassword(data.password)); }
  if (data.display_name !== undefined) { fields.push("display_name = ?"); values.push(data.display_name); }
  if (data.type !== undefined) { fields.push("type = ?"); values.push(data.type); }
  if (data.party_id !== undefined) { fields.push("party_id = ?"); values.push(data.party_id); }
  if (data.can_rsvp !== undefined) { fields.push("can_rsvp = ?"); values.push(data.can_rsvp); }
  if (data.can_bring_plus_one !== undefined) { fields.push("can_bring_plus_one = ?"); values.push(data.can_bring_plus_one); }

  if (fields.length > 0) {
    values.push(id);
    db.prepare(`UPDATE guests SET ${fields.join(", ")} WHERE id = ?`).run(...values);
  }
}

export function createGuest(username: string, password: string, displayName: string, type: "guest" | "guest_plus_one", partyId?: number | null, canRsvp?: number, canBringPlusOne?: number): Guest {
  const db = getDb();
  const result = db.prepare(
    "INSERT INTO guests (username, password, display_name, type, party_id, can_rsvp, can_bring_plus_one) VALUES (?, ?, ?, ?, ?, ?, ?)"
  ).run(username, hashPassword(password), displayName, type, partyId ?? null, canRsvp ?? 1, canBringPlusOne ?? 0);
  return db.prepare("SELECT * FROM guests WHERE id = ?").get(result.lastInsertRowid) as Guest;
}
