"use client";

import { useActionState } from "react";
import { saveSecuritySettings } from "./actions";

interface SecuritySettingsFormProps {
  autoBanThreshold: string;
  autoBanWindowSeconds: string;
  rateLimitMaxAttempts: string;
  rateLimitWindowSeconds: string;
  sessionMaxHours: string;
  pageViewDebounceMinutes: string;
  suspiciousIpThreshold: string;
}

const initialState: { success?: boolean; error?: string } | null = null;

export function SecuritySettingsForm({
  autoBanThreshold,
  autoBanWindowSeconds,
  rateLimitMaxAttempts,
  rateLimitWindowSeconds,
  sessionMaxHours,
  pageViewDebounceMinutes,
  suspiciousIpThreshold,
}: SecuritySettingsFormProps) {
  const [state, dispatch, isPending] = useActionState(saveSecuritySettings, initialState);

  return (
    <form action={dispatch} className="styled-form">
      <fieldset className="admin-fieldset form-group">
        <legend>Login</legend>
        <div className="form-row">
          <div className="form-group">
            <label htmlFor="auto_ban_login_threshold">Auto-Ban Threshold (lockouts)</label>
            <input
              id="auto_ban_login_threshold"
              name="auto_ban_login_threshold"
              type="number"
              min="1"
              max="100"
              defaultValue={autoBanThreshold}
            />
          </div>
          <div className="form-group">
            <label htmlFor="auto_ban_window_seconds">Auto-Ban Window (seconds)</label>
            <input
              id="auto_ban_window_seconds"
              name="auto_ban_window_seconds"
              type="number"
              min="60"
              max="86400"
              defaultValue={autoBanWindowSeconds}
            />
          </div>
        </div>
        <p className="text-muted text-xs" style={{ marginTop: "0.25rem" }}>
          After N rate-limit lockouts within the window, the IP is automatically banned.
        </p>
        <div className="form-row">
          <div className="form-group">
            <label htmlFor="rate_limit_max_attempts">Rate Limit Max Attempts</label>
            <input
              id="rate_limit_max_attempts"
              name="rate_limit_max_attempts"
              type="number"
              min="1"
              max="1000"
              defaultValue={rateLimitMaxAttempts}
            />
          </div>
          <div className="form-group">
            <label htmlFor="rate_limit_window_seconds">Rate Limit Window (seconds)</label>
            <input
              id="rate_limit_window_seconds"
              name="rate_limit_window_seconds"
              type="number"
              min="1"
              max="1000"
              defaultValue={rateLimitWindowSeconds}
            />
          </div>
        </div>
        <p className="text-muted text-xs" style={{ marginTop: "0.25rem" }}>
          Rate limiting for login attempts per IP+user. Changes take effect on next request.
        </p>
      </fieldset>
      <fieldset className="admin-fieldset form-group">
        <legend>Session & Tracking</legend>
        <div className="form-row">
          <div className="form-group">
            <label htmlFor="session_max_hours">Session Expiry (hours)</label>
            <input
              id="session_max_hours"
              name="session_max_hours"
              type="number"
              min="1"
              max="24"
              defaultValue={sessionMaxHours}
            />
          </div>
          <div className="form-group">
            <label htmlFor="page_view_debounce_minutes">Page View Debounce (minutes)</label>
            <input
              id="page_view_debounce_minutes"
              name="page_view_debounce_minutes"
              type="number"
              min="1"
              max="1440"
              defaultValue={pageViewDebounceMinutes}
            />
          </div>
        </div>
        <p className="text-muted text-xs" style={{ marginTop: "0.25rem" }}>
          Session expiry: how long login sessions last (max 24h). Page view debounce: minimum time between page view increments per user.
        </p>
      </fieldset>
      <fieldset className="admin-fieldset form-group">
        <legend>Suspicious IPs</legend>
        <div className="form-row">
          <div className="form-group">
            <label htmlFor="suspicious_ip_threshold">Violation Threshold</label>
            <input
              id="suspicious_ip_threshold"
              name="suspicious_ip_threshold"
              type="number"
              min="1"
              max="100"
              defaultValue={suspiciousIpThreshold}
            />
          </div>
        </div>
        <p className="text-muted text-xs" style={{ marginTop: "0.25rem" }}>
          Minimum violations to appear in the IP table below.
        </p>
      </fieldset>
      {state?.success && <p className="text-success text-sm mb-1" role="status">Saved successfully.</p>}
      {state?.error && <p className="text-error text-sm mb-1" role="alert">{state.error}</p>}
      <button type="submit" className="btn btn-primary" disabled={isPending}>{isPending ? "Saving..." : "Save Changes"}</button>
    </form>
  );
}
