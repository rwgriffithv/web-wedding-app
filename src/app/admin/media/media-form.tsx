"use client";

import { useActionState } from "react";
import { addItem } from "./actions";
import { FileUpload } from "@/components/file-upload";

const initialState = null as { success?: boolean; error?: string } | null;

export function MediaForm() {
  const [state, dispatch, isPending] = useActionState(addItem, initialState);

  return (
    <form action={dispatch} className="admin-form">
      <div className="form-group">
        <label htmlFor="type">Type</label>
        <select id="type" name="type" required>
          <option value="image">Image</option>
          <option value="video">Video</option>
        </select>
      </div>
      <div className="form-group">
        <label htmlFor="url">URL</label>
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
          <input id="url" name="url" type="text" required placeholder="https://example.com/photo.jpg" style={{ flex: 1 }} />
          <FileUpload onUpload={(url) => { const input = document.getElementById("url") as HTMLInputElement; input.value = url; }} accept="image/*,video/*" label="Browse" />
        </div>
      </div>
      <div className="form-group">
        <label htmlFor="thumbnail_url">Thumbnail URL (optional, for videos)</label>
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
          <input id="thumbnail_url" name="thumbnail_url" type="text" placeholder="https://example.com/thumb.jpg" style={{ flex: 1 }} />
          <FileUpload onUpload={(url) => { const input = document.getElementById("thumbnail_url") as HTMLInputElement; input.value = url; }} accept="image/*" label="Browse" />
        </div>
      </div>
      <div className="form-group">
        <label htmlFor="title">Title</label>
        <input id="title" name="title" type="text" placeholder="Photo description" />
      </div>
      <div className="form-group">
        <label htmlFor="section">Section</label>
        <input id="section" name="section" type="text" placeholder="e.g. Ceremony, Reception" defaultValue="General" />
      </div>
      {state?.success && <p style={{ color: "#065f46", fontSize: "0.875rem", marginBottom: "1rem" }}>Media added.</p>}
      {state?.error && <p style={{ color: "var(--color-error)", fontSize: "0.875rem", marginBottom: "1rem" }}>{state.error}</p>}
      <button type="submit" className="btn btn-primary" disabled={isPending}>{isPending ? "Adding..." : "Add Media"}</button>
    </form>
  );
}
