"use client";

import { useState, useEffect, useActionState } from "react";
import { addFaq } from "./actions";
import { CharCount } from "@/components/char-count";
import { MAX_QUESTION_LENGTH, MAX_ANSWER_LENGTH } from "@/lib/constants";

const initialState: { success?: boolean; error?: string } | null = null;

export function FaqForm() {
  const [state, dispatch, isPending] = useActionState(addFaq, initialState);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");

  useEffect(() => {
    if (state?.success) {
      setQuestion("");
      setAnswer("");
    }
  }, [state]);

  return (
    <form action={dispatch} className="styled-form">
      <div className="form-group">
        <label htmlFor="faq_question">Question</label>
        <textarea
          id="faq_question"
          name="question"
          rows={2}
          required
          maxLength={MAX_QUESTION_LENGTH}
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
        />
        <CharCount current={question.length} max={MAX_QUESTION_LENGTH} />
      </div>
      <div className="form-group">
        <label htmlFor="faq_answer">Answer</label>
        <textarea
          id="faq_answer"
          name="answer"
          rows={4}
          required
          maxLength={MAX_ANSWER_LENGTH}
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
        />
        <CharCount current={answer.length} max={MAX_ANSWER_LENGTH} />
      </div>
      {state?.success && <p className="text-success text-sm mb-1" role="status">FAQ item added.</p>}
      {state?.error && <p className="text-error text-sm mb-1" role="alert">{state.error}</p>}
      <button type="submit" className="btn btn-primary" disabled={isPending}>{isPending ? "Adding..." : "Add FAQ Item"}</button>
    </form>
  );
}
