"use client";

import { useActionState } from "react";
import { saveRateLimitConfig } from "./actions";
import { RATE_LIMIT_MAX_ATTEMPTS_DEFAULT, RATE_LIMIT_WINDOW_SECONDS_DEFAULT } from "@/lib/constants";

interface RateLimitFormProps {
  config: Record<string, string>;
  maxKey: string;
  windowKey: string;
  description: string;
  maxDefault?: string;
  windowDefault?: string;
}

const initialState: { success?: boolean; error?: string } | null = null;

export function RateLimitForm({
  config,
  maxKey,
  windowKey,
  description,
  maxDefault = String(RATE_LIMIT_MAX_ATTEMPTS_DEFAULT),
  windowDefault = String(RATE_LIMIT_WINDOW_SECONDS_DEFAULT),
}: RateLimitFormProps) {
  const [state, dispatch, isPending] = useActionState(
    saveRateLimitConfig,
    initialState,
  );

  return (
    <form action={dispatch}>
      <input type="hidden" name="_key" value="rate-limit" />
      <div className="form-row">
        <div className="form-group">
          <label htmlFor={maxKey}>Max Attempts (per window)</label>
          <input
            id={maxKey}
            name={maxKey}
            type="number"
            min="1"
            max="1000"
            defaultValue={config[maxKey] || maxDefault}
          />
        </div>
        <div className="form-group">
          <label htmlFor={windowKey}>Window (seconds)</label>
          <input
            id={windowKey}
            name={windowKey}
            type="number"
            min="1"
            max="1000"
            defaultValue={config[windowKey] || windowDefault}
          />
        </div>
      </div>
      <p className="text-muted text-xs" style={{ marginTop: "0.25rem" }}>
        {description}
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
        {isPending ? "Saving..." : "Save Rate Limit"}
      </button>
    </form>
  );
}
