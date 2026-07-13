"use client";

import { useState, useEffect, useActionState } from "react";
import { CopyButton } from "@/components/copy-button";
import { updateParty, removeParty, toggleInvited } from "./actions";
import type { Party, Guest } from "@/lib/db";

interface PartyRowProps {
  party: Party;
  guests: Guest[];
}

interface PartyState { success?: boolean; error?: string }

const initialState: PartyState | null = null;

export function PartyRow({ party, guests }: PartyRowProps) {
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [formKey, setFormKey] = useState(0);
  const [name, setName] = useState(party.name);
  const [code, setCode] = useState(party.code);
  const [invited, setInvited] = useState(party.invited);
  const [editState, editDispatch, editPending] = useActionState(updateParty, initialState);
  const [inviteState, inviteDispatch] = useActionState(toggleInvited, initialState);
  const [, deleteDispatch, deletePending] = useActionState(removeParty, initialState);

  useEffect(() => {
    if (editState?.success) setEditing(false);
  }, [editState?.success]);

  useEffect(() => {
    if (inviteState?.success) setInvited(prev => prev ? 0 : 1);
  }, [inviteState?.success]);

  const handleSave = () => {
    const formData = new FormData();
    formData.append("party_id", String(party.id));
    formData.append("name", name);
    formData.append("code", code);
    editDispatch(formData);
  };

  const handleInviteToggle = () => {
    const formData = new FormData();
    formData.append("party_id", String(party.id));
    formData.append("invited", invited ? "0" : "1");
    inviteDispatch(formData);
  };

  const handleDelete = () => {
    const formData = new FormData();
    formData.append("party_id", String(party.id));
    deleteDispatch(formData);
  };

  if (editing) {
    return (
      <>
        <tr key={formKey} className="party-row-editing">
          <td>
            <button
              type="button"
              className="party-expand-btn"
              disabled
              aria-label="Expand"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
            </button>
          </td>
          <td>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              className="table-inline-input"
            />
          </td>
          <td>
            <input
              value={code}
              onChange={e => setCode(e.target.value)}
              className="table-inline-input"
              style={{ fontFamily: "monospace" }}
            />
          </td>
          <td>
            <span className="text-muted text-sm">{invited ? "Yes" : "No"}</span>
          </td>
          <td className="table-actions">
            <button
              type="button"
              className="btn btn-sm btn-primary"
              onClick={handleSave}
              disabled={editPending}
            >
              {editPending ? "Saving..." : "Save"}
            </button>
            <button
              type="button"
              className="btn btn-sm btn-ghost"
              onClick={() => {
                setEditing(false);
                setName(party.name);
                setCode(party.code);
              }}
            >
              Cancel
            </button>
            {editState?.error && <span className="table-error" role="alert">{editState.error}</span>}
          </td>
        </tr>
        {expanded && guests.length > 0 && (
          <tr className="party-guest-row">
            <td colSpan={5}>
              <ul className="party-member-list">
                {guests.map(g => (
                  <li key={g.id}>{g.display_name}</li>
                ))}
              </ul>
            </td>
          </tr>
        )}
      </>
    );
  }

  return (
    <>
      <tr>
        <td>
          <button
            type="button"
            className="party-expand-btn"
            onClick={() => setExpanded(e => !e)}
            aria-expanded={expanded}
            aria-label={expanded ? "Collapse guests" : "Expand guests"}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
          </button>
        </td>
        <td>
          <span className="party-row-name">{party.name}</span>
        </td>
        <td>
          <span className="party-row-code-group">
            <span className="party-row-code">{party.code}</span>
            <CopyButton text={party.code} title="Copy party code" />
          </span>
        </td>
        <td>
          <button
            type="button"
            className="party-invite-toggle"
            onClick={handleInviteToggle}
            title={invited ? "Mark as not invited" : "Mark as invited"}
          >
            <input
              type="checkbox"
              checked={!!invited}
              readOnly
              tabIndex={-1}
            />
          </button>
        </td>
        <td className="table-actions">
          <button
            type="button"
            className="btn btn-sm btn-ghost"
            onClick={() => { setEditing(true); setFormKey(k => k + 1); }}
          >
            Edit
          </button>
          <form
            action={deleteDispatch}
            onSubmit={e => {
              e.preventDefault();
              if (confirm(`Delete "${party.name}"? All ${guests.length} guest${guests.length !== 1 ? "s" : ""} in this party will be removed.`)) {
                handleDelete();
              }
            }}
            style={{ display: "inline" }}
          >
            <input type="hidden" name="party_id" value={party.id} />
            <button type="submit" className="btn btn-sm btn-danger" disabled={deletePending}>
              {deletePending ? "..." : "Delete"}
            </button>
          </form>
        </td>
      </tr>
      {expanded && (
        <tr className="party-guest-row">
          <td colSpan={5}>
            {guests.length === 0 ? (
              <p className="empty-state">No guests in this party.</p>
            ) : (
              <ul className="party-member-list">
                {guests.map(g => (
                  <li key={g.id}>{g.display_name}</li>
                ))}
              </ul>
            )}
          </td>
        </tr>
      )}
    </>
  );
}
