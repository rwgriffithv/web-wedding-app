"use client";

import { useActionState } from "react";
import { deleteOption } from "./actions";
import type { LodgingOption } from "@/lib/db";

interface LodgingListProps {
  options: LodgingOption[];
}

const initialState = null;

export function LodgingList({ options }: LodgingListProps) {
  const [, dispatch, isPending] = useActionState(deleteOption, initialState);

  return (
    <div className="admin-list">
      {options.map((option) => (
        <div className="admin-list-item" key={option.id}>
          <div className="item-info">
            <div className="item-title">{option.title}</div>
            <div className="item-meta">
              <a href={option.url} target="_blank" rel="noopener noreferrer">{option.url}</a>
            </div>
          </div>
          <div className="item-actions">
            <form action={dispatch} onSubmit={(e) => { if (!confirm("Delete this lodging option?")) e.preventDefault(); }}>
              <input type="hidden" name="option_id" value={option.id} />
              <button type="submit" className="btn btn-sm btn-danger" disabled={isPending}>{isPending ? "Deleting..." : "Delete"}</button>
            </form>
          </div>
        </div>
      ))}
      {options.length === 0 && (
        <p style={{ color: "var(--color-muted)", fontStyle: "italic" }}>No lodging options yet.</p>
      )}
    </div>
  );
}
