"use client";

import { useState, useEffect, type FormEvent } from "react";
import { submitQuestion } from "./actions";
import { CharCount } from "@/components/char-count";
import { MAX_QUESTION_LENGTH } from "@/lib/constants";
import type { Question } from "@/lib/db";

export function MyQuestions({ questions }: { questions: Question[] }) {
  const [state, setState] = useState<{ success?: boolean; error?: string } | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [questionText, setQuestionText] = useState("");

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsPending(true);
    try {
      const formData = new FormData(e.currentTarget);
      const result = await submitQuestion(null, formData);
      setState(result);
      if (result.success) setQuestionText("");
    } catch {
      setState({ success: false, error: "Something went wrong. Please try again." });
    } finally {
      setIsPending(false);
    }
  }

  return (
    <div>
      <form onSubmit={handleSubmit} className="styled-form mb-4">
        <div className="form-group">
          <label htmlFor="question_text">Ask a question</label>
          <textarea
            id="question_text"
            name="question"
            rows={3}
            required
            maxLength={MAX_QUESTION_LENGTH}
            placeholder="Type your question here..."
            value={questionText}
            onChange={(e) => setQuestionText(e.target.value)}
          />
          <CharCount current={questionText.length} max={MAX_QUESTION_LENGTH} />
        </div>
        {state?.success && (
          <p className="text-success text-sm mb-1" role="status">Question submitted!</p>
        )}
        {state?.error && <p className="text-error text-sm mb-1" role="alert">{state.error}</p>}
        <button type="submit" className="btn btn-primary" disabled={isPending}>
          {isPending ? "Submitting..." : "Submit Question"}
        </button>
      </form>

      {questions.length === 0 ? (
        <p className="empty-state">You haven&apos;t asked any questions yet.</p>
      ) : (
        <div className="admin-item-list">
          {questions.map(q => (
            <div className="admin-item" key={q.id}>
              <div className="admin-item-content">
                <div>
                  <span className="text-muted text-sm">
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
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
