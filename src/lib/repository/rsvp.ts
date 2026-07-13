import { getDb, type RsvpResponse, type GuestRsvpStatus } from "@/lib/db";

export type { GuestRsvpStatus } from "@/lib/db";

export function getAllGuestsRsvpStatus(): GuestRsvpStatus[] {
  const db = getDb();
  return db.prepare(`
    SELECT
      g.id as guest_id,
      g.display_name,
      COALESCE(p.name, '—') as party_name,
      r.attending,
      r.plus_one_name,
      r.created_at as responded_at
    FROM guests g
    LEFT JOIN parties p ON g.party_id = p.id
    LEFT JOIN rsvp_responses r ON g.id = r.guest_id
    ORDER BY g.display_name
  `).all() as GuestRsvpStatus[];
}

export function getAllResponses(): RsvpResponse[] {
  const db = getDb();
  return db.prepare("SELECT * FROM rsvp_responses ORDER BY created_at DESC").all() as RsvpResponse[];
}

export function getRecentResponses(limit: number): RsvpResponse[] {
  const db = getDb();
  const safeLimit = Math.min(Math.max(1, limit), 100);
  return db.prepare("SELECT * FROM rsvp_responses ORDER BY created_at DESC LIMIT ?").all(safeLimit) as RsvpResponse[];
}

export function getResponseByGuest(guestId: number): RsvpResponse | undefined {
  const db = getDb();
  return db.prepare("SELECT * FROM rsvp_responses WHERE guest_id = ?").get(guestId) as RsvpResponse | undefined;
}

export function getResponsesByGuests(guestIds: number[]): RsvpResponse[] {
  if (guestIds.length === 0) return [];
  const db = getDb();
  const placeholders = guestIds.map(() => "?").join(",");
  return db.prepare(`SELECT * FROM rsvp_responses WHERE guest_id IN (${placeholders})`).all(...guestIds) as RsvpResponse[];
}

export function submitResponse(guestId: number, guestName: string, attending: boolean, plusOneName?: string): RsvpResponse {
  const db = getDb();
  const result = db.transaction(() => {
    const existing = db.prepare("SELECT id FROM rsvp_responses WHERE guest_id = ?").get(guestId);
    if (existing) {
      db.prepare("UPDATE rsvp_responses SET guest_name = ?, attending = ?, plus_one_name = ? WHERE guest_id = ?").run(guestName, attending ? 1 : 0, plusOneName ?? null, guestId);
    } else {
      db.prepare("INSERT INTO rsvp_responses (guest_id, guest_name, attending, plus_one_name) VALUES (?, ?, ?, ?)").run(guestId, guestName, attending ? 1 : 0, plusOneName ?? null);
    }
    return db.prepare("SELECT * FROM rsvp_responses WHERE guest_id = ?").get(guestId) as RsvpResponse;
  })();
  return result;
}

export function getResponseCount(): { total: number; attending: number } {
  const db = getDb();
  const total = db.prepare("SELECT COUNT(*) as count FROM rsvp_responses").get() as { count: number };
  const attending = db.prepare("SELECT COUNT(*) as count FROM rsvp_responses WHERE attending = 1").get() as { count: number };
  return { total: total.count, attending: attending.count };
}

export function getPlusOneCount(): { attending: number } {
  const db = getDb();
  const wherePlusOne = "plus_one_name IS NOT NULL AND plus_one_name != ''";
  const attending = db.prepare(`SELECT COUNT(*) as count FROM rsvp_responses WHERE attending = 1 AND ${wherePlusOne}`).get() as { count: number };
  return { attending: attending.count };
}
