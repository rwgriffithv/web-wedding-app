"use client";

import { useState, type FormEvent } from "react";
import { logout } from "@/app/login/actions";

function isRedirectError(err: unknown): boolean {
  return err instanceof Error && "digest" in err && typeof (err as { digest: string }).digest === "string" && (err as { digest: string }).digest.startsWith("NEXT_REDIRECT");
}

export function LogoutButton() {
  const [isPending, setIsPending] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsPending(true);
    try {
      await logout();
    } catch (err) {
      if (isRedirectError(err)) throw err;
    } finally {
      setIsPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <button type="submit" disabled={isPending}>{isPending ? "Logging out..." : "Logout"}</button>
    </form>
  );
}
