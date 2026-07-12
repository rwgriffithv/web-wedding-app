"use client";

import { useState, useEffect, useActionState } from "react";
import { SearchableSelect } from "@/components/searchable-select";
import { updateGuest, removeGuest, createPartyInline } from "./actions";
import type { Guest, Party } from "@/lib/db";
import type { GuestState } from "./actions";

interface GuestRowProps {
  guest: Guest;
  parties: Party[];
}

const initialState = null as GuestState | null;

export function GuestRow({ guest, parties }: GuestRowProps) {
  const [editing, setEditing] = useState(false);
  const [formKey, setFormKey] = useState(0);
  const [displayName, setDisplayName] = useState(guest.display_name);
  const [canBringPlusOne, setCanBringPlusOne] = useState(guest.can_bring_plus_one);
  const [partyOptions, setPartyOptions] = useState(parties.map(p => ({ value: p.id, label: p.name })));
  const [selectedPartyId, setSelectedPartyId] = useState<number | null>(guest.party_id);
  const [guestState, guestDispatch, guestPending] = useActionState(updateGuest, initialState);
  const [partyError, setPartyError] = useState<string | null>(null);
  const [creatingParty, setCreatingParty] = useState(false);
  const [, deleteDispatch, deletePending] = useActionState(removeGuest, initialState);

  useEffect(() => {
    if (guestState?.success) {
      setEditing(false);
    }
  }, [guestState?.success]);

  const partyName = guest.party_id ? parties.find(p => p.id === guest.party_id)?.name : "\u2014";

  const handleCreateNewParty = async (name: string) => {
    setCreatingParty(true);
    setPartyError(null);
    try {
      const formData = new FormData();
      formData.append("party_name", name);
      const result = await createPartyInline(initialState, formData);

      if (result.success && result.partyId) {
        const { partyId } = result;
        setPartyOptions(prev => [...prev, { value: partyId, label: name }]);
        setSelectedPartyId(partyId);
      } else if (result.error) {
        setPartyError(result.error);
      }
    } finally {
      setCreatingParty(false);
    }
  };

  const handleSave = () => {
    const formData = new FormData();
    formData.append("guest_id", String(guest.id));
    formData.append("display_name", displayName);
    formData.append("party_id", selectedPartyId !== null ? String(selectedPartyId) : "");
    formData.append("can_bring_plus_one", String(canBringPlusOne));
    guestDispatch(formData);
  };

  if (editing) {
    return (
      <tr key={formKey}>
        <td>
          <input
            value={displayName}
            onChange={e => setDisplayName(e.target.value)}
            className="table-inline-input"
          />
        </td>
        <td>
          <SearchableSelect
            options={partyOptions}
            value={selectedPartyId}
            onChange={setSelectedPartyId}
            onCreateNew={handleCreateNewParty}
            placeholder="Select party..."
            required
            disabled={creatingParty}
          />
        </td>
        <td>
          <select
            value={canBringPlusOne}
            onChange={e => setCanBringPlusOne(Number(e.target.value))}
            className="table-inline-select"
          >
            <option value={0}>No</option>
            <option value={1}>Yes</option>
          </select>
        </td>
        <td className="table-actions">
          <button
            type="button"
            className="btn btn-sm btn-primary"
            onClick={handleSave}
            disabled={guestPending || creatingParty}
          >
            {guestPending ? "Saving..." : "Save"}
          </button>
          <button
            type="button"
            className="btn btn-sm btn-ghost"
            onClick={() => {
              setEditing(false);
              setDisplayName(guest.display_name);
              setCanBringPlusOne(guest.can_bring_plus_one);
              setSelectedPartyId(guest.party_id);
            }}
          >
            Cancel
          </button>
          {guestState?.error && <span className="table-error">{guestState.error}</span>}
          {partyError && <span className="table-error">{partyError}</span>}
        </td>
      </tr>
    );
  }

  return (
    <tr>
      <td>{guest.display_name}</td>
      <td>{partyName}</td>
      <td>{guest.can_bring_plus_one ? "Yes" : "No"}</td>
      <td className="table-actions">
        <button type="button" className="btn btn-sm btn-ghost" onClick={() => { setEditing(true); setFormKey(k => k + 1); }}>
          Edit
        </button>
        <form
          action={deleteDispatch}
          onSubmit={e => { if (!confirm("Delete this guest?")) e.preventDefault(); }}
          style={{ display: "inline" }}
        >
          <input type="hidden" name="guest_id" value={guest.id} />
          <button type="submit" className="btn btn-sm btn-danger" disabled={deletePending}>
            {deletePending ? "..." : "Delete"}
          </button>
        </form>
      </td>
    </tr>
  );
}
