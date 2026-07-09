"use client";

import { useActionState } from "react";
import { deleteItem } from "./actions";
import type { ScheduleItem } from "@/lib/db";

const initialState = null;

function ScheduleListItem({ item }: { item: ScheduleItem }) {
  const [, dispatch, isPending] = useActionState(deleteItem, initialState);

  return (
    <div className="admin-list-item">
      <div className="item-info">
        <div className="item-title">{item.time}</div>
        <div className="item-meta">{item.label}</div>
      </div>
      <div className="item-actions">
        <form action={dispatch} onSubmit={(e) => { if (!confirm("Delete this schedule item?")) e.preventDefault(); }}>
          <input type="hidden" name="item_id" value={item.id} />
          <button type="submit" className="btn btn-sm btn-danger" disabled={isPending}>{isPending ? "Deleting..." : "Delete"}</button>
        </form>
      </div>
    </div>
  );
}

interface ScheduleListProps {
  items: ScheduleItem[];
}

export function ScheduleList({ items }: ScheduleListProps) {
  return (
    <div className="admin-list">
      {items.map((item) => (
        <ScheduleListItem item={item} key={item.id} />
      ))}
      {items.length === 0 && (
        <p style={{ color: "var(--color-muted)", fontStyle: "italic" }}>No schedule items yet.</p>
      )}
    </div>
  );
}
