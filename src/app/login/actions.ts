"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createSession, destroySession, verifyPassword, SESSION_COOKIE } from "@/lib/auth";
import { getUserWithPassword, getPartyUserWithPassword, recordLogin } from "@/lib/repository/users";
import { getPartyByCode } from "@/lib/repository/party";
import { getGuestsByPartyId } from "@/lib/repository/guests";
import { createRateLimiter, getRateLimitConfig } from "@/lib/rate-limit";
import { getConfig } from "@/lib/repository/site-config";
import { isIpBanned, recordRateLimitViolation, getViolationCount, banIp, deleteOldViolations, getAutoBanConfig } from "@/lib/repository/ip-bans";
import { getClientIp } from "@/lib/ip";
import { getString } from "@/lib/form-data";
import { RATE_LIMIT_MAX_ATTEMPTS_DEFAULT, RATE_LIMIT_WINDOW_SECONDS_DEFAULT } from "@/lib/constants";

interface LoginState { error?: string }

function getSessionMaxSeconds(): number {
  const hours = parseInt(getConfig("session_max_hours"), 10);
  return (Number.isFinite(hours) && hours > 0 ? Math.min(hours, 24) : 24) * 60 * 60;
}

const rateLimiter = createRateLimiter("login");

function getLoginRateLimitConfig() {
  return getRateLimitConfig("rate_limit_max_attempts", "rate_limit_window_seconds", RATE_LIMIT_MAX_ATTEMPTS_DEFAULT, RATE_LIMIT_WINDOW_SECONDS_DEFAULT);
}

let violationCleanupCounter = 0;

function tryAutoBan(ip: string): void {
  const { threshold, windowSeconds: autoBanWindow } = getAutoBanConfig();
  if (getViolationCount(ip, autoBanWindow) >= threshold && !isIpBanned(ip)) {
    try {
      banIp(ip, "auto:rate-limit-threshold");
    } catch {
      // Unique constraint: another concurrent request already banned this IP
    }
  }
  if (++violationCleanupCounter % 50 === 0) {
    deleteOldViolations(autoBanWindow);
  }
}

export async function login(formData: FormData): Promise<LoginState> {
  const username = getString(formData, "username");
  const password = getString(formData, "password");
  if (!username || !password) {
    return { error: "Username and password are required." };
  }

  const ip = await getClientIp();

  if (isIpBanned(ip)) {
    return { error: "Your IP has been banned." };
  }

  const rlConfig = getLoginRateLimitConfig();
  if (!rateLimiter.check(`${ip}:user:${username}`, rlConfig)) {
    recordRateLimitViolation(ip);
    tryAutoBan(ip);
    return { error: "Too many attempts. Please wait before trying again." };
  }

  const user = getUserWithPassword(username);

  if (!user || !verifyPassword(password, user.password)) {
    return { error: "Invalid username or password." };
  }

  recordLogin(user.id);

  const store = await cookies();
  const sessionData: { userId: number; partyId?: number; type: "admin" | "viewer" | "party"; pwChangedAt?: string | null } = {
    userId: user.id,
    type: user.type,
    pwChangedAt: user.password_changed_at,
  };
  if (user.type === "party" && user.party_id) {
    sessionData.partyId = user.party_id;
  }
  const sessionMaxAge = getSessionMaxSeconds();
  store.set(SESSION_COOKIE, createSession(sessionData, sessionMaxAge), { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: sessionMaxAge });

  redirect(user.type === "admin" ? "/admin" : "/home");
}

export async function loginByPartyCode(formData: FormData): Promise<LoginState> {
  const code = getString(formData, "code");
  if (!code) {
    return { error: "Please enter your party code." };
  }

  const trimmedCode = code.trim().toUpperCase();

  const ip = await getClientIp();

  if (isIpBanned(ip)) {
    return { error: "Your IP has been banned." };
  }

  const rlConfig = getLoginRateLimitConfig();
  if (!rateLimiter.check(`${ip}:party:${trimmedCode}`, rlConfig)) {
    recordRateLimitViolation(ip);
    tryAutoBan(ip);
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

  const partyUser = getPartyUserWithPassword(party.id);
  if (!partyUser) {
    return { error: "Party login not configured. Please contact the administrator." };
  }

  recordLogin(partyUser.id);

  const store = await cookies();
  const sessionMaxAge = getSessionMaxSeconds();
  store.set(SESSION_COOKIE, createSession({ userId: partyUser.id, partyId: party.id, type: "party", pwChangedAt: partyUser.password_changed_at }, sessionMaxAge), { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: sessionMaxAge });

  redirect("/home");
}

export async function logout(): Promise<void> {
  await destroySession();
  redirect("/");
}
