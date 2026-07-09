import { getDb, type RsvpResponse } from "@/lib/db";

export function getAllResponses(): RsvpResponse[] {
  const db = getDb();
  return db.prepare("SELECT * FROM rsvp_responses ORDER BY created_at DESC").all() as RsvpResponse[];
}

export function getResponseByGuest(guestId: number): RsvpResponse | undefined {
  const db = getDb();
  return db.prepare("SELECT * FROM rsvp_responses WHERE guest_id = ?").get(guestId) as RsvpResponse | undefined;
}

export function submitResponse(guestId: number, guestName: string, attending: boolean, plusOneName?: string): RsvpResponse {
  const db = getDb();
  const existing = db.prepare("SELECT id FROM rsvp_responses WHERE guest_id = ?").get(guestId);
  if (existing) {
    db.prepare("UPDATE rsvp_responses SET guest_name = ?, attending = ?, plus_one_name = ? WHERE guest_id = ?").run(guestName, attending ? 1 : 0, plusOneName ?? null, guestId);
  } else {
    db.prepare("INSERT INTO rsvp_responses (guest_id, guest_name, attending, plus_one_name) VALUES (?, ?, ?, ?)").run(guestId, guestName, attending ? 1 : 0, plusOneName ?? null);
  }
  return db.prepare("SELECT * FROM rsvp_responses WHERE guest_id = ?").get(guestId) as RsvpResponse;
}

export function getResponseCount(): { total: number; attending: number } {
  const db = getDb();
  const total = db.prepare("SELECT COUNT(*) as count FROM rsvp_responses").get() as { count: number };
  const attending = db.prepare("SELECT COUNT(*) as count FROM rsvp_responses WHERE attending = 1").get() as { count: number };
  return { total: total.count, attending: attending.count };
}
