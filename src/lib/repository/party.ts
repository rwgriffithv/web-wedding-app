import crypto from "crypto";
import { getDb, type Party } from "@/lib/db";

function generatePartyCode(name: string): string {
  const prefix = name
    .split(/\s+/)
    .map(w => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 4);
  const suffix = crypto.randomBytes(3).toString("hex").toUpperCase();
  return `${prefix}-${suffix}`;
}

export function getAllParties(): Party[] {
  const db = getDb();
  return db.prepare("SELECT * FROM parties ORDER BY name").all() as Party[];
}

export function getPartyById(id: number): Party | undefined {
  const db = getDb();
  return db.prepare("SELECT * FROM parties WHERE id = ?").get(id) as Party | undefined;
}

export function getPartyByCode(code: string): Party | undefined {
  const db = getDb();
  return db.prepare("SELECT * FROM parties WHERE UPPER(code) = UPPER(?)").get(code.trim()) as Party | undefined;
}

export function createParty(name: string): Party {
  const db = getDb();
  const code = generatePartyCode(name);
  const result = db.prepare("INSERT INTO parties (name, code) VALUES (?, ?)").run(name, code);
  return db.prepare("SELECT * FROM parties WHERE id = ?").get(result.lastInsertRowid) as Party;
}

export function updateParty(id: number, data: { name?: string }): void {
  const db = getDb();
  if (data.name !== undefined) {
    db.prepare("UPDATE parties SET name = ? WHERE id = ?").run(data.name, id);
  }
}

export function regeneratePartyCode(id: number): string {
  const db = getDb();
  const party = db.prepare("SELECT * FROM parties WHERE id = ?").get(id) as Party | undefined;
  if (!party) throw new Error("Party not found");
  const code = generatePartyCode(party.name);
  db.prepare("UPDATE parties SET code = ? WHERE id = ?").run(code, id);
  return code;
}

export function deleteParty(id: number): void {
  const db = getDb();
  db.prepare("UPDATE guests SET party_id = NULL WHERE party_id = ?").run(id);
  db.prepare("DELETE FROM parties WHERE id = ?").run(id);
}

export function getPartyWithMembers(id: number): { party: Party; members: import("@/lib/db").Guest[] } | undefined {
  const db = getDb();
  const party = db.prepare("SELECT * FROM parties WHERE id = ?").get(id) as Party | undefined;
  if (!party) return undefined;
  const members = db.prepare("SELECT * FROM guests WHERE party_id = ? ORDER BY display_name").all(id) as import("@/lib/db").Guest[];
  return { party, members };
}
