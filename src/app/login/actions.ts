"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createSession, destroySession, verifyPassword } from "@/lib/auth";
import { getGuestByUsername, getGuestsByPartyId } from "@/lib/repository/guests";
import { getPartyByCode } from "@/lib/repository/party";
import { createRateLimiter } from "@/lib/rate-limit";

interface LoginState { error?: string }

const rateLimiter = createRateLimiter(
  "login",
  parseInt(process.env.RATE_LIMIT_MAX ?? "5", 10),
  parseInt(process.env.RATE_LIMIT_WINDOW_MS ?? "60000", 10),
);

export async function login(prevState: LoginState | null, formData: FormData): Promise<LoginState> {
  const username = formData.get("username") as string;
  const password = formData.get("password") as string;

  if (!rateLimiter.check(username)) {
    return { error: "Too many attempts for this account. Please wait before trying again." };
  }

  const guest = getGuestByUsername(username);

  if (!guest || !verifyPassword(password, guest.password)) {
    return { error: "Invalid username or password." };
  }

  const store = await cookies();
  store.set("session", createSession({ guestId: guest.id, type: guest.type === "admin" ? "admin" : "guest" }), { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 });

  redirect(guest.type === "admin" ? "/admin" : "/home");
}

export async function loginByPartyCode(prevState: LoginState | null, formData: FormData): Promise<LoginState> {
  const code = formData.get("code") as string;

  if (!code || !code.trim()) {
    return { error: "Please enter your party code." };
  }

  if (!rateLimiter.check(code.trim())) {
    return { error: "Too many attempts. Please wait before trying again." };
  }

  const party = getPartyByCode(code);
  if (!party) {
    return { error: "Invalid party code. Please check your invitation." };
  }

  const members = getGuestsByPartyId(party.id);
  if (members.length === 0) {
    return { error: "This party code has no members assigned yet." };
  }

  const store = await cookies();
  store.set("session", createSession({ partyId: party.id, type: "party" }), { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 });

  redirect("/rsvp");
}

export async function logout(_prevState: unknown, _formData: FormData): Promise<null> {
  await destroySession();
  redirect("/");
}
