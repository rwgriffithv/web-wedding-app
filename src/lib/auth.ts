import { cookies } from "next/headers";
import crypto from "crypto";
import { getDb, type Guest } from "./db";
import { getConfig } from "./config";

const SESSION_COOKIE = "session";

interface Session {
  guestId?: number;
  partyId?: number;
  type: "admin" | "party" | "guest";
}

function getSessionSecret(): string {
  return getConfig().sessionSecret;
}

function signSession(payload: string): string {
  const secret = getSessionSecret();
  const hmac = crypto.createHmac("sha256", secret).update(payload).digest("hex");
  return `${payload}.${hmac}`;
}

function verifySession(token: string): Session | null {
  const lastDot = token.lastIndexOf(".");
  if (lastDot === -1) return null;
  const payload = token.slice(0, lastDot);
  const signature = token.slice(lastDot + 1);
  const secret = getSessionSecret();
  const hmac = crypto.createHmac("sha256", secret).update(payload).digest("hex");
  if (!crypto.timingSafeEqual(Buffer.from(hmac), Buffer.from(signature))) return null;
  try {
    return JSON.parse(payload) as Session;
  } catch {
    return null;
  }
}

export async function parseSession(): Promise<Session | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifySession(token);
}

export async function getCurrentGuest(): Promise<Guest | null> {
  const session = await parseSession();
  if (!session?.guestId) return null;
  const db = getDb();
  const guest = db.prepare("SELECT * FROM guests WHERE id = ?").get(session.guestId) as Guest | undefined;
  return guest ?? null;
}

export async function isAdmin(): Promise<boolean> {
  const session = await parseSession();
  return session?.type === "admin";
}

export async function getPartyId(): Promise<number | null> {
  const session = await parseSession();
  return session?.partyId ?? null;
}

export function createSession(data: { guestId?: number; partyId?: number; type: "admin" | "party" | "guest" }): string {
  return signSession(JSON.stringify(data));
}

export async function destroySession(): Promise<void> {
  const store = await cookies();
  store.set(SESSION_COOKIE, "", { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 0 });
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
  return crypto.timingSafeEqual(Buffer.from(actual), Buffer.from(expected));
}
