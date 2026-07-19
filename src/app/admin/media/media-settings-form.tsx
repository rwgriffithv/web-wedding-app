"use client";

import { useActionState, useCallback, useEffect } from "react";
import { saveMediaSettings } from "./actions";

interface MediaSettingsFormProps {
  maxFileSizeMb: string;
}

const STORAGE_KEY = "media_max_file_size_mb";
const initialState: { success?: boolean; error?: string } | null = null;

export function MediaSettingsForm({ maxFileSizeMb }: MediaSettingsFormProps) {
  const [state, dispatch, isPending] = useActionState(saveMediaSettings, initialState);

  // Only persist to localStorage after the server action succeeds.
  // This prevents client/server desync on failure.
  useEffect(() => {
    if (state?.success) {
      const input = document.getElementById("media_max_file_size_mb") as HTMLInputElement | null;
      if (input) {
        const n = parseInt(input.value, 10);
        if (Number.isFinite(n) && n > 0) localStorage.setItem(STORAGE_KEY, String(n));
      }
    }
  }, [state?.success]);

  const handleSubmit = useCallback((formData: FormData) => {
    dispatch(formData);
  }, [dispatch]);

  return (
    <form action={handleSubmit} className="styled-form">
      <div className="form-row">
        <div className="form-group">
          <label htmlFor="media_max_file_size_mb">Max Upload Size (MB)</label>
          <input
            id="media_max_file_size_mb"
            name="media_max_file_size_mb"
            type="number"
            min="1"
            defaultValue={maxFileSizeMb}
          />
        </div>
      </div>
      <p className="text-muted text-xs" style={{ marginTop: "0.25rem" }}>
        Maximum file size for uploads. Applies to both server-side validation and client-side pre-validation.
      </p>
      {state?.success && <p className="text-success text-sm mb-1" role="status">Saved.</p>}
      {state?.error && <p className="text-error text-sm mb-1" role="alert">{state.error}</p>}
      <button type="submit" className="btn btn-primary btn-sm" disabled={isPending}>{isPending ? "Saving..." : "Save"}</button>
    </form>
  );
}
