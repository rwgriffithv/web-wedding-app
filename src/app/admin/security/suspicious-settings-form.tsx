"use client";

import { useActionState } from "react";
import { saveSuspiciousSettings } from "./actions";

interface SuspiciousSettingsFormProps {
  threshold: string;
}

const initialState: { success?: boolean; error?: string } | null = null;

export function SuspiciousSettingsForm({ threshold }: SuspiciousSettingsFormProps) {
  const [state, dispatch, isPending] = useActionState(saveSuspiciousSettings, initialState);

  return (
    <form action={dispatch} className="styled-form">
      <div className="form-row">
        <div className="form-group">
          <label htmlFor="suspicious_ip_threshold">Violation Threshold</label>
          <input
            id="suspicious_ip_threshold"
            name="suspicious_ip_threshold"
            type="number"
            min="1"
            max="100"
            defaultValue={threshold}
          />
        </div>
      </div>
      <p className="text-muted text-xs" style={{ marginTop: "0.25rem" }}>
        Minimum violations to appear in the list below.
      </p>
      {state?.success && <p className="text-success text-sm mb-1">Saved!</p>}
      {state?.error && <p className="text-error text-sm mb-1">{state.error}</p>}
      <button type="submit" className="btn btn-primary" disabled={isPending}>
        {isPending ? "Saving..." : "Save"}
      </button>
    </form>
  );
}
