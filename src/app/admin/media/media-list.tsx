"use client";

import Image from "next/image";
import { useState, useEffect, useActionState } from "react";
import { deleteItem, updateItem, moveItem, renameTab, deleteTab, moveTab } from "./actions";
import type { MediaItem, MediaTab } from "@/lib/db";

interface MediaListProps {
  items: MediaItem[];
  tabs: MediaTab[];
}

function MediaListItem({ item, index, total }: { item: MediaItem; index: number; total: number }) {
  const [delState, delDispatch, delPending] = useActionState(deleteItem, null);
  const [editState, editDispatch, editPending] = useActionState(updateItem, null);
  const [moveState, moveDispatch, movePending] = useActionState(moveItem, null);
  const [editing, setEditing] = useState(false);
  const [titleValue, setTitleValue] = useState(item.title ?? "");

  useEffect(() => {
    if (editState?.success) setEditing(false);
  }, [editState]);

  const hasChanges = titleValue !== (item.title ?? "");

  return (
    <div className="admin-list-item">
      <div className="item-info flex-row items-center gap-2">
        <Image
          src={item.thumbnail_url || item.url}
          alt={item.title || "Media item"}
          width={60}
          height={60}
          style={{ objectFit: "cover", borderRadius: "4px" }}
        />
        <div className="flex-1">
          {editing ? (
            <form action={editDispatch} className="flex-row items-center gap-1">
              <input type="hidden" name="item_id" value={item.id} />
              <input
                name="title"
                type="text"
                value={titleValue}
                onChange={e => setTitleValue(e.target.value)}
                placeholder="Title"
                className="table-inline-input flex-1"
              />
              <button type="submit" className="btn btn-sm btn-primary" disabled={editPending || !hasChanges}>{editPending ? "Saving..." : "Save"}</button>
              <button type="button" className="btn btn-sm btn-ghost" onClick={() => { setEditing(false); setTitleValue(item.title ?? ""); }}>Cancel</button>
              {editState?.error && <span className="table-error">{editState.error}</span>}
            </form>
          ) : (
            <>
              <div className="item-title">{item.title || "Untitled"}</div>
              <div className="item-meta">{item.type}</div>
            </>
          )}
        </div>
      </div>
      <div className="item-actions">
        {!editing && (
          <>
            <form action={moveDispatch} className="inline-flex">
              <input type="hidden" name="item_id" value={item.id} />
              <input type="hidden" name="direction" value="up" />
              <button type="submit" className="btn btn-sm btn-ghost" disabled={movePending || index === 0} aria-label="Move up">&#9650;</button>
            </form>
            <form action={moveDispatch} className="inline-flex">
              <input type="hidden" name="item_id" value={item.id} />
              <input type="hidden" name="direction" value="down" />
              <button type="submit" className="btn btn-sm btn-ghost" disabled={movePending || index === total - 1} aria-label="Move down">&#9660;</button>
            </form>
            <button type="button" className="btn btn-sm btn-ghost" onClick={() => setEditing(true)}>Edit</button>
          </>
        )}
        <form action={delDispatch} onSubmit={(e) => { if (!confirm("Delete this media item?")) e.preventDefault(); }}>
          <input type="hidden" name="item_id" value={item.id} />
          <button type="submit" className="btn btn-sm btn-danger" disabled={delPending}>{delPending ? "Deleting..." : "Delete"}</button>
        </form>
        {moveState?.error && <span className="table-error">{moveState.error}</span>}
        {delState?.error && <span className="table-error">{delState.error}</span>}
      </div>
    </div>
  );
}

function MediaTabGroup({ tab, slug, items, tabIndex, tabTotal }: { tab: MediaTab | null; slug: string; items: MediaItem[]; tabIndex: number; tabTotal: number }) {
  const [renameState, renameDispatch, renamePending] = useActionState(renameTab, null);
  const [delState, delDispatch, delPending] = useActionState(deleteTab, null);
  const [moveState, moveDispatch, movePending] = useActionState(moveTab, null);
  const [renaming, setRenaming] = useState(false);
  const [labelValue, setLabelValue] = useState(tab?.label ?? slug);

  useEffect(() => {
    if (renameState?.success) setRenaming(false);
  }, [renameState]);

  const displayName = tab?.label ?? slug;

  return (
    <details className="admin-section" open>
      <summary className="flex-row items-center gap-1">
        <span className="flex-1">
          {renaming ? (
            <form action={renameDispatch} onClick={e => e.stopPropagation()} className="inline-flex items-center gap-1">
              <input type="hidden" name="tab_id" value={tab?.id ?? ""} />
              <input
                name="tab_label"
                type="text"
                value={labelValue}
                onChange={e => setLabelValue(e.target.value)}
                className="table-inline-input"
                required
                autoFocus
                onClick={e => e.stopPropagation()}
              />
              <button type="submit" className="btn btn-sm btn-primary" disabled={renamePending} onClick={e => e.stopPropagation()}>
                {renamePending ? "Saving..." : "Save"}
              </button>
              <button type="button" className="btn btn-sm btn-ghost" onClick={e => { e.stopPropagation(); setRenaming(false); setLabelValue(displayName); }}>
                Cancel
              </button>
              {renameState?.error && <span className="table-error">{renameState.error}</span>}
            </form>
          ) : (
            <span>{displayName} <span className="text-muted text-sm">({items.length})</span></span>
          )}
        </span>
        {!renaming && tab && (
          <div className="media-tab-actions" onClick={e => e.stopPropagation()}>
            <form action={moveDispatch} className="inline-flex">
              <input type="hidden" name="tab_id" value={tab.id} />
              <input type="hidden" name="direction" value="up" />
              <button type="submit" className="btn btn-sm btn-ghost" disabled={movePending || tabIndex === 0} aria-label="Move up">&#9650;</button>
            </form>
            <form action={moveDispatch} className="inline-flex">
              <input type="hidden" name="tab_id" value={tab.id} />
              <input type="hidden" name="direction" value="down" />
              <button type="submit" className="btn btn-sm btn-ghost" disabled={movePending || tabIndex === tabTotal - 1} aria-label="Move down">&#9660;</button>
            </form>
            <button type="button" className="btn btn-sm btn-ghost" onClick={() => setRenaming(true)}>Edit</button>
            <form action={delDispatch} onSubmit={e => { e.stopPropagation(); if (!confirm("This will remove all media items in this tab from the website. Files on disk are not deleted. Continue?")) e.preventDefault(); }}>
              <input type="hidden" name="tab_id" value={tab.id} />
              <button type="submit" className="btn btn-sm btn-danger" disabled={delPending}>Delete</button>
            </form>
            {renameState?.error && <span className="table-error">{renameState.error}</span>}
            {moveState?.error && <span className="table-error">{moveState.error}</span>}
            {delState?.error && <span className="table-error">{delState.error}</span>}
          </div>
        )}
      </summary>
      <div className="admin-section-body">
        <div className="admin-list">
          {items.map((item, index) => <MediaListItem key={item.id} item={item} index={index} total={items.length} />)}
        </div>
      </div>
    </details>
  );
}

export function MediaList({ items, tabs }: MediaListProps) {
  const itemsBySection = new Map<string, MediaItem[]>();
  for (const item of items) {
    const existing = itemsBySection.get(item.section) ?? [];
    existing.push(item);
    itemsBySection.set(item.section, existing);
  }

  for (const sectionItems of itemsBySection.values()) {
    sectionItems.sort((a, b) => a.sort_order - b.sort_order || a.id - b.id);
  }

  const tabSections = tabs.map(tab => ({
    slug: tab.slug,
    tab,
    items: itemsBySection.get(tab.slug) ?? [],
  }));

  const tabSlugs = new Set(tabs.map(t => t.slug));
  const orphanedSections: { slug: string; tab: MediaTab | null; items: MediaItem[] }[] = [];
  for (const [slug, sectionItems] of itemsBySection) {
    if (!tabSlugs.has(slug)) {
      orphanedSections.push({ slug, tab: null, items: sectionItems });
    }
  }

  const allSections = [...tabSections, ...orphanedSections];

  if (allSections.length === 0) {
    return <p className="empty-state">No media items yet.</p>;
  }

  return (
    <div>
      {allSections.map(({ slug, tab, items: sectionItems }, tabIndex) => (
        <MediaTabGroup key={slug} tab={tab} slug={slug} items={sectionItems} tabIndex={tabIndex} tabTotal={allSections.length} />
      ))}
    </div>
  );
}
