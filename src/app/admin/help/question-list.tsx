"use client";

import { useState, useRef, type FormEvent } from "react";
import { answerQuestion } from "./actions";
import { CharCount } from "@/components/char-count";
import { MAX_ANSWER_LENGTH } from "@/lib/constants";
import type { QuestionWithParty } from "@/lib/repository/questions";

export function QuestionList({ questions, stats }: { questions: QuestionWithParty[]; stats: { total: number; unanswered: number } }) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "unanswered">("all");
  const [sort, setSort] = useState<"date" | "party">("date");
  const [answerState, setAnswerState] = useState<{ success?: boolean; error?: string } | null>(null);
  const [isPendingAnswer, setIsPendingAnswer] = useState(false);
  const [answerTexts, setAnswerTexts] = useState<Record<number, string>>({});
  const lastAnsweredIdRef = useRef<number | null>(null);

  async function handleAnswer(e: FormEvent<HTMLFormElement>, questionId: number) {
    e.preventDefault();
    lastAnsweredIdRef.current = questionId;
    setIsPendingAnswer(true);
    try {
      const formData = new FormData(e.currentTarget);
      const result = await answerQuestion(null, formData);
      setAnswerState(result);
      if (result.success) {
        setAnswerTexts(prev => {
          const next = { ...prev };
          delete next[questionId];
          return next;
        });
        setFilter("all");
      }
    } catch {
      setAnswerState({ success: false, error: "Something went wrong. Please try again." });
    } finally {
      setIsPendingAnswer(false);
    }
  }

  let filtered = questions.filter(q => {
    const matchesSearch = search === "" ||
      q.party_name.toLowerCase().includes(search.toLowerCase()) ||
      q.question.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filter === "all" || (filter === "unanswered" && !q.answer);
    return matchesSearch && matchesFilter;
  });

  if (sort === "party") {
    filtered = [...filtered].sort((a, b) => a.party_name.localeCompare(b.party_name));
  }

  return (
    <div>
      {stats.total > 0 && (
        <p className="text-muted text-sm mb-2">
          {stats.total} total, {stats.unanswered} unanswered
        </p>
      )}
      {questions.length > 0 && (
        <div className="form-row mb-2">
          <div className="form-group">
            <input
              type="text"
              placeholder="Search by party or question..."
              aria-label="Search by party or question"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="form-group">
            <div className="flex-row flex-wrap gap-1">
              <button
                type="button"
                className={`btn btn-sm${filter === "all" ? " btn-primary" : ""}`}
                onClick={() => setFilter("all")}
              >
                All
              </button>
              <button
                type="button"
                className={`btn btn-sm${filter === "unanswered" ? " btn-primary" : ""}`}
                onClick={() => setFilter("unanswered")}
              >
                Unanswered ({stats.unanswered})
              </button>
              <button
                type="button"
                className={`btn btn-sm${sort === "date" ? " btn-primary" : ""}`}
                onClick={() => setSort("date")}
              >
                By Date
              </button>
              <button
                type="button"
                className={`btn btn-sm${sort === "party" ? " btn-primary" : ""}`}
                onClick={() => setSort("party")}
              >
                By Party
              </button>
            </div>
          </div>
        </div>
      )}
      {filtered.length === 0 ? (
        <p className="text-muted">{questions.length === 0 ? "No questions yet." : "No matching questions."}</p>
      ) : (
        <div className="admin-item-list">
          {filtered.map(q => (
            <div className="admin-item" key={q.id}>
              <div className="admin-item-content">
                <div>
                  <span className="text-muted text-sm">{q.party_name}</span>
                  <span className="text-muted text-sm ml-1">
                    {new Date(q.created_at + "Z").toLocaleDateString()}
                  </span>
                </div>
                <div><strong>Q:</strong> {q.question}</div>
                {q.answer ? (
                  <div className="text-muted"><strong>A:</strong> {q.answer}</div>
                ) : (
                  <div className="text-muted italic">Awaiting response...</div>
                )}
              </div>
              {!q.answer && (
                <form onSubmit={(e) => handleAnswer(e, q.id)} className="styled-form w-full mt-1">
                  <input type="hidden" name="question_id" value={q.id} />
                  <div className="form-group">
                    <textarea
                      name="answer"
                      rows={2}
                      required
                      maxLength={MAX_ANSWER_LENGTH}
                      aria-label={`Answer for ${q.party_name}'s question`}
                      placeholder="Type your answer..."
                      value={answerTexts[q.id] || ""}
                      onChange={(e) => setAnswerTexts(prev => ({ ...prev, [q.id]: e.target.value }))}
                    />
                    <CharCount current={(answerTexts[q.id] || "").length} max={MAX_ANSWER_LENGTH} />
                  </div>
                  <button type="submit" className="btn btn-primary btn-sm" disabled={isPendingAnswer}>
                    {isPendingAnswer ? "Answering..." : "Submit Answer"}
                  </button>
                  {answerState?.error && lastAnsweredIdRef.current === q.id && (
                    <p className="text-error text-sm mt-1" role="alert">{answerState.error}</p>
                  )}
                </form>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
