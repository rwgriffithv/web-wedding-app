"use client";

import { useActionState } from "react";
import { saveRsvpDeadline } from "./actions";

interface RsvpDeadlineFormProps {
  deadline: string;
}

const initialState: { success?: boolean; error?: string } | null = null;

export function RsvpDeadlineForm({ deadline }: RsvpDeadlineFormProps) {
  const [state, dispatch, isPending] = useActionState(
    saveRsvpDeadline,
    initialState,
  );

  return (
    <form action={dispatch}>
      <div className="form-group">
        <label htmlFor="rsvp_deadline">RSVP Deadline</label>
        <input
          id="rsvp_deadline"
          name="rsvp_deadline"
          type="datetime-local"
          defaultValue={deadline}
        />
      </div>
      <p className="text-muted text-xs" style={{ marginTop: "0.25rem" }}>
        Submissions locked after this date. Leave empty to keep RSVPs always
        open.
      </p>
      {state?.success && (
        <p className="text-success text-sm mb-1" role="status">
          Saved successfully.
        </p>
      )}
      {state?.error && (
        <p className="text-error text-sm mb-1" role="alert">
          {state.error}
        </p>
      )}
      <button
        type="submit"
        className="btn btn-primary btn-sm mt-1"
        disabled={isPending}
      >
        {isPending ? "Saving..." : "Save Deadline"}
      </button>
    </form>
  );
}
