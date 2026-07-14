"use client";

import { useActionState } from "react";
import { saveAutoBanSettings } from "./actions";

interface AutoBanFormProps {
  threshold: string;
  windowSeconds: string;
}

const initialState: { success?: boolean; error?: string } | null = null;

export function AutoBanForm({ threshold, windowSeconds }: AutoBanFormProps) {
  const [state, dispatch, isPending] = useActionState(saveAutoBanSettings, initialState);

  return (
    <form action={dispatch} className="styled-form">
      <div className="form-row">
        <div className="form-group">
          <label htmlFor="auto_ban_login_threshold">Auto-Ban Threshold (lockouts)</label>
          <input
            id="auto_ban_login_threshold"
            name="auto_ban_login_threshold"
            type="number"
            min="1"
            max="100"
            defaultValue={threshold}
          />
        </div>
        <div className="form-group">
          <label htmlFor="auto_ban_window_seconds">Window (seconds)</label>
          <input
            id="auto_ban_window_seconds"
            name="auto_ban_window_seconds"
            type="number"
            min="60"
            max="86400"
            defaultValue={windowSeconds}
          />
        </div>
      </div>
      <p className="text-muted text-xs" style={{ marginTop: "0.25rem" }}>
        After N rate-limit lockouts within the window, the IP is automatically banned. Changes take effect on the next login attempt.
      </p>
      {state?.success && <p className="text-success text-sm mb-1">Saved!</p>}
      {state?.error && <p className="text-error text-sm mb-1">{state.error}</p>}
      <button type="submit" className="btn btn-primary" disabled={isPending}>
        {isPending ? "Saving..." : "Save"}
      </button>
    </form>
  );
}
