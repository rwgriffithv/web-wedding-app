"use client";

import { useState, useActionState } from "react";
import { submitRsvp } from "./actions";

interface RsvpFormProps {
  memberId: number;
  displayName: string;
  canBringPlusOne: boolean;
  existingResponse?: { guest_name: string; attending: number; plus_one_name: string | null };
  isLocked?: boolean;
}

const initialState = null as { success?: boolean; error?: string } | null;

export function RsvpForm({ memberId, displayName, canBringPlusOne, existingResponse, isLocked }: RsvpFormProps) {
  const [state, dispatch, isPending] = useActionState(submitRsvp, initialState);
  const [attending, setAttending] = useState(existingResponse?.attending === 1 ? "yes" : existingResponse ? "no" : "");
  const [bringPlusOne, setBringPlusOne] = useState(
    existingResponse?.plus_one_name ? "yes" : "no"
  );

  const hasResponse = !!existingResponse;

  return (
    <form action={dispatch} className="rsvp-form">
      <input type="hidden" name="member_id" value={memberId} />

      <div className="form-row">
        <div className="form-group">
          <label id={`attending-label-${memberId}`}>Attending?</label>
          <div className="radio-group" role="radiogroup" aria-labelledby={`attending-label-${memberId}`}>
            <label>
              <input type="radio" name={`attending_${memberId}`} value="yes" checked={attending === "yes"} onChange={() => setAttending("yes")} required disabled={isLocked} />
              Yes
            </label>
            <label>
              <input type="radio" name={`attending_${memberId}`} value="no" checked={attending === "no"} onChange={() => setAttending("no")} disabled={isLocked} />
              No
            </label>
          </div>
        </div>

        {canBringPlusOne && (
          <div className="form-group">
            <label id={`plusone-label-${memberId}`}>Plus-one?</label>
            <div className="radio-group" role="radiogroup" aria-labelledby={`plusone-label-${memberId}`}>
              <label>
                <input
                  type="radio"
                  name={`bring_plus_one_${memberId}`}
                  value="yes"
                  checked={bringPlusOne === "yes"}
                  onChange={() => setBringPlusOne("yes")}
                  disabled={isLocked}
                />
                Yes
              </label>
              <label>
                <input
                  type="radio"
                  name={`bring_plus_one_${memberId}`}
                  value="no"
                  checked={bringPlusOne === "no"}
                  onChange={() => setBringPlusOne("no")}
                  disabled={isLocked}
                />
                No
              </label>
            </div>
          </div>
        )}
      </div>

      {canBringPlusOne && bringPlusOne === "yes" && (
        <div className="form-group mt-1">
          <label htmlFor={`plus_one_${memberId}`}>Plus-one name</label>
          <input
            id={`plus_one_${memberId}`}
            name={`plus_one_${memberId}`}
            type="text"
            defaultValue={existingResponse?.plus_one_name ?? ""}
            placeholder="Guest's name"
            style={{ maxWidth: "300px" }}
            disabled={isLocked}
          />
        </div>
      )}

      {state?.success && (
        <p className="text-success text-sm mt-1" role="status">
          {hasResponse ? "Response updated." : "Response submitted."}
        </p>
      )}
      {state?.error && (
        <p className="text-error text-sm mt-1" role="alert">{state.error}</p>
      )}
      {isLocked ? (
        <p className="text-muted text-sm mt-1" style={{ fontStyle: "italic" }}>RSVP is closed.</p>
      ) : (
        <button type="submit" className="btn btn-primary btn-sm mt-1" disabled={isPending}>
          {isPending ? "Saving..." : hasResponse ? "Update" : "Submit"}
        </button>
      )}
    </form>
  );
}
