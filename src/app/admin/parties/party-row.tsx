"use client";

import { useState, useEffect, useActionState } from "react";
import { updateParty, removeParty } from "./actions";
import type { Party, Guest } from "@/lib/db";

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
    } catch {
      /* clipboard API unavailable */
    }
  };

  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(t);
  }, [copied]);

  return (
    <button
      type="button"
      className="btn btn-sm btn-ghost copy-btn"
      onClick={(e) => { e.preventDefault(); handleCopy(); }}
      title="Copy party code"
    >
      {copied ? (
        <span className="text-success text-xs">Copied!</span>
      ) : (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
        </svg>
      )}
    </button>
  );
}

interface PartyRowProps {
  party: Party;
  guests: Guest[];
}

interface PartyState { success?: boolean; error?: string }

const initialState: PartyState | null = null;

export function PartyRow({ party, guests }: PartyRowProps) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(party.name);
  const [code, setCode] = useState(party.code);
  const [editState, editDispatch, editPending] = useActionState(updateParty, initialState);
  const [, deleteDispatch, deletePending] = useActionState(removeParty, initialState);

  useEffect(() => {
    if (editState?.success) setEditing(false);
  }, [editState?.success]);

  const handleSave = () => {
    const formData = new FormData();
    formData.append("party_id", String(party.id));
    formData.append("name", name);
    formData.append("code", code);
    editDispatch(formData);
  };

  const handleDelete = () => {
    const formData = new FormData();
    formData.append("party_id", String(party.id));
    deleteDispatch(formData);
  };

  if (editing) {
    return (
      <details className="admin-section" open>
        <summary className="editing-summary">
          <span className="party-row-editing">Editing: {party.name}</span>
        </summary>
        <div className="admin-section-body">
          <div className="admin-form">
            <div className="form-group">
              <label htmlFor={`party-name-${party.id}`}>Party Name</label>
              <input
                id={`party-name-${party.id}`}
                value={name}
                onChange={e => setName(e.target.value)}
                className="table-inline-input"
              />
            </div>
            <div className="form-group">
              <label htmlFor={`party-code-${party.id}`}>Party Code (Login)</label>
              <input
                id={`party-code-${party.id}`}
                value={code}
                onChange={e => setCode(e.target.value)}
                className="table-inline-input"
                style={{ fontFamily: "monospace" }}
              />
            </div>
            <div className="flex-row gap-1">
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
              {editState?.error && <span className="text-error text-sm" role="alert">{editState.error}</span>}
              {editState?.success && <span className="text-success text-sm" role="status">Saved</span>}
            </div>
          </div>
          {guests.length > 0 && (
            <div className="party-members">
              <p className="text-muted text-sm">{guests.length} guest{guests.length !== 1 ? "s" : ""} in this party</p>
            </div>
          )}
        </div>
      </details>
    );
  }

  return (
    <details className="admin-section" open>
      <summary>
        <span className="party-row-name">{party.name}</span>
        <span className="party-row-code-group">
          <span className="party-row-code">{party.code}</span>
          <CopyButton text={party.code} />
        </span>
        <span className="party-row-actions">
          <button
            type="button"
            className="btn btn-sm btn-ghost"
            onClick={(e) => { e.preventDefault(); setEditing(true); }}
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
        </span>
      </summary>
      <div className="admin-section-body">
        {guests.length === 0 ? (
          <p className="empty-state">No guests in this party.</p>
        ) : (
          <ul className="party-member-list">
            {guests.map(g => (
              <li key={g.id}>{g.display_name}</li>
            ))}
          </ul>
        )}
      </div>
    </details>
  );
}
