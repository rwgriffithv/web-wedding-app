"use client";

import { useActionState } from "react";
import { saveSecuritySettings } from "./actions";
import {
  AUTO_BAN_LOGIN_THRESHOLD_KEY,
  AUTO_BAN_WINDOW_SECONDS_KEY,
  LOGIN_RATE_LIMIT_MAX_KEY,
  LOGIN_RATE_LIMIT_WINDOW_SECONDS_KEY,
  SUSPICIOUS_IP_THRESHOLD_KEY,
  SESSION_MAX_HOURS_KEY,
  PAGE_VIEW_DEBOUNCE_MINUTES_KEY,
} from "@/lib/constants";

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
            <label htmlFor={AUTO_BAN_LOGIN_THRESHOLD_KEY}>Auto-Ban Threshold (lockouts)</label>
            <input
              id={AUTO_BAN_LOGIN_THRESHOLD_KEY}
              name={AUTO_BAN_LOGIN_THRESHOLD_KEY}
              type="number"
              min="1"
              max="100"
              defaultValue={autoBanThreshold}
            />
          </div>
          <div className="form-group">
            <label htmlFor={AUTO_BAN_WINDOW_SECONDS_KEY}>Auto-Ban Window (seconds)</label>
            <input
              id={AUTO_BAN_WINDOW_SECONDS_KEY}
              name={AUTO_BAN_WINDOW_SECONDS_KEY}
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
            <label htmlFor={LOGIN_RATE_LIMIT_MAX_KEY}>Rate Limit Max Attempts</label>
            <input
              id={LOGIN_RATE_LIMIT_MAX_KEY}
              name={LOGIN_RATE_LIMIT_MAX_KEY}
              type="number"
              min="1"
              max="1000"
              defaultValue={rateLimitMaxAttempts}
            />
          </div>
          <div className="form-group">
            <label htmlFor={LOGIN_RATE_LIMIT_WINDOW_SECONDS_KEY}>Rate Limit Window (seconds)</label>
            <input
              id={LOGIN_RATE_LIMIT_WINDOW_SECONDS_KEY}
              name={LOGIN_RATE_LIMIT_WINDOW_SECONDS_KEY}
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
            <label htmlFor={SESSION_MAX_HOURS_KEY}>Session Expiry (hours)</label>
            <input
              id={SESSION_MAX_HOURS_KEY}
              name={SESSION_MAX_HOURS_KEY}
              type="number"
              min="1"
              max="24"
              defaultValue={sessionMaxHours}
            />
          </div>
          <div className="form-group">
            <label htmlFor={PAGE_VIEW_DEBOUNCE_MINUTES_KEY}>Page View Debounce (minutes)</label>
            <input
              id={PAGE_VIEW_DEBOUNCE_MINUTES_KEY}
              name={PAGE_VIEW_DEBOUNCE_MINUTES_KEY}
              type="number"
              min="0"
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
            <label htmlFor={SUSPICIOUS_IP_THRESHOLD_KEY}>Violation Threshold</label>
            <input
              id={SUSPICIOUS_IP_THRESHOLD_KEY}
              name={SUSPICIOUS_IP_THRESHOLD_KEY}
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
