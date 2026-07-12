"use client";

import { useState, useActionState } from "react";
import { SearchableSelect } from "@/components/searchable-select";
import { addGuest, createPartyInline } from "./actions";
import type { Party } from "@/lib/db";
import type { GuestState } from "./actions";

interface GuestFormProps {
  parties: Party[];
}

const initialState: GuestState = {};

export function GuestForm({ parties }: GuestFormProps) {
  const [partyOptions, setPartyOptions] = useState(parties.map(p => ({ value: p.id, label: p.name })));
  const [selectedPartyId, setSelectedPartyId] = useState<number | null>(null);
  const [guestState, guestDispatch, guestPending] = useActionState(addGuest, initialState);
  const [partyError, setPartyError] = useState<string | null>(null);
  const [creatingParty, setCreatingParty] = useState(false);

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

  const handleSubmit = (formData: FormData) => {
    if (selectedPartyId) {
      formData.set("party_id", String(selectedPartyId));
    }
    guestDispatch(formData);
  };

  return (
    <form action={handleSubmit} className="admin-form">
      <div className="form-group">
        <label htmlFor="display_name">Display Name</label>
        <input id="display_name" name="display_name" type="text" required />
      </div>
      <div className="form-group">
        <label>Party *</label>
        <SearchableSelect
          options={partyOptions}
          value={selectedPartyId}
          onChange={setSelectedPartyId}
          onCreateNew={handleCreateNewParty}
          placeholder="Select a party..."
          required
          disabled={creatingParty}
        />
      </div>
      <div className="form-group">
        <label>Can bring plus one?</label>
        <select name="can_bring_plus_one" defaultValue="0">
          <option value="0">No</option>
          <option value="1">Yes</option>
        </select>
      </div>
      {guestState?.success && <p className="text-success text-sm mb-1" role="status">Guest added.</p>}
      {guestState?.error && <p className="text-error text-sm mb-1" role="alert">{guestState.error}</p>}
      {partyError && <p className="text-error text-sm mb-1" role="alert">{partyError}</p>}
      <button type="submit" className="btn btn-primary" disabled={guestPending || creatingParty}>
        {guestPending ? "Adding..." : "Add Guest"}
      </button>
    </form>
  );
}
