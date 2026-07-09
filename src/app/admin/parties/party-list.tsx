"use client";

import { useActionState, useState } from "react";
import { editParty, removeParty, regenerateCode, assignToParty } from "./actions";
import type { Party, Guest } from "@/lib/db";

interface PartyListProps {
  party: Party;
  members: Guest[];
  allGuests: Guest[];
}

const initialState = null as { success?: boolean; error?: string } | null;

function PartyMemberRow({ guest }: { guest: Guest }) {
  const [state, dispatch, isPending] = useActionState(assignToParty, initialState);

  return (
    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.25rem 0" }}>
      <span style={{ flex: 1, fontSize: "0.875rem" }}>{guest.display_name}</span>
      <span style={{ fontSize: "0.8rem", color: "var(--color-muted)" }}>
        {guest.can_rsvp ? "Can RSVP" : "View only"} &middot; {guest.can_bring_plus_one ? "+1" : "No +1"}
      </span>
      <form action={dispatch}>
        <input type="hidden" name="guest_id" value={guest.id} />
        <input type="hidden" name="party_id" value="" />
        <button type="submit" className="btn btn-sm" disabled={isPending} style={{ color: "var(--color-error)" }}>
          Remove
        </button>
      </form>
      {state?.success && <span style={{ color: "#065f46", fontSize: "0.8rem" }}>Done</span>}
    </div>
  );
}

export function PartyList({ party, members, allGuests }: PartyListProps) {
  const [editState, editDispatch, editPending] = useActionState(editParty, initialState);
  const [deleteState, deleteDispatch, deletePending] = useActionState(removeParty, initialState);
  const [codeState, codeDispatch, codePending] = useActionState(regenerateCode, initialState);
  const [assignState, assignDispatch, assignPending] = useActionState(assignToParty, initialState);
  const [expanded, setExpanded] = useState(false);

  const unassignedGuests = allGuests.filter(g => g.type !== "admin" && !g.party_id);

  return (
    <div className="admin-list-item" style={{ flexDirection: "column", alignItems: "stretch" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
        <div className="item-info">
          <div className="item-title" style={{ cursor: "pointer" }} onClick={() => setExpanded(!expanded)}>
            {party.name} <span style={{ fontSize: "0.8rem", color: "var(--color-muted)" }}>({members.length} members)</span>
          </div>
          <div className="item-meta">
            Code: <strong>{party.code}</strong>
          </div>
        </div>
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "start" }}>
          <form action={codeDispatch}>
            <input type="hidden" name="party_id" value={party.id} />
            <button type="submit" className="btn btn-sm" disabled={codePending}>
              {codePending ? "..." : "New Code"}
            </button>
            {codeState?.success && <span style={{ color: "#065f46", fontSize: "0.8rem", marginLeft: "0.25rem" }}>Updated</span>}
          </form>
          <form action={deleteDispatch}>
            <input type="hidden" name="party_id" value={party.id} />
            <button type="submit" className="btn btn-sm" disabled={deletePending} style={{ color: "var(--color-error)" }}>
              {deletePending ? "..." : "Delete"}
            </button>
          </form>
        </div>
      </div>

      {expanded && (
        <div style={{ marginTop: "0.75rem", paddingTop: "0.75rem", borderTop: "1px solid var(--color-border)" }}>
          <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
            <form action={editDispatch} style={{ display: "flex", gap: "0.5rem", alignItems: "end", flex: 1 }}>
              <input type="hidden" name="party_id" value={party.id} />
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: "0.8rem", display: "block", marginBottom: "0.25rem" }}>Party Name</label>
                <input name="name" defaultValue={party.name} required style={{ padding: "0.375rem 0.5rem", border: "1px solid var(--color-border)", borderRadius: "var(--radius)", fontSize: "0.8rem", width: "100%", boxSizing: "border-box" }} />
              </div>
              <button type="submit" className="btn btn-sm btn-primary" disabled={editPending} style={{ marginTop: "1.2rem" }}>
                {editPending ? "..." : "Rename"}
              </button>
            </form>
          </div>

          <h4 style={{ fontSize: "0.875rem", fontWeight: 600, marginTop: "1rem", marginBottom: "0.5rem" }}>Members</h4>
          {members.length === 0 ? (
            <p style={{ fontSize: "0.8rem", color: "var(--color-muted)", fontStyle: "italic" }}>No members assigned.</p>
          ) : (
            members.map(m => <PartyMemberRow key={m.id} guest={m} />)
          )}

          {unassignedGuests.length > 0 && (
            <>
              <h4 style={{ fontSize: "0.875rem", fontWeight: 600, marginTop: "1rem", marginBottom: "0.5rem" }}>Add Member</h4>
              <form action={assignDispatch} style={{ display: "flex", gap: "0.5rem", alignItems: "end" }}>
                <input type="hidden" name="party_id" value={party.id} />
                <div style={{ flex: 1 }}>
                  <select name="guest_id" required style={{ padding: "0.375rem 0.5rem", border: "1px solid var(--color-border)", borderRadius: "var(--radius)", fontSize: "0.8rem", width: "100%" }}>
                    <option value="">Select a guest...</option>
                    {unassignedGuests.map(g => (
                      <option key={g.id} value={g.id}>{g.display_name} (@{g.username})</option>
                    ))}
                  </select>
                </div>
                <button type="submit" className="btn btn-sm btn-primary" disabled={assignPending}>
                  {assignPending ? "..." : "Add"}
                </button>
              </form>
              {assignState?.success && <span style={{ color: "#065f46", fontSize: "0.8rem" }}>Added</span>}
            </>
          )}
        </div>
      )}
    </div>
  );
}
