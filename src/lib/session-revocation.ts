/**
 * In-memory session revocation cache.
 *
 * Tracks two events that should immediately kick logged-in users out:
 * 1. Password changes — Map<userId, timestamp>
 * 2. IP bans — Set<ip> (only bans since last server restart)
 *
 * This is NOT a general-purpose database cache. Nothing else goes in here.
 */

import { getSessionMaxSeconds } from "@/lib/site-config";

const passwordRevocations = new Map<number, number>();
const recentBans = new Set<string>();

/** Mark all sessions for this user as revoked (password changed). */
export function revokeSessionsByPasswordChange(userId: number): void {
  passwordRevocations.set(userId, Date.now());
  maybeCleanupPasswordRevocations();
}

/** Remove a user from the revocation map (user deleted). */
export function clearPasswordRevocation(userId: number): void {
  passwordRevocations.delete(userId);
}

/**
 * Check if a session is revoked by a password change.
 * Returns true if the revocation timestamp is newer than the session's pwChangedAt.
 */
export function isSessionRevokedByPasswordChange(userId: number, sessionPwChangedAt: string | null): boolean {
  const revokedAt = passwordRevocations.get(userId);
  if (revokedAt === undefined) return false;
  const parsed = sessionPwChangedAt ? Date.parse(sessionPwChangedAt + (sessionPwChangedAt.endsWith("Z") ? "" : "Z")) : 0;
  return revokedAt > parsed;
}

/** Mark an IP as recently banned (for active session revocation). */
export function revokeSessionsByIpBan(ip: string): void {
  recentBans.add(ip);
}

/** Remove an IP from the recent ban set (IP unbanned). */
export function unrevokeSessionsByIpBan(ip: string): void {
  recentBans.delete(ip);
}

/** Check if a session is revoked by a recent IP ban. */
export function isSessionRevokedByIpBan(ip: string): boolean {
  return recentBans.has(ip);
}

/** Pure check — does this session have a revocation newer than its issue time? */
export function isSessionRevoked(
  session: { userId?: number; pwChangedAt?: string | null },
  ip: string,
): boolean {
  return (
    (session.userId != null && isSessionRevokedByPasswordChange(session.userId, session.pwChangedAt ?? null))
    || isSessionRevokedByIpBan(ip)
  );
}

// Periodic cleanup: remove password revocations older than session timeout + 1 hour buffer.
// Only runs on writes to avoid unnecessary overhead on reads.
let cleanupCounter = 0;
const CLEANUP_INTERVAL = 100;

function maybeCleanupPasswordRevocations(): void {
  if (++cleanupCounter % CLEANUP_INTERVAL !== 0) return;
  const sessionSeconds = getSessionMaxSeconds();
  const maxAgeMs = (sessionSeconds + 3600) * 1000; // session timeout + 1h buffer
  const cutoff = Date.now() - maxAgeMs;
  for (const [userId, timestamp] of passwordRevocations) {
    if (timestamp < cutoff) passwordRevocations.delete(userId);
  }
}
