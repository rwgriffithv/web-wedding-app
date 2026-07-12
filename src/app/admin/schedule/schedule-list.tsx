"use client";

import { useState, useActionState } from "react";
import { deleteItem, updateItem, moveItem } from "./actions";
import type { ScheduleItem } from "@/lib/db";

const initialState = null;

function ScheduleListItem({ item, index, total }: { item: ScheduleItem; index: number; total: number }) {
  const [delState, delDispatch, delPending] = useActionState(deleteItem, initialState);
  const [editState, editDispatch, editPending] = useActionState(updateItem, initialState);
  const [moveState, moveDispatch, movePending] = useActionState(moveItem, initialState);
  const [editing, setEditing] = useState(false);
  const [timeValue, setTimeValue] = useState(item.time);
  const [labelValue, setLabelValue] = useState(item.label);

  const hasChanges = timeValue !== item.time || labelValue !== item.label;

  return (
    <div className="admin-list-item">
      <div className="item-info">
        {editing ? (
          <form action={editDispatch} className="inline-flex items-center gap-1">
            <input type="hidden" name="item_id" value={item.id} />
            <input name="time" value={timeValue} onChange={e => setTimeValue(e.target.value)} className="input-inline" placeholder="Time" required />
            <input name="label" value={labelValue} onChange={e => setLabelValue(e.target.value)} className="input-inline" placeholder="Label" required />
            <button type="submit" className="btn btn-sm btn-primary" disabled={editPending || !hasChanges}>{editPending ? "Saving..." : "Save"}</button>
            <button type="button" className="btn btn-sm btn-ghost" onClick={() => { setEditing(false); setTimeValue(item.time); setLabelValue(item.label); }}>Cancel</button>
          </form>
        ) : (
          <>
            <div className="item-title">{item.time}</div>
            <div className="item-meta">{item.label}</div>
          </>
        )}
      </div>
      <div className="item-actions">
        {!editing && (
          <>
            <form action={moveDispatch} className="inline-flex">
              <input type="hidden" name="item_id" value={item.id} />
              <input type="hidden" name="direction" value="up" />
              <button type="submit" className="btn btn-sm btn-ghost" disabled={movePending || index === 0} title="Move up">&#9650;</button>
            </form>
            <form action={moveDispatch} className="inline-flex">
              <input type="hidden" name="item_id" value={item.id} />
              <input type="hidden" name="direction" value="down" />
              <button type="submit" className="btn btn-sm btn-ghost" disabled={movePending || index === total - 1} title="Move down">&#9660;</button>
            </form>
            <button type="button" className="btn btn-sm btn-ghost" onClick={() => setEditing(true)}>Edit</button>
          </>
        )}
        <form action={delDispatch} onSubmit={(e) => { if (!confirm("Delete this schedule item?")) e.preventDefault(); }}>
          <input type="hidden" name="item_id" value={item.id} />
          <button type="submit" className="btn btn-sm btn-danger" disabled={delPending}>{delPending ? "Deleting..." : "Delete"}</button>
        </form>
        {moveState?.error && <span className="table-error">{moveState.error}</span>}
        {delState?.error && <span className="table-error">{delState.error}</span>}
        {editState?.error && <span className="table-error">{editState.error}</span>}
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
      {items.map((item, index) => (
        <ScheduleListItem item={item} key={item.id} index={index} total={items.length} />
      ))}
      {items.length === 0 && (
        <p className="empty-state">No schedule items yet.</p>
      )}
    </div>
  );
}
