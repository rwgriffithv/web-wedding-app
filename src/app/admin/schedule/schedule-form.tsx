"use client";

import { useActionState } from "react";
import { addItem } from "./actions";

const initialState = null as { success?: boolean; error?: string } | null;

export function ScheduleForm() {
  const [state, dispatch, isPending] = useActionState(addItem, initialState);

  return (
    <form action={dispatch} className="admin-form">
      <div className="form-group">
        <label htmlFor="time">Time</label>
        <input id="time" name="time" type="text" required placeholder="e.g. 3:00 PM" />
      </div>
      <div className="form-group">
        <label htmlFor="label">Label</label>
        <input id="label" name="label" type="text" required placeholder="e.g. Ceremony" />
      </div>
      {state?.success && <p style={{ color: "var(--color-success)", fontSize: "0.875rem", marginBottom: "1rem" }}>Item added.</p>}
      {state?.error && <p style={{ color: "var(--color-error)", fontSize: "0.875rem", marginBottom: "1rem" }}>{state.error}</p>}
      <button type="submit" className="btn btn-primary" disabled={isPending}>{isPending ? "Adding..." : "Add Item"}</button>
    </form>
  );
}
