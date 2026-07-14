"use client";

import { useActionState } from "react";
import { banIpAction } from "./actions";

const initialState: { success?: boolean; error?: string } | null = null;

export function BanIpForm() {
  const [state, dispatch, isPending] = useActionState(banIpAction, initialState);

  return (
    <form action={dispatch} className="styled-form">
      <div className="form-row">
        <div className="form-group">
          <label htmlFor="ip_address">IP Address</label>
          <input
            id="ip_address"
            name="ip_address"
            type="text"
            placeholder="192.168.1.1"
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="reason">Reason (optional)</label>
          <input
            id="reason"
            name="reason"
            type="text"
            placeholder="manual"
          />
        </div>
      </div>
      {state?.success && <p className="text-success text-sm mb-1">IP banned.</p>}
      {state?.error && <p className="text-error text-sm mb-1">{state.error}</p>}
      <button type="submit" className="btn btn-primary" disabled={isPending}>
        {isPending ? "Banning..." : "Ban IP"}
      </button>
    </form>
  );
}
