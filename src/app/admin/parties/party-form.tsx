"use client";

import { useActionState } from "react";
import { addParty } from "./actions";

const initialState = null as { success?: boolean; error?: string } | null;

export function PartyForm() {
  const [state, dispatch, isPending] = useActionState(addParty, initialState);

  return (
    <form action={dispatch} className="admin-form">
      <div className="form-group">
        <label htmlFor="name">Party Name</label>
        <input id="name" name="name" type="text" required placeholder="e.g. The Smith Family" />
      </div>
      {state?.success && <p style={{ color: "#065f46", fontSize: "0.875rem", marginBottom: "1rem" }}>Party created.</p>}
      {state?.error && <p style={{ color: "var(--color-error)", fontSize: "0.875rem", marginBottom: "1rem" }}>{state.error}</p>}
      <button type="submit" className="btn btn-primary" disabled={isPending}>{isPending ? "Creating..." : "Create Party"}</button>
    </form>
  );
}
