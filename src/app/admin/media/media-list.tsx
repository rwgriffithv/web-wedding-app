"use client";

import Image from "next/image";
import { useActionState } from "react";
import { deleteItem } from "./actions";
import type { MediaItem } from "@/lib/db";

interface MediaListProps {
  items: MediaItem[];
}

const initialState = null;

export function MediaList({ items }: MediaListProps) {
  const [, dispatch, isPending] = useActionState(deleteItem, initialState);

  return (
    <div className="admin-list">
      {items.map((item) => (
        <div className="admin-list-item" key={item.id}>
          <div className="item-info" style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            <Image
              src={item.thumbnail_url || item.url}
              alt=""
              width={60}
              height={60}
              style={{ objectFit: "cover", borderRadius: "4px" }}
            />
            <div>
              <div className="item-title">{item.title || "Untitled"}</div>
              <div className="item-meta">
                {item.type} &middot; {item.section}
              </div>
            </div>
          </div>
          <div className="item-actions">
            <form action={dispatch} onSubmit={(e) => { if (!confirm("Delete this media item?")) e.preventDefault(); }}>
              <input type="hidden" name="item_id" value={item.id} />
              <button type="submit" className="btn btn-sm btn-danger" disabled={isPending}>{isPending ? "Deleting..." : "Delete"}</button>
            </form>
          </div>
        </div>
      ))}
      {items.length === 0 && (
        <p style={{ color: "var(--color-muted)", fontStyle: "italic" }}>No media items yet.</p>
      )}
    </div>
  );
}
