"use client";

import { useActionState } from "react";
import { submitRsvp } from "./actions";

interface RsvpFormProps {
  memberId: number;
  displayName: string;
  canBringPlusOne: boolean;
  existingResponse?: { guest_name: string; attending: number; plus_one_name: string | null };
}

const initialState = null as { success?: boolean; error?: string } | null;

export function RsvpForm({ memberId, displayName, canBringPlusOne, existingResponse }: RsvpFormProps) {
  const [state, dispatch, isPending] = useActionState(submitRsvp, initialState);

  const hasResponse = !!existingResponse;

  return (
    <form action={dispatch} className="rsvp-form admin-form">
      <input type="hidden" name="member_id" value={memberId} />

      <div className="form-group">
        <label htmlFor={`name_${memberId}`}>Name</label>
        <input id={`name_${memberId}`} name={`name_${memberId}`} type="text" defaultValue={existingResponse?.guest_name ?? displayName} required style={{ maxWidth: "300px" }} />
      </div>

      <div className="form-group">
        <label>Attending?</label>
        <div className="radio-group">
          <label>
            <input type="radio" name={`attending_${memberId}`} value="yes" defaultChecked={existingResponse?.attending === 1} required />
            Yes
          </label>
          <label>
            <input type="radio" name={`attending_${memberId}`} value="no" defaultChecked={existingResponse?.attending === 0 && hasResponse} />
            Regretfully decline
          </label>
        </div>
      </div>

      {canBringPlusOne && (
        <div className="form-group">
          <label htmlFor={`plus_one_${memberId}`}>Plus One Name (optional)</label>
          <input id={`plus_one_${memberId}`} name={`plus_one_${memberId}`} type="text" defaultValue={existingResponse?.plus_one_name ?? ""} placeholder="Guest's name" style={{ maxWidth: "300px" }} />
          <p style={{ fontSize: "0.8rem", color: "var(--color-muted)", marginTop: "0.25rem" }}>
            Leave blank if attending alone.
          </p>
        </div>
      )}

      {state?.success && (
        <p style={{ color: "#065f46", fontSize: "0.875rem", marginBottom: "0.75rem" }}>
          {hasResponse ? "Response updated." : "Response submitted."}
        </p>
      )}
      {state?.error && (
        <p style={{ color: "var(--color-error)", fontSize: "0.8rem", marginBottom: "0.75rem" }}>{state.error}</p>
      )}
      <button type="submit" className="btn btn-primary btn-sm" disabled={isPending}>
        {isPending ? "Saving..." : hasResponse ? "Update" : "Submit"}
      </button>
    </form>
  );
}
