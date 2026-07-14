"use client";

import { useState, useEffect, useActionState } from "react";
import { submitRsvp, type RsvpState } from "./actions";
import type { RsvpResponse } from "@/lib/types";

interface RsvpFormProps {
  memberId: number;
  canBringPlusOne: boolean;
  existingResponse?: Pick<RsvpResponse, "guest_name" | "attending" | "plus_one_name">;
  isLocked?: boolean;
}

const initialState: RsvpState | null = null;

export function RsvpForm({ memberId, canBringPlusOne, existingResponse, isLocked }: RsvpFormProps) {
  const [state, dispatch, isPending] = useActionState(submitRsvp, initialState);
  const [attending, setAttending] = useState(existingResponse?.attending === 1 ? "yes" : existingResponse ? "no" : "");
  const [bringPlusOne, setBringPlusOne] = useState(
    existingResponse?.plus_one_name ? "yes" : "no"
  );
  const [plusOneName, setPlusOneName] = useState(existingResponse?.plus_one_name ?? "");
  const [hasSubmitted, setHasSubmitted] = useState(false);

  useEffect(() => {
    if (attending === "no") setBringPlusOne("no");
  }, [attending]);

  useEffect(() => {
    if (bringPlusOne === "no") setPlusOneName("");
  }, [bringPlusOne]);

  useEffect(() => {
    if (state?.success) setHasSubmitted(true);
  }, [state]);

  const hasResponse = !!existingResponse || hasSubmitted;

  return (
    <form action={dispatch} className="rsvp-form">
      <input type="hidden" name="member_id" value={memberId} />

      <div className="form-row">
        <div className="form-group">
          <label id={`attending-label-${memberId}`}>Attending?</label>
          <div className="radio-group" role="radiogroup" aria-labelledby={`attending-label-${memberId}`}>
            <label htmlFor={`attending_${memberId}_yes`}>
              <input
                type="radio"
                id={`attending_${memberId}_yes`}
                name={`attending_${memberId}`}
                value="yes"
                checked={attending === "yes"}
                onChange={() => setAttending("yes")}
                required
                disabled={isLocked}
              />
              Yes
            </label>
            <label htmlFor={`attending_${memberId}_no`}>
              <input
                type="radio"
                id={`attending_${memberId}_no`}
                name={`attending_${memberId}`}
                value="no"
                checked={attending === "no"}
                onChange={() => setAttending("no")}
                disabled={isLocked}
              />
              No
            </label>
          </div>
        </div>

        {canBringPlusOne && (
          <div className="form-group">
            <label id={`plusone-label-${memberId}`}>Plus-one?</label>
            <div className="radio-group" role="radiogroup" aria-labelledby={`plusone-label-${memberId}`}>
              <label htmlFor={`bring_plus_one_${memberId}_yes`}>
                <input
                  type="radio"
                  id={`bring_plus_one_${memberId}_yes`}
                  name={`bring_plus_one_${memberId}`}
                  value="yes"
                  checked={bringPlusOne === "yes"}
                  onChange={() => setBringPlusOne("yes")}
                  disabled={isLocked || attending === "no"}
                />
                Yes
              </label>
              <label htmlFor={`bring_plus_one_${memberId}_no`}>
                <input
                  type="radio"
                  id={`bring_plus_one_${memberId}_no`}
                  name={`bring_plus_one_${memberId}`}
                  value="no"
                  checked={bringPlusOne === "no"}
                  onChange={() => setBringPlusOne("no")}
                  disabled={isLocked || attending === "no"}
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
            value={plusOneName}
            onChange={(e) => setPlusOneName(e.target.value)}
            placeholder="Guest's name"
            style={{ maxWidth: "300px" }}
            disabled={isLocked || attending === "no"}
            required
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
        <button
          type="submit"
          className="btn btn-primary btn-sm mt-1"
          disabled={isPending || (bringPlusOne === "yes" && plusOneName.trim() === "")}
        >
          {isPending ? "Saving..." : hasResponse ? "Update" : "Submit"}
        </button>
      )}
    </form>
  );
}
