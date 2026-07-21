"use client";

import { useState, type FormEvent } from "react";
import { logout } from "@/app/login/actions";
import { COOKIE_HEALTH_KEY, VIEW_DEBOUNCE_UNTIL_KEY } from "@/lib/constants";

function isRedirectError(err: unknown): boolean {
  return err instanceof Error && "digest" in err && typeof (err as { digest: string }).digest === "string" && (err as { digest: string }).digest.startsWith("NEXT_REDIRECT");
}

export function LogoutButton() {
  const [isPending, setIsPending] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsPending(true);
    try {
      try { localStorage.removeItem(COOKIE_HEALTH_KEY); } catch { /* localStorage unavailable */ }
      try { localStorage.removeItem(VIEW_DEBOUNCE_UNTIL_KEY); } catch { /* localStorage unavailable */ }
      await logout();
    } catch (err) {
      if (isRedirectError(err)) throw err;
    } finally {
      setIsPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <button type="submit" className="btn btn-sm btn-ghost" disabled={isPending}>{isPending ? "Logging out..." : "Logout"}</button>
    </form>
  );
}
