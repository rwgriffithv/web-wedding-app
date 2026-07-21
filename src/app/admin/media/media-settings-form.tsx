"use client";

import { useActionState, useCallback, useEffect } from "react";
import { saveMediaSettings } from "./actions";
import { MEDIA_MAX_FILE_SIZE_MB_KEY, MEDIA_MAX_FILE_SIZE_TTL_MS_KEY, MEDIA_MAX_FILE_SIZE_TTL_MS_DEFAULT } from "@/lib/constants";
import { setCachedValue } from "@/lib/localstorage-cache";

interface MediaSettingsFormProps {
  maxFileSizeMb: string;
  maxFileSizeTtlMs: string;
}

function parseTtl(raw: string): number {
  const n = parseInt(raw, 10);
  return Number.isFinite(n) && n >= 0 ? n : MEDIA_MAX_FILE_SIZE_TTL_MS_DEFAULT;
}

const initialState: { success?: boolean; error?: string } | null = null;

export function MediaSettingsForm({ maxFileSizeMb, maxFileSizeTtlMs }: MediaSettingsFormProps) {
  const [state, dispatch, isPending] = useActionState(saveMediaSettings, initialState);

  // Seed localStorage from the server-rendered prop (read from DB during SSR).
  // Overwrites unconditionally so the cache is always in sync with the DB on every page render.
  useEffect(() => {
    const mb = parseInt(maxFileSizeMb, 10);
    if (Number.isFinite(mb) && mb > 0) {
      setCachedValue(MEDIA_MAX_FILE_SIZE_MB_KEY, mb, parseTtl(maxFileSizeTtlMs));
    }
  }, [maxFileSizeMb, maxFileSizeTtlMs]);

  // Persist to localStorage after the server action succeeds.
  // Uses `state` not `state?.success` so the effect re-fires on every new
  // state object (useActionState returns a new reference each time).
  useEffect(() => {
    if (state?.success) {
      const mbInput = document.getElementById(MEDIA_MAX_FILE_SIZE_MB_KEY) as HTMLInputElement | null;
      const ttlInput = document.getElementById(MEDIA_MAX_FILE_SIZE_TTL_MS_KEY) as HTMLInputElement | null;
      if (mbInput && ttlInput) {
        const mb = parseInt(mbInput.value, 10);
        if (Number.isFinite(mb) && mb > 0) {
          setCachedValue(MEDIA_MAX_FILE_SIZE_MB_KEY, mb, parseTtl(ttlInput.value));
        }
      }
    }
  }, [state]);

  const handleSubmit = useCallback((formData: FormData) => {
    dispatch(formData);
  }, [dispatch]);

  return (
    <form action={handleSubmit} className="styled-form">
      <div className="form-row">
        <div className="form-group">
          <label htmlFor={MEDIA_MAX_FILE_SIZE_MB_KEY}>Max Upload Size (MB)</label>
          <input
            id={MEDIA_MAX_FILE_SIZE_MB_KEY}
            name={MEDIA_MAX_FILE_SIZE_MB_KEY}
            type="number"
            min="0"
            defaultValue={maxFileSizeMb}
          />
        </div>
      </div>
      <p className="text-muted text-xs" style={{ marginTop: "0.25rem" }}>
        Maximum file size for uploads. Applies to both server-side validation and client-side pre-validation.
      </p>
      <div className="form-group" style={{ marginTop: "0.75rem" }}>
        <label htmlFor={MEDIA_MAX_FILE_SIZE_TTL_MS_KEY}>Cache Duration (ms)</label>
        <input
          id={MEDIA_MAX_FILE_SIZE_TTL_MS_KEY}
          name={MEDIA_MAX_FILE_SIZE_TTL_MS_KEY}
          type="number"
          min="0"
          defaultValue={maxFileSizeTtlMs}
        />
        <p className="text-muted text-xs" style={{ marginTop: "0.25rem" }}>
          How long the client caches the file size before checking for updates. Shorter values reduce stale cache risk but increase server calls.
        </p>
      </div>
      {state?.success && <p className="text-success text-sm mb-1" role="status">Saved.</p>}
      {state?.error && <p className="text-error text-sm mb-1" role="alert">{state.error}</p>}
      <button type="submit" className="btn btn-primary btn-sm" disabled={isPending}>{isPending ? "Saving..." : "Save"}</button>
    </form>
  );
}
