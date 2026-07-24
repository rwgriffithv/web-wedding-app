import crypto from "crypto";
import { getDb, type Party } from "@/lib/db";
import { createPartyUser, deleteUsersByPartyId, updateUser, getPartyUserWithPassword } from "./users";

function generatePartyCode(name: string): string {
  const prefix = name
    .split(/\s+/)
    .map(w => w[0])
    .filter(Boolean)
    .join("")
    .toUpperCase()
    .slice(0, 4)
    || "PARTY";
  const suffix = crypto.randomBytes(3).toString("hex").toUpperCase();
  return `${prefix}-${suffix}`;
}

export function getAll(): Party[] {
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

const MAX_CODE_ATTEMPTS = 10;

export function createParty(name: string, code?: string): Party {
  const db = getDb();
  const isCustom = !!code?.trim();
  const partyCode = code?.trim().toUpperCase() || generatePartyCode(name);

  // Custom codes fail immediately on collision — the user chose it, so retrying
  // with a different code would be surprising.
  if (isCustom) {
    try {
      return db.transaction(() => {
        const party = db.prepare("INSERT INTO parties (name, code, invited) VALUES (?, ?, 0) RETURNING *").get(name, partyCode) as Party;
        createPartyUser(party.code, party.name, party.id);
        return party;
      })();
    } catch {
      throw new Error("Party code already exists.");
    }
  }

  // Auto-generated codes: retry on collision. The random suffix is 6 hex chars
  // (~16M combinations), so collisions are astronomically unlikely. The loop
  // exists as defense-in-depth — if the generated code happens to collide with
  // an existing party, we just generate a new one and try again.
  for (let attempt = 0; attempt < MAX_CODE_ATTEMPTS; attempt++) {
    const currentCode = attempt === 0 ? partyCode : generatePartyCode(name);
    try {
      return db.transaction(() => {
        const party = db.prepare("INSERT INTO parties (name, code, invited) VALUES (?, ?, 0) RETURNING *").get(name, currentCode) as Party;
        createPartyUser(party.code, party.name, party.id);
        return party;
      })();
    } catch {
      // UNIQUE constraint failed — loop will retry with a fresh code
    }
  }
  throw new Error("Failed to generate a unique party code.");
}

export function updateParty(id: number, data: { name?: string; code?: string; invited?: number }): void {
  const db = getDb();
  db.transaction(() => {
    const existing = db.prepare("SELECT * FROM parties WHERE id = ?").get(id) as Party | undefined;
    if (!existing) throw new Error(`Party ${id} not found`);

    const newName = data.name?.trim() || existing.name;
    const newCode = data.code?.trim().toUpperCase() || existing.code;
    const newInvited = data.invited !== undefined ? data.invited : existing.invited;

    db.prepare("UPDATE parties SET name = ?, code = ?, invited = ? WHERE id = ?").run(newName, newCode, newInvited, id);

    const nameChanged = data.name !== undefined && data.name.trim() !== existing.name;
    const codeChanged = data.code !== undefined && data.code.trim().toUpperCase() !== existing.code;

    if (nameChanged || codeChanged) {
      const partyUser = getPartyUserWithPassword(id);
      if (partyUser) {
        updateUser(partyUser.id, { username: newCode, password: newCode, display_name: newName });
      }
    }
  })();
}

function deletePartyRows(db: ReturnType<typeof getDb>, id: number): void {
  deleteUsersByPartyId(id);
  db.prepare("DELETE FROM guests WHERE party_id = ?").run(id);
  db.prepare("DELETE FROM parties WHERE id = ?").run(id);
}

// Deletes a party and all associated data (users, guests).
// deletePartyRows explicitly deletes users and guests before removing the party.
export function deleteParty(id: number): void {
  const db = getDb();
  db.transaction(() => {
    deletePartyRows(db, id);
  })();
}

export function deleteEmptyParty(partyId: number): void {
  const db = getDb();
  db.transaction(() => {
    const row = db.prepare("SELECT COUNT(*) as count FROM guests WHERE party_id = ?").get(partyId) as { count: number };
    if (row.count === 0) {
      deletePartyRows(db, partyId);
    }
  })();
}
