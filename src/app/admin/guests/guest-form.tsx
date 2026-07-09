"use client";

import { useActionState } from "react";
import { addGuest } from "./actions";

const initialState = null as { success?: boolean; error?: string } | null;

export function GuestForm() {
  const [state, dispatch, isPending] = useActionState(addGuest, initialState);

  return (
    <form action={dispatch} className="admin-form">
      <div className="form-group">
        <label htmlFor="display_name">Display Name</label>
        <input id="display_name" name="display_name" type="text" required />
      </div>
      <div className="form-group">
        <label htmlFor="username">Username</label>
        <input id="username" name="username" type="text" required />
      </div>
      <div className="form-group">
        <label htmlFor="password">Password</label>
        <input id="password" name="password" type="password" required />
      </div>
      <div className="form-group">
        <label htmlFor="type">Guest Type</label>
        <select id="type" name="type" required>
          <option value="guest">Guest</option>
          <option value="guest_plus_one">Guest +1</option>
        </select>
      </div>
      <div className="form-group">
        <label>Can RSVP?</label>
        <select name="can_rsvp" defaultValue="1" style={{ padding: "0.375rem 0.5rem", border: "1px solid var(--color-border)", borderRadius: "var(--radius)", fontSize: "0.875rem", width: "100%", boxSizing: "border-box" }}>
          <option value="1">Yes</option>
          <option value="0">No (view only)</option>
        </select>
      </div>
      <div className="form-group">
        <label>Can bring plus one?</label>
        <select name="can_bring_plus_one" defaultValue="0" style={{ padding: "0.375rem 0.5rem", border: "1px solid var(--color-border)", borderRadius: "var(--radius)", fontSize: "0.875rem", width: "100%", boxSizing: "border-box" }}>
          <option value="0">No</option>
          <option value="1">Yes</option>
        </select>
      </div>
      {state?.success && <p style={{ color: "#065f46", fontSize: "0.875rem", marginBottom: "1rem" }}>Guest added.</p>}
      {state?.error && <p style={{ color: "var(--color-error)", fontSize: "0.875rem", marginBottom: "1rem" }}>{state.error}</p>}
      <button type="submit" className="btn btn-primary" disabled={isPending}>{isPending ? "Adding..." : "Add Guest"}</button>
    </form>
  );
}
