import { getDb, type Guest } from "@/lib/db";

export function getGuestById(id: number): Guest | undefined {
  const db = getDb();
  return db.prepare("SELECT * FROM guests WHERE id = ?").get(id) as Guest | undefined;
}

export function getAll(): Guest[] {
  const db = getDb();
  return db.prepare("SELECT * FROM guests ORDER BY display_name").all() as Guest[];
}

export function getGuestsByPartyId(partyId: number): Guest[] {
  const db = getDb();
  return db.prepare("SELECT * FROM guests WHERE party_id = ? ORDER BY display_name").all(partyId) as Guest[];
}

export function updateGuest(id: number, data: { display_name?: string; party_id?: number | null; can_bring_plus_one?: number; unexpected?: number }): void {
  const db = getDb();
  const fields: string[] = [];
  const values: (string | number | null)[] = [];

  if (data.display_name !== undefined) { fields.push("display_name = ?"); values.push(data.display_name); }
  if (data.party_id !== undefined) { fields.push("party_id = ?"); values.push(data.party_id); }
  if (data.can_bring_plus_one !== undefined) { fields.push("can_bring_plus_one = ?"); values.push(data.can_bring_plus_one); }
  if (data.unexpected !== undefined) { fields.push("unexpected = ?"); values.push(data.unexpected); }

  if (fields.length === 0) throw new Error("No fields to update");
  values.push(id);
  const result = db.prepare(`UPDATE guests SET ${fields.join(", ")} WHERE id = ?`).run(...values);
  if (result.changes === 0) throw new Error(`Guest ${id} not found`);
}

export function deleteGuest(id: number): void {
  const db = getDb();
  const result = db.prepare("DELETE FROM guests WHERE id = ?").run(id);
  if (result.changes === 0) throw new Error(`Guest ${id} not found`);
}

export function createGuest(displayName: string, partyId?: number | null, canBringPlusOne?: number, unexpected?: number): Guest {
  const db = getDb();
  return db.prepare(
    "INSERT INTO guests (display_name, party_id, can_bring_plus_one, unexpected) VALUES (?, ?, ?, ?) RETURNING *"
  ).get(displayName, partyId ?? null, canBringPlusOne ?? 0, unexpected ?? 0) as Guest;
}
