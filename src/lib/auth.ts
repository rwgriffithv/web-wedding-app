import { cookies } from "next/headers";
import crypto from "crypto";
import { getEnvConfig } from "./config";
import { getConfig } from "./repository/site-config";
import { getUserById } from "./repository/users";
import { getPartyById } from "./repository/party";
import { getPartyUserWithPassword } from "./repository/users";

export const SESSION_COOKIE = "session";

export interface Session {
  userId?: number;
  partyId?: number;
  type: "admin" | "viewer" | "party";
  exp?: number;
  pwChangedAt?: string | null;
}

function getSessionSecret(): string {
  return getEnvConfig().sessionSecret;
}

function signSession(obj: Record<string, unknown>, expiresInSeconds?: number): string {
  const payload = { ...obj };
  if (expiresInSeconds && expiresInSeconds > 0) {
    payload.exp = Date.now() + expiresInSeconds * 1000;
  }
  const signed = JSON.stringify(payload);
  const secret = getSessionSecret();
  const hmac = crypto.createHmac("sha256", secret).update(signed).digest("hex");
  return Buffer.from(`${signed}.${hmac}`).toString("base64url");
}

function verifySession(token: string): Session | null {
  let decoded: string;
  try {
    decoded = Buffer.from(token, "base64url").toString();
  } catch {
    return null;
  }
  const lastDot = decoded.lastIndexOf(".");
  if (lastDot === -1) return null;
  const payload = decoded.slice(0, lastDot);
  const signature = decoded.slice(lastDot + 1);
  const secret = getSessionSecret();
  const hmac = crypto.createHmac("sha256", secret).update(payload).digest("hex");
  const hmacBuf = Buffer.from(hmac);
  const sigBuf = Buffer.from(signature);
  if (hmacBuf.length !== sigBuf.length || !crypto.timingSafeEqual(hmacBuf, sigBuf)) return null;
  try {
    const session = JSON.parse(payload) as Session;
    if (session.exp && Date.now() > session.exp) return null;
    return session;
  } catch {
    return null;
  }
}

async function validateSessionFields(session: Session): Promise<Session | null> {
  if (session.type === "admin" || session.type === "viewer") {
    if (!session.userId) return null;
    const user = getUserById(session.userId);
    if (!user || user.type !== session.type) return null;
    if ((session.pwChangedAt ?? null) !== user.password_changed_at) return null;
    return session;
  }
  if (session.type === "party") {
    if (!session.partyId) return null;
    const party = getPartyById(session.partyId);
    if (!party) return null;
    const partyUser = getPartyUserWithPassword(session.partyId);
    if (partyUser && (session.pwChangedAt ?? null) !== partyUser.password_changed_at) return null;
    return session;
  }
  return null;
}

/** Fast path — crypto only, no DB. Used for page loads and read-only checks. */
export async function parseSession(): Promise<Session | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifySession(token);
}

/** Fast path — parse session and verify it belongs to an admin. No DB query. */
export async function parseAdminSession(): Promise<Session | null> {
  const session = await parseSession();
  if (!session || session.type !== "admin") return null;
  return session;
}

/** Cold path — validates session fields against DB. Call only on mutations. */
export async function validateSessionForMutation(session?: Session | null): Promise<Session | null> {
  const s = session ?? await parseSession();
  if (!s) return null;
  return validateSessionFields(s);
}

/**
 * Fast path — parse session and verify it belongs to an admin. No DB query.
 * Used by read-only endpoints (e.g. media list). For admin mutations,
 * prefer `parseAdminSession()` + `validateSessionForMutation(session)`.
 */
export async function isAdmin(): Promise<boolean> {
  const session = await parseSession();
  return session?.type === "admin";
}

export function createSession(data: { userId?: number; partyId?: number; type: "admin" | "viewer" | "party"; pwChangedAt?: string | null }, expiresInSeconds?: number): string {
  return signSession(data, expiresInSeconds);
}

export async function destroySession(): Promise<void> {
  const store = await cookies();
  store.set(SESSION_COOKIE, "", { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 0 });
}

/** Parse session_max_hours from DB config, clamp to 1 second–24 hours, return seconds. */
export function getSessionMaxSeconds(): number {
  const hours = parseFloat(getConfig("session_max_hours"));
  const seconds = (Number.isFinite(hours) && hours > 0 ? Math.min(hours, 24) : 24) * 60 * 60;
  return Math.max(1, seconds);
}

const SALT_LENGTH = 32;
const KEY_LENGTH = 64;

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(SALT_LENGTH).toString("base64");
  const hash = crypto.scryptSync(password, salt, KEY_LENGTH).toString("base64");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const colon = stored.indexOf(":");
  if (colon === -1) return false;
  const salt = stored.slice(0, colon);
  const expected = stored.slice(colon + 1);
  const actual = crypto.scryptSync(password, salt, KEY_LENGTH).toString("base64");
  const actualBuf = Buffer.from(actual);
  const expectedBuf = Buffer.from(expected);
  if (actualBuf.length !== expectedBuf.length) return false;
  return crypto.timingSafeEqual(actualBuf, expectedBuf);
}
