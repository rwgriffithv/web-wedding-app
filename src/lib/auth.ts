import { cookies } from "next/headers";
import crypto from "crypto";
import { getEnvConfig } from "./config";
import { getUserById } from "./repository/users";
import { getPartyById } from "./repository/party";

const SESSION_COOKIE = "session";

interface Session {
  userId?: number;
  partyId?: number;
  type: "admin" | "viewer" | "party";
}

function getSessionSecret(): string {
  return getEnvConfig().sessionSecret;
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
  const hmacBuf = Buffer.from(hmac);
  const sigBuf = Buffer.from(signature);
  if (hmacBuf.length !== sigBuf.length || !crypto.timingSafeEqual(hmacBuf, sigBuf)) return null;
  try {
    return JSON.parse(payload) as Session;
  } catch {
    return null;
  }
}

async function validateSession(session: Session): Promise<Session | null> {
  if (session.type === "admin" || session.type === "viewer") {
    if (!session.userId) return null;
    const user = getUserById(session.userId);
    if (!user || user.type !== session.type) return null;
    return session;
  }
  if (session.type === "party") {
    if (!session.partyId) return null;
    const party = getPartyById(session.partyId);
    if (!party) return null;
    return session;
  }
  return null;
}

export async function parseSession(): Promise<Session | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const session = verifySession(token);
  if (!session) return null;
  return validateSession(session);
}

export async function isAdmin(): Promise<boolean> {
  const session = await parseSession();
  return session?.type === "admin";
}

export function createSession(data: { userId?: number; partyId?: number; type: "admin" | "viewer" | "party" }): string {
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
  const actualBuf = Buffer.from(actual);
  const expectedBuf = Buffer.from(expected);
  if (actualBuf.length !== expectedBuf.length) return false;
  return crypto.timingSafeEqual(actualBuf, expectedBuf);
}
