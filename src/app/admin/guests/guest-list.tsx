"use client";

import { useActionState } from "react";
import { updateGuest } from "./actions";
import type { Guest } from "@/lib/db";

interface GuestListProps {
  guest: Guest;
  partyName?: string;
}

const initialState = null as { success?: boolean; error?: string } | null;

export function GuestList({ guest, partyName }: GuestListProps) {
  const [state, dispatch, isPending] = useActionState(updateGuest, initialState);

  const isAdminUser = guest.type === "admin";

  return (
    <div className="admin-list-item">
      <div className="item-info">
        <div className="item-title">{guest.display_name}</div>
        <div className="item-meta">
          Username: {guest.username} &middot; Type: {guest.type}
          {partyName && <> &middot; Party: {partyName}</>}
          {!guest.can_rsvp && <> &middot; <span style={{ color: "var(--color-muted)" }}>View only</span></>}
          {guest.can_bring_plus_one ? <> &middot; +1</> : null}
          {isAdminUser && " (configured via .env)"}
        </div>
      </div>
      {!isAdminUser && (
        <form action={dispatch} style={{ display: "flex", gap: "0.5rem", alignItems: "end", flexWrap: "wrap" }}>
          <input type="hidden" name="guest_id" value={guest.id} />
          <div>
            <input name="username" defaultValue={guest.username} placeholder="Username" style={{ padding: "0.375rem 0.5rem", border: "1px solid var(--color-border)", borderRadius: "var(--radius)", fontSize: "0.8rem", width: "100px" }} />
          </div>
          <div>
            <input name="password" placeholder="New password" type="password" minLength={1} style={{ padding: "0.375rem 0.5rem", border: "1px solid var(--color-border)", borderRadius: "var(--radius)", fontSize: "0.8rem", width: "100px" }} />
          </div>
          <div>
            <select name="type" defaultValue={guest.type} style={{ padding: "0.375rem 0.5rem", border: "1px solid var(--color-border)", borderRadius: "var(--radius)", fontSize: "0.8rem" }}>
              <option value="guest">Guest</option>
              <option value="guest_plus_one">Guest +1</option>
            </select>
          </div>
          <div>
            <select name="can_rsvp" defaultValue={guest.can_rsvp} style={{ padding: "0.375rem 0.5rem", border: "1px solid var(--color-border)", borderRadius: "var(--radius)", fontSize: "0.8rem" }}>
              <option value="1">Can RSVP</option>
              <option value="0">View only</option>
            </select>
          </div>
          <div>
            <select name="can_bring_plus_one" defaultValue={guest.can_bring_plus_one} style={{ padding: "0.375rem 0.5rem", border: "1px solid var(--color-border)", borderRadius: "var(--radius)", fontSize: "0.8rem" }}>
              <option value="0">No +1</option>
              <option value="1">Has +1</option>
            </select>
          </div>
          <button type="submit" className="btn btn-sm btn-primary" disabled={isPending}>{isPending ? "Saving..." : "Save"}</button>
        </form>
      )}
      {state?.success && <span style={{ color: "#065f46", fontSize: "0.8rem" }}>Saved</span>}
    </div>
  );
}
