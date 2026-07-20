"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { login, loginByPartyCode } from "./actions";
import { useRateLimitCooldown, type CooldownProps } from "@/hooks/rate-limit";
import { COOKIE_HEALTH_KEY, RATE_LIMIT_ERROR } from "@/lib/constants";

function storeCookieHealth(until: number) {
  try { localStorage.setItem(COOKIE_HEALTH_KEY, String(until)); } catch { /* localStorage unavailable */ }
}

function CredentialsForm({ cooldown, isLimited, checkRateLimit, syncFromResponse }: CooldownProps) {
  const [state, setState] = useState<{ error?: string } | null>(null);
  const [isPending, setIsPending] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (checkRateLimit()) {
      setState({ error: "Too many attempts. Please wait before trying again." });
      return;
    }
    setIsPending(true);
    try {
      const formData = new FormData(e.currentTarget);
      const result = await login(formData);
      if (result.success && result.cookieHealthUntil && result.redirectTo) {
        storeCookieHealth(result.cookieHealthUntil);
        router.push(result.redirectTo);
        return;
      }
      setState(result);
      if (result.action === "refresh") {
        router.refresh();
      } else if (result.action === "cooldown" && result.cooldownUntil) {
        syncFromResponse(result.cooldownUntil);
      }
    } catch {
      setState({ error: "Something went wrong. Please try again." });
    } finally {
      setIsPending(false);
    }
  }

  const isDisabled = isPending || isLimited;

  return (
    <form onSubmit={handleSubmit}>
      <div className="form-group">
        <label htmlFor="username">Username</label>
        <input id="username" name="username" type="text" required placeholder="Your username" disabled={isLimited} />
      </div>
      <div className="form-group">
        <label htmlFor="password">Password</label>
        <input id="password" name="password" type="password" required placeholder="Enter password" disabled={isLimited} />
      </div>
      {state?.error && (
        <p className="text-error text-xs mb-1" role="alert">{state.error}</p>
      )}
      {!state && isLimited && (
        <p className="text-error text-xs mb-1" role="alert">{RATE_LIMIT_ERROR}</p>
      )}
      <button type="submit" className="btn btn-primary w-full justify-center" disabled={isDisabled}>
        {cooldown > 0 ? `Please wait ${cooldown}s...` : isPending ? "Signing in..." : "Sign In"}
      </button>
    </form>
  );
}

function PartyCodeForm({ cooldown, isLimited, checkRateLimit, syncFromResponse }: CooldownProps) {
  const [state, setState] = useState<{ error?: string } | null>(null);
  const [isPending, setIsPending] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (checkRateLimit()) {
      setState({ error: "Too many attempts. Please wait before trying again." });
      return;
    }
    setIsPending(true);
    try {
      const formData = new FormData(e.currentTarget);
      const result = await loginByPartyCode(formData);
      if (result.success && result.cookieHealthUntil && result.redirectTo) {
        storeCookieHealth(result.cookieHealthUntil);
        router.push(result.redirectTo);
        return;
      }
      setState(result);
      if (result.action === "refresh") {
        router.refresh();
      } else if (result.action === "cooldown" && result.cooldownUntil) {
        syncFromResponse(result.cooldownUntil);
      }
    } catch {
      setState({ error: "Something went wrong. Please try again." });
    } finally {
      setIsPending(false);
    }
  }

  const isDisabled = isPending || isLimited;

  return (
    <form onSubmit={handleSubmit}>
      <div className="form-group">
        <div className="form-label-row">
          <label htmlFor="code">Party Code</label>
          <p className="text-xs text-muted">
            Found on your invitation
          </p>
        </div>
        <input id="code" name="code" type="text" required placeholder="Enter code" autoComplete="off" className="uppercase" disabled={isLimited} />
      </div>
      {state?.error && (
        <p className="text-error text-xs mb-1" role="alert">{state.error}</p>
      )}
      {!state && isLimited && (
        <p className="text-error text-xs mb-1" role="alert">{RATE_LIMIT_ERROR}</p>
      )}
      <button type="submit" className="btn btn-primary w-full justify-center" disabled={isDisabled}>
        {cooldown > 0 ? `Please wait ${cooldown}s...` : isPending ? "Looking up..." : "Continue with Party Code"}
      </button>
    </form>
  );
}

export function LoginForm() {
  const [mode, setMode] = useState<"credentials" | "party">("party");
  const cooldownProps = useRateLimitCooldown("rl_until");

  return (
    <div className="login-card">
      {mode === "party"
        ? <PartyCodeForm {...cooldownProps} />
        : <CredentialsForm {...cooldownProps} />}

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
