"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { createSession, destroySession, verifyPassword } from "@/lib/auth";
import { getUserByUsername, getUserByPartyId, recordLogin } from "@/lib/repository/users";
import { getPartyByCode } from "@/lib/repository/party";
import { getGuestsByPartyId } from "@/lib/repository/guests";
import { createRateLimiter } from "@/lib/rate-limit";
import { getConfig } from "@/lib/repository/site-config";
import { getString } from "@/lib/form-data";

interface LoginState { error?: string }

const rateLimiter = createRateLimiter("login", 5, 60_000);

function getRateLimitConfig() {
  const max = parseInt(getConfig("rate_limit_max_attempts") ?? process.env.RATE_LIMIT_MAX ?? "5", 10);
  const window = parseInt(getConfig("rate_limit_window_seconds") ?? process.env.RATE_LIMIT_WINDOW_SEC ?? "60", 10);
  return {
    maxAttempts: Number.isFinite(max) && max > 0 ? max : 5,
    windowMs: (Number.isFinite(window) && window > 0 ? window : 60) * 1000,
  };
}

async function getClientIp(): Promise<string> {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim()
    ?? h.get("x-real-ip")
    ?? "127.0.0.1";
}

export async function login(formData: FormData): Promise<LoginState> {
  const username = getString(formData, "username");
  const password = getString(formData, "password");
  if (!username || !password) {
    return { error: "Username and password are required." };
  }

  const ip = await getClientIp();
  const rlConfig = getRateLimitConfig();
  if (!rateLimiter.check(`${ip}:user:${username}`, rlConfig)) {
    return { error: "Too many attempts. Please wait before trying again." };
  }

  const user = getUserByUsername(username);

  if (!user || !verifyPassword(password, user.password)) {
    return { error: "Invalid username or password." };
  }

  recordLogin(user.id);

  const store = await cookies();
  const sessionData: { userId: number; partyId?: number; type: "admin" | "viewer" | "party" } = {
    userId: user.id,
    type: user.type,
  };
  if (user.type === "party" && user.party_id) {
    sessionData.partyId = user.party_id;
  }
  store.set("session", createSession(sessionData), { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 });

  redirect(user.type === "admin" ? "/admin" : "/home");
}

export async function loginByPartyCode(formData: FormData): Promise<LoginState> {
  const code = getString(formData, "code");
  if (!code) {
    return { error: "Please enter your party code." };
  }

  const trimmedCode = code.trim().toUpperCase();

  const ip = await getClientIp();
  const rlConfig = getRateLimitConfig();
  if (!rateLimiter.check(`${ip}:party:${trimmedCode}`, rlConfig)) {
    return { error: "Too many attempts. Please wait before trying again." };
  }

  const party = getPartyByCode(trimmedCode);
  if (!party) {
    return { error: "Invalid party code. Please check your invitation." };
  }

  const members = getGuestsByPartyId(party.id);
  if (members.length === 0) {
    return { error: "This party code has no members assigned yet." };
  }

  const partyUser = getUserByPartyId(party.id);
  if (!partyUser) {
    return { error: "Party login not configured. Please contact the administrator." };
  }

  recordLogin(partyUser.id);

  const store = await cookies();
  store.set("session", createSession({ userId: partyUser.id, partyId: party.id, type: "party" }), { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 });

  redirect("/home");
}

export async function logout(): Promise<void> {
  await destroySession();
  redirect("/");
}
