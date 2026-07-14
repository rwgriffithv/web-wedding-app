"use client";

import { useRef, useState, useActionState } from "react";
import { addImage } from "./actions";
import { FileBrowser } from "@/components/file-browser";
import { MediaInput } from "@/components/media-input";

const initialState: { success?: boolean; error?: string } | null = null;

export function DressCodeImageForm() {
  const [state, dispatch, isPending] = useActionState(addImage, initialState);
  const imageUrlRef = useRef<HTMLInputElement>(null);
  const [showBrowser, setShowBrowser] = useState(false);

  return (
    <form action={dispatch} className="styled-form">
      {showBrowser && (
        <FileBrowser
          onSelect={(url) => { if (imageUrlRef.current) imageUrlRef.current.value = url; }}
          onClose={() => setShowBrowser(false)}
        />
      )}
      <div className="form-group">
        <label htmlFor="image_url">Image URL</label>
        <MediaInput
          inputRef={imageUrlRef}
          id="image_url"
          name="image_url"
          placeholder="https://example.com/inspiration.jpg or /api/media/file.jpg"
          accept="image/*"
          onUpload={(result) => {
            if (imageUrlRef.current) imageUrlRef.current.value = result.url;
          }}
          onBrowse={() => setShowBrowser(true)}
        />
      </div>
      {state?.success && <p className="text-success text-sm mb-1" role="status">Image added.</p>}
      {state?.error && <p className="text-error text-sm mb-1" role="alert">{state.error}</p>}
      <button type="submit" className="btn btn-primary" disabled={isPending}>{isPending ? "Adding..." : "Add Image"}</button>
    </form>
  );
}
