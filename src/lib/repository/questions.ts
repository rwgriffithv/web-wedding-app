import { getDb, type Question } from "@/lib/db";

export interface QuestionWithParty extends Question {
  party_name: string;
}

export function getByPartyId(partyId: number): Question[] {
  const db = getDb();
  return db.prepare("SELECT * FROM questions WHERE party_id = ? ORDER BY created_at DESC").all(partyId) as Question[];
}

export function getAll(): QuestionWithParty[] {
  const db = getDb();
  return db.prepare(`
    SELECT q.*, p.name as party_name
    FROM questions q
    JOIN parties p ON q.party_id = p.id
    ORDER BY q.created_at DESC
  `).all() as QuestionWithParty[];
}

export function create(partyId: number, question: string): Question {
  const db = getDb();
  return db.prepare("INSERT INTO questions (party_id, question) VALUES (?, ?) RETURNING *").get(partyId, question) as Question;
}

export function answer(id: number, answer: string): void {
  const db = getDb();
  const result = db.prepare("UPDATE questions SET answer = ?, answered_at = datetime('now') WHERE id = ?").run(answer, id);
  if (result.changes === 0) throw new Error(`Question ${id} not found`);
}

export function getStats(): { total: number; unanswered: number } {
  const db = getDb();
  const row = db.prepare("SELECT COUNT(*) as total, SUM(CASE WHEN answer IS NULL THEN 1 ELSE 0 END) as unanswered FROM questions").get() as { total: number; unanswered: number };
  return { total: row.total, unanswered: row.unanswered ?? 0 };
}
