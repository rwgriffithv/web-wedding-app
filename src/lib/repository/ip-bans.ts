import { getDb } from "@/lib/db";
import type { BannedIp, RateLimitViolation } from "@/lib/types";
import { AUTO_BAN_THRESHOLD_DEFAULT, AUTO_BAN_WINDOW_DEFAULT } from "@/lib/constants";
import { getConfig } from "@/lib/repository/site-config";

export function getAutoBanConfig(): { threshold: number; windowSeconds: number } {
  const threshold = parseInt(getConfig("auto_ban_login_threshold"), 10) || AUTO_BAN_THRESHOLD_DEFAULT;
  const windowSeconds = parseInt(getConfig("auto_ban_window_seconds"), 10) || AUTO_BAN_WINDOW_DEFAULT;
  return { threshold, windowSeconds };
}

export function isIpBanned(ip: string): boolean {
  const db = getDb();
  const row = db.prepare(
    "SELECT id FROM banned_ips WHERE ip_address = ? AND unbanned_at IS NULL"
  ).get(ip);
  return !!row;
}

export function getBannedIps(): BannedIp[] {
  const db = getDb();
  return db.prepare(
    "SELECT * FROM banned_ips WHERE unbanned_at IS NULL ORDER BY banned_at DESC"
  ).all() as BannedIp[];
}

export function getSuspiciousIpCount(threshold: number, windowSeconds: number): number {
  const db = getDb();
  const raw = db.prepare(
    `SELECT r.ip_address, COUNT(*) as violation_count
     FROM rate_limit_violations r
     WHERE r.violated_at >= datetime('now', '-' || ? || ' seconds')
     AND r.ip_address NOT IN (SELECT ip_address FROM banned_ips WHERE unbanned_at IS NULL)
     GROUP BY r.ip_address
     HAVING violation_count >= ?`
  ).all(windowSeconds, threshold) as { ip_address: string; violation_count: number }[];
  return raw.length;
}

export function getBannedCount(): number {
  const db = getDb();
  const row = db.prepare(
    "SELECT COUNT(*) as cnt FROM banned_ips WHERE unbanned_at IS NULL"
  ).get() as { cnt: number };
  return row.cnt;
}

export function banIp(ip: string, reason: string): void {
  const db = getDb();
  db.prepare(
    "INSERT INTO banned_ips (ip_address, reason) VALUES (?, ?)"
  ).run(ip, reason);
}

export function unbanIp(id: number): void {
  const db = getDb();
  db.prepare(
    "UPDATE banned_ips SET unbanned_at = datetime('now') WHERE id = ?"
  ).run(id);
}

export function recordRateLimitViolation(ip: string): void {
  const db = getDb();
  db.prepare(
    "INSERT INTO rate_limit_violations (ip_address) VALUES (?)"
  ).run(ip);
}

export function getViolationCount(ip: string, windowSeconds: number): number {
  const db = getDb();
  const row = db.prepare(
    `SELECT COUNT(*) as cnt FROM rate_limit_violations
     WHERE ip_address = ?
     AND violated_at >= datetime('now', '-' || ? || ' seconds')`
  ).get(ip, windowSeconds) as { cnt: number };
  return row.cnt;
}

export function deleteOldViolations(windowSeconds: number): void {
  const db = getDb();
  db.prepare(
    "DELETE FROM rate_limit_violations WHERE violated_at < datetime('now', '-' || ? || ' seconds')"
  ).run(windowSeconds);
}

export function getRateLimitViolations(windowSeconds: number): RateLimitViolation[] {
  const db = getDb();
  return db.prepare(
    `SELECT ip_address, COUNT(*) as violation_count, MAX(violated_at) as last_violated_at
     FROM rate_limit_violations
     WHERE violated_at >= datetime('now', '-' || ? || ' seconds')
     AND ip_address NOT IN (SELECT ip_address FROM banned_ips WHERE unbanned_at IS NULL)
     GROUP BY ip_address
     ORDER BY violation_count DESC`
  ).all(windowSeconds) as RateLimitViolation[];
}
