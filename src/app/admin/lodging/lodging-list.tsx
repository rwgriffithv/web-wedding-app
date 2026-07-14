"use client";

import Image from "next/image";
import { useState, useEffect, useActionState } from "react";
import { deleteOption, updateOption, moveOption } from "./actions";
import type { LodgingOption } from "@/lib/db";

interface LodgingListProps {
  options: LodgingOption[];
}

const initialState = null;

function LodgingListItem({ option, index, total }: { option: LodgingOption; index: number; total: number }) {
  const [delState, delDispatch, delPending] = useActionState(deleteOption, initialState);
  const [editState, editDispatch, editPending] = useActionState(updateOption, initialState);
  const [moveState, moveDispatch, movePending] = useActionState(moveOption, initialState);
  const [editing, setEditing] = useState(false);
  const [titleValue, setTitleValue] = useState(option.title);
  const [urlValue, setUrlValue] = useState(option.url);

  useEffect(() => {
    if (editState?.success) setEditing(false);
  }, [editState]);

  const hasChanges = titleValue !== option.title || urlValue !== option.url;

  return (
    <div className="admin-list-item">
      <div className="item-info flex-row items-center gap-2">
        <Image
          src={option.thumbnail_url || option.image_url}
          alt={option.title}
          width={80}
          height={60}
          style={{ objectFit: "cover", borderRadius: "4px" }}
        />
        <div className="flex-1">
          {editing ? (
            <form action={editDispatch} className="flex-col gap-1">
              <input type="hidden" name="option_id" value={option.id} />
              <input type="hidden" name="image_url" defaultValue={option.image_url} />
              <div className="flex-row items-center gap-1">
                <input
                  name="title"
                  type="text"
                  value={titleValue}
                  onChange={e => setTitleValue(e.target.value)}
                  placeholder="Title"
                  className="table-inline-input flex-1"
                />
              </div>
              <div className="flex-row items-center gap-1">
                <input
                  name="url"
                  type="text"
                  value={urlValue}
                  onChange={e => setUrlValue(e.target.value)}
                  placeholder="Booking URL"
                  className="table-inline-input flex-1"
                />
              </div>
              <div className="flex-row items-center gap-1">
                <button type="submit" className="btn btn-sm btn-primary" disabled={editPending || !hasChanges}>{editPending ? "Saving..." : "Save"}</button>
                <button type="button" className="btn btn-sm btn-ghost" onClick={() => { setEditing(false); setTitleValue(option.title); setUrlValue(option.url); }}>Cancel</button>
                {editState?.error && <span className="table-error">{editState.error}</span>}
              </div>
            </form>
          ) : (
            <>
              <div className="item-title">{option.title}</div>
              <div className="item-meta">
                <a href={option.url} target="_blank" rel="noopener noreferrer">{option.url}</a>
              </div>
            </>
          )}
        </div>
      </div>
      <div className="item-actions">
        {!editing && (
          <>
            <form action={moveDispatch} className="inline-flex">
              <input type="hidden" name="option_id" value={option.id} />
              <input type="hidden" name="direction" value="up" />
              <button type="submit" className="btn btn-sm btn-ghost" disabled={movePending || index === 0} title="Move up">&#9650;</button>
            </form>
            <form action={moveDispatch} className="inline-flex">
              <input type="hidden" name="option_id" value={option.id} />
              <input type="hidden" name="direction" value="down" />
              <button type="submit" className="btn btn-sm btn-ghost" disabled={movePending || index === total - 1} title="Move down">&#9660;</button>
            </form>
            <button type="button" className="btn btn-sm btn-ghost" onClick={() => setEditing(true)}>Edit</button>
          </>
        )}
        <form action={delDispatch} onSubmit={(e) => { if (!confirm("Delete this lodging option?")) e.preventDefault(); }}>
          <input type="hidden" name="option_id" value={option.id} />
          <button type="submit" className="btn btn-sm btn-danger" disabled={delPending}>{delPending ? "Deleting..." : "Delete"}</button>
        </form>
        {moveState?.error && <span className="table-error">{moveState.error}</span>}
        {delState?.error && <span className="table-error">{delState.error}</span>}
      </div>
    </div>
  );
}

export function LodgingList({ options }: LodgingListProps) {
  return (
    <div className="admin-list">
      {options.map((option, index) => (
        <LodgingListItem option={option} index={index} total={options.length} key={option.id} />
      ))}
      {options.length === 0 && (
        <p className="empty-state">No lodging options yet.</p>
      )}
    </div>
  );
}
