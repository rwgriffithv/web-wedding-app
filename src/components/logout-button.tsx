"use client";

import { useActionState } from "react";
import { logout } from "@/app/login/actions";

export function LogoutButton() {
  const [, dispatch, isPending] = useActionState(logout, null);

  return (
    <form action={dispatch}>
      <button type="submit" disabled={isPending}>{isPending ? "Logging out..." : "Logout"}</button>
    </form>
  );
}
