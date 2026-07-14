"use client";

import { useState, useRef, useEffect, useActionState } from "react";
import { updateFaq, deleteFaq, moveFaq } from "./actions";
import { CharCount } from "@/components/char-count";
import { MAX_QUESTION_LENGTH, MAX_ANSWER_LENGTH } from "@/lib/constants";
import type { FaqItem } from "@/lib/db";

const initialEditState: { success?: boolean; error?: string } | null = null;

export function FaqList({ items }: { items: FaqItem[] }) {
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [editValues, setEditValues] = useState<Record<number, { question: string; answer: string }>>({});
  const [editState, dispatchEdit, isPendingEdit] = useActionState(updateFaq, initialEditState);
  const [deleteState, dispatchDelete, isPendingDelete] = useActionState(deleteFaq, initialEditState);
  const [moveState, dispatchMove] = useActionState(moveFaq, initialEditState);
  const editFormRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (editState?.success) setEditingId(null);
  }, [editState]);

  useEffect(() => {
    if (editingId !== null) {
      const item = items.find(i => i.id === editingId);
      if (item) {
        setEditValues(prev => ({ ...prev, [editingId]: { question: item.question, answer: item.answer } }));
      }
    }
  }, [editingId, items]);

  const filtered = items.filter(item =>
    item.question.toLowerCase().includes(search.toLowerCase()) ||
    item.answer.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      {items.length > 0 && (
        <div className="form-group">
          <input
            type="text"
            placeholder="Search FAQ..."
            aria-label="Search FAQ"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="mb-2"
          />
        </div>
      )}
      {filtered.length === 0 ? (
        <p className="text-muted">{items.length === 0 ? "No FAQ items yet." : "No matching FAQ items."}</p>
      ) : (
        <div className="admin-item-list">
          {filtered.map(item => (
            <div className="admin-item" key={item.id}>
              {editingId === item.id ? (
                <form ref={editFormRef} action={dispatchEdit} className="styled-form">
                  <input type="hidden" name="faq_id" value={item.id} />
                  <div className="form-group">
                    <label htmlFor={`edit_question_${item.id}`}>Question</label>
                    <textarea
                      id={`edit_question_${item.id}`}
                      name="question"
                      rows={2}
                      required
                      maxLength={MAX_QUESTION_LENGTH}
                      value={editValues[item.id]?.question ?? item.question}
                      onChange={(e) => setEditValues(prev => ({ ...prev, [item.id]: { ...prev[item.id], question: e.target.value } }))}
                    />
                    <CharCount current={(editValues[item.id]?.question ?? item.question).length} max={MAX_QUESTION_LENGTH} />
                  </div>
                  <div className="form-group">
                    <label htmlFor={`edit_answer_${item.id}`}>Answer</label>
                    <textarea
                      id={`edit_answer_${item.id}`}
                      name="answer"
                      rows={4}
                      required
                      maxLength={MAX_ANSWER_LENGTH}
                      value={editValues[item.id]?.answer ?? item.answer}
                      onChange={(e) => setEditValues(prev => ({ ...prev, [item.id]: { ...prev[item.id], answer: e.target.value } }))}
                    />
                    <CharCount current={(editValues[item.id]?.answer ?? item.answer).length} max={MAX_ANSWER_LENGTH} />
                  </div>
                  <div className="flex-row gap-1">
                    <button type="submit" className="btn btn-primary btn-sm" disabled={isPendingEdit}>
                      {isPendingEdit ? "Saving..." : "Save"}
                    </button>
                    <button type="button" className="btn btn-sm" onClick={() => setEditingId(null)}>
                      Cancel
                    </button>
                  </div>
                  {editState?.error && <p className="text-error text-sm mt-1" role="alert">{editState.error}</p>}
                </form>
              ) : (
                <>
                  <div className="admin-item-content">
                    <div>
                      <strong>Q:</strong> {item.question}
                    </div>
                    <div className="text-muted">
                      <strong>A:</strong> {item.answer}
                    </div>
                  </div>
                  <div className="admin-item-actions">
                    <form action={dispatchMove} className="display-inline">
                      <input type="hidden" name="faq_id" value={item.id} />
                      <input type="hidden" name="direction" value="up" />
                      <button type="submit" className="btn btn-sm" aria-label="Move up">&uarr;</button>
                    </form>
                    <form action={dispatchMove} className="display-inline">
                      <input type="hidden" name="faq_id" value={item.id} />
                      <input type="hidden" name="direction" value="down" />
                      <button type="submit" className="btn btn-sm" aria-label="Move down">&darr;</button>
                    </form>
                    <button type="button" className="btn btn-sm" onClick={() => setEditingId(item.id)}>
                      Edit
                    </button>
                    <button type="button" className="btn btn-danger btn-sm" onClick={() => setDeleteId(deleteId === item.id ? null : item.id)}>
                      Delete
                    </button>
                  </div>
                  {deleteId === item.id && (
                    <div className="admin-item-confirm">
                      <p className="text-sm">Delete this FAQ item?</p>
                      <form action={dispatchDelete} className="display-inline">
                        <input type="hidden" name="faq_id" value={item.id} />
                        <button type="submit" className="btn btn-danger btn-sm" disabled={isPendingDelete}>
                          {isPendingDelete ? "Deleting..." : "Confirm"}
                        </button>
                      </form>
                      <button type="button" className="btn btn-sm" onClick={() => setDeleteId(null)}>Cancel</button>
                    </div>
                  )}
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
