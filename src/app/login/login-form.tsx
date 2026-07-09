"use client";

import { useActionState, useState } from "react";
import { login, loginByPartyCode } from "./actions";

function CredentialsForm() {
  const [state, dispatch, isPending] = useActionState(login, null);

  return (
    <form action={dispatch}>
      <div className="form-group">
        <label htmlFor="username">Username</label>
        <input id="username" name="username" type="text" required placeholder="Your username" />
      </div>
      <div className="form-group">
        <label htmlFor="password">Password</label>
        <input id="password" name="password" type="password" required placeholder="Enter password" />
      </div>
      {state?.error && (
        <p style={{ color: "var(--color-error)", fontSize: "0.8rem", marginBottom: "0.75rem" }}>{state.error}</p>
      )}
      <button type="submit" className="btn btn-primary" style={{ width: "100%", justifyContent: "center" }} disabled={isPending}>
        {isPending ? "Signing in..." : "Sign In"}
      </button>
    </form>
  );
}

function PartyCodeForm() {
  const [state, dispatch, isPending] = useActionState(loginByPartyCode, null);

  return (
    <form action={dispatch}>
      <div className="form-group">
        <label htmlFor="code">Party Code</label>
        <input id="code" name="code" type="text" required placeholder="e.g. SMITH-A1B2" style={{ textTransform: "uppercase" }} />
        <p style={{ fontSize: "0.8rem", color: "var(--color-muted)", marginTop: "0.25rem" }}>
          Found on your invitation
        </p>
      </div>
      {state?.error && (
        <p style={{ color: "var(--color-error)", fontSize: "0.8rem", marginBottom: "0.75rem" }}>{state.error}</p>
      )}
      <button type="submit" className="btn btn-primary" style={{ width: "100%", justifyContent: "center" }} disabled={isPending}>
        {isPending ? "Looking up..." : "Continue with Party Code"}
      </button>
    </form>
  );
}

export function LoginForm() {
  const [mode, setMode] = useState<"credentials" | "party">("party");

  return (
    <div className="login-card">
      {mode === "party" ? <PartyCodeForm /> : <CredentialsForm />}

      <div style={{ marginTop: "1rem", textAlign: "center" }}>
        {mode === "party" ? (
          <button
            type="button"
            className="btn-link-subtle"
            onClick={() => setMode("credentials")}
          >
            User sign in
          </button>
        ) : (
          <button
            type="button"
            className="btn-link-subtle"
            onClick={() => setMode("party")}
          >
            Back to party sign in
          </button>
        )}
      </div>
    </div>
  );
}
