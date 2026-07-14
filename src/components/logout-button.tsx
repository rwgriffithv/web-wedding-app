"use client";

import { useState, type FormEvent } from "react";
import { logout } from "@/app/login/actions";
import { isRedirectError } from "@/lib/utils";

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
      <button type="submit" className="btn btn-sm btn-ghost" disabled={isPending}>{isPending ? "Logging out..." : "Logout"}</button>
    </form>
  );
}
