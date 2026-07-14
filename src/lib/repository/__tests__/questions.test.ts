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

describe("questions repository", () => {
  it("creates and retrieves a question by party id", async () => {
    const { create, getByPartyId } = await import("@/lib/repository/questions");
    db.prepare("INSERT INTO parties (id, name, code) VALUES (1, 'Party A', 'CODE-A')").run();

    const q = create(1, "Where is the venue?");
    expect(q.party_id).toBe(1);
    expect(q.question).toBe("Where is the venue?");
    expect(q.answer).toBeNull();
    expect(q.id).toBeGreaterThan(0);

    const partyQuestions = getByPartyId(1);
    expect(partyQuestions.length).toBe(1);
    expect(partyQuestions[0].question).toBe("Where is the venue?");
  });

  it("returns empty array for party with no questions", async () => {
    const { getByPartyId } = await import("@/lib/repository/questions");
    db.prepare("INSERT INTO parties (id, name, code) VALUES (1, 'Party A', 'CODE-A')").run();

    const partyQuestions = getByPartyId(1);
    expect(partyQuestions.length).toBe(0);
  });

  it("answers a question", async () => {
    const { create, answer, getByPartyId } = await import("@/lib/repository/questions");
    db.prepare("INSERT INTO parties (id, name, code) VALUES (1, 'Party A', 'CODE-A')").run();

    const q = create(1, "Where is the venue?");
    answer(q.id, "The venue is at 123 Main St.");

    const questions = getByPartyId(1);
    expect(questions[0].answer).toBe("The venue is at 123 Main St.");
    expect(questions[0].answered_at).not.toBeNull();
  });

  it("returns all questions with party names", async () => {
    const { create, getAll } = await import("@/lib/repository/questions");
    db.prepare("INSERT INTO parties (id, name, code) VALUES (1, 'Party A', 'CODE-A')").run();
    db.prepare("INSERT INTO parties (id, name, code) VALUES (2, 'Party B', 'CODE-B')").run();

    create(1, "Question from A");
    create(2, "Question from B");

    const all = getAll();
    expect(all.length).toBe(2);
    const names = all.map(q => q.party_name);
    expect(names).toContain("Party A");
    expect(names).toContain("Party B");
  });

  it("returns stats correctly", async () => {
    const { create, answer, getStats } = await import("@/lib/repository/questions");
    db.prepare("INSERT INTO parties (id, name, code) VALUES (1, 'Party A', 'CODE-A')").run();

    const q1 = create(1, "Question 1");
    create(1, "Question 2");
    create(1, "Question 3");
    answer(q1.id, "Answer 1");

    const stats = getStats();
    expect(stats.total).toBe(3);
    expect(stats.unanswered).toBe(2);
  });

  it("restricts to party isolation for getByPartyId", async () => {
    const { create, getByPartyId } = await import("@/lib/repository/questions");
    db.prepare("INSERT INTO parties (id, name, code) VALUES (1, 'Party A', 'CODE-A')").run();
    db.prepare("INSERT INTO parties (id, name, code) VALUES (2, 'Party B', 'CODE-B')").run();

    create(1, "Question from A");
    create(2, "Question from B");

    expect(getByPartyId(1).length).toBe(1);
    expect(getByPartyId(2).length).toBe(1);
  });
});
