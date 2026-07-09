"use client";

import { useActionState } from "react";
import { addOption } from "./actions";
import { FileUpload } from "@/components/file-upload";

const initialState = null as { success?: boolean; error?: string } | null;

export function LodgingForm() {
  const [state, dispatch, isPending] = useActionState(addOption, initialState);

  return (
    <form action={dispatch} className="admin-form">
      <div className="form-group">
        <label htmlFor="title">Title</label>
        <input id="title" name="title" type="text" required />
      </div>
      <div className="form-group">
        <label htmlFor="image_url">Image URL</label>
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
          <input id="image_url" name="image_url" type="text" required placeholder="https://example.com/image.jpg" style={{ flex: 1 }} />
          <FileUpload onUpload={(url) => { const input = document.getElementById("image_url") as HTMLInputElement; input.value = url; }} accept="image/*" label="Browse" />
        </div>
      </div>
      <div className="form-group">
        <label htmlFor="url">Booking URL</label>
        <input id="url" name="url" type="text" required placeholder="https://example.com/hotel" />
      </div>
      {state?.success && <p style={{ color: "#065f46", fontSize: "0.875rem", marginBottom: "1rem" }}>Option added.</p>}
      {state?.error && <p style={{ color: "var(--color-error)", fontSize: "0.875rem", marginBottom: "1rem" }}>{state.error}</p>}
      <button type="submit" className="btn btn-primary" disabled={isPending}>{isPending ? "Adding..." : "Add Option"}</button>
    </form>
  );
}
