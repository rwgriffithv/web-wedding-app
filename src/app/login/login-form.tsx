"use client";

import { useState, type FormEvent } from "react";
import { login, loginByPartyCode } from "./actions";

function CredentialsForm() {
  const [state, setState] = useState<{ error?: string } | null>(null);
  const [isPending, setIsPending] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsPending(true);
    try {
      const formData = new FormData(e.currentTarget);
      const result = await login(null, formData);
      setState(result);
    } catch {
      setState({ error: "Something went wrong. Please try again." });
    } finally {
      setIsPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="form-group">
        <label htmlFor="username">Username</label>
        <input id="username" name="username" type="text" required placeholder="Your username" />
      </div>
      <div className="form-group">
        <label htmlFor="password">Password</label>
        <input id="password" name="password" type="password" required placeholder="Enter password" />
      </div>
      {state?.error && (
        <p className="text-error text-xs mb-1" role="alert">{state.error}</p>
      )}
      <button type="submit" className="btn btn-primary w-full justify-center" disabled={isPending}>
        {isPending ? "Signing in..." : "Sign In"}
      </button>
    </form>
  );
}

function PartyCodeForm() {
  const [state, setState] = useState<{ error?: string } | null>(null);
  const [isPending, setIsPending] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsPending(true);
    try {
      const formData = new FormData(e.currentTarget);
      const result = await loginByPartyCode(null, formData);
      setState(result);
    } catch {
      setState({ error: "Something went wrong. Please try again." });
    } finally {
      setIsPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="form-group">
        <label htmlFor="code">Party Code</label>
        <input id="code" name="code" type="text" required placeholder="e.g. SMITH-A1B2" style={{ textTransform: "uppercase" }} />
        <p className="text-xs text-muted mt-1">
          Found on your invitation
        </p>
      </div>
      {state?.error && (
        <p className="text-error text-xs mb-1" role="alert">{state.error}</p>
      )}
      <button type="submit" className="btn btn-primary w-full justify-center" disabled={isPending}>
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

      <div className="mt-1 text-center">
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
