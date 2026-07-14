"use client";

import { useActionState } from "react";
import { saveSessionSettings } from "./actions";

interface SessionSettingsFormProps {
  sessionMaxHours: string;
  pageViewDebounceMinutes: string;
}

const initialState: { success?: boolean; error?: string } | null = null;

export function SessionSettingsForm({ sessionMaxHours, pageViewDebounceMinutes }: SessionSettingsFormProps) {
  const [state, dispatch, isPending] = useActionState(saveSessionSettings, initialState);

  return (
    <form action={dispatch} className="styled-form">
      <div className="form-row">
        <div className="form-group">
          <label htmlFor="session_max_hours">Session Expiry (hours)</label>
          <input
            id="session_max_hours"
            name="session_max_hours"
            type="number"
            min="1"
            max="24"
            defaultValue={sessionMaxHours}
          />
        </div>
        <div className="form-group">
          <label htmlFor="page_view_debounce_minutes">Page View Debounce (minutes)</label>
          <input
            id="page_view_debounce_minutes"
            name="page_view_debounce_minutes"
            type="number"
            min="1"
            max="1440"
            defaultValue={pageViewDebounceMinutes}
          />
        </div>
      </div>
      <p className="text-muted text-xs" style={{ marginTop: "0.25rem" }}>
        Session expiry: how long login sessions last (max 24h). Page view debounce: minimum time between page view increments per user.
      </p>
      {state?.success && <p className="text-success text-sm mb-1">Saved!</p>}
      {state?.error && <p className="text-error text-sm mb-1">{state.error}</p>}
      <button type="submit" className="btn btn-primary" disabled={isPending}>
        {isPending ? "Saving..." : "Save"}
      </button>
    </form>
  );
}
