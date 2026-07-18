import { getDb } from "@/lib/db";
import type { CombinedIp } from "@/lib/types";
import { AUTO_BAN_THRESHOLD_DEFAULT, AUTO_BAN_WINDOW_DEFAULT, SUSPICIOUS_THRESHOLD_DEFAULT } from "@/lib/constants";
import { getConfig } from "@/lib/repository/site-config";

export function getAutoBanConfig(): { threshold: number; windowSeconds: number } {
  const threshold = parseInt(getConfig("auto_ban_login_threshold"), 10) || AUTO_BAN_THRESHOLD_DEFAULT;
  const windowSeconds = parseInt(getConfig("auto_ban_window_seconds"), 10) || AUTO_BAN_WINDOW_DEFAULT;
  return { threshold, windowSeconds };
}

export function getSuspiciousConfig(): { threshold: number } {
  const threshold = parseInt(getConfig("suspicious_ip_threshold"), 10) || SUSPICIOUS_THRESHOLD_DEFAULT;
  return { threshold };
}

export function isIpBanned(ip: string): boolean {
  const db = getDb();
  const row = db.prepare(
    "SELECT id FROM banned_ips WHERE ip_address = ? AND unbanned_at IS NULL"
  ).get(ip);
  return !!row;
}

export function getSuspiciousIpCount(threshold: number): number {
  const db = getDb();
  const row = db.prepare(
    `SELECT COUNT(*) as cnt FROM (
      SELECT r.ip_address
      FROM rate_limit_violations r
      WHERE r.ip_address NOT IN (SELECT ip_address FROM banned_ips WHERE unbanned_at IS NULL)
      GROUP BY r.ip_address
      HAVING COUNT(*) >= ?
    )`
  ).get(threshold) as { cnt: number };
  return row.cnt;
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

export function getBannedIpById(id: number): string | null {
  const db = getDb();
  const row = db.prepare(
    "SELECT ip_address FROM banned_ips WHERE id = ?"
  ).get(id) as { ip_address: string } | undefined;
  return row?.ip_address ?? null;
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

export function clearViolations(ip: string): void {
  const db = getDb();
  db.prepare("DELETE FROM rate_limit_violations WHERE ip_address = ?").run(ip);
}

export function getCombinedIpTable(suspiciousThreshold: number): CombinedIp[] {
  const db = getDb();
  return db.prepare(
    `SELECT
      v.ip_address,
      CASE WHEN b.id IS NOT NULL THEN 1 ELSE 0 END AS is_banned,
      b.id AS ban_id,
      CASE WHEN v.violation_count >= ? THEN 1 ELSE 0 END AS is_suspicious,
      v.violation_count,
      v.last_violated_at
    FROM (
      SELECT ip_address, COUNT(*) AS violation_count, MAX(violated_at) AS last_violated_at
      FROM rate_limit_violations
      GROUP BY ip_address
    ) v
    LEFT JOIN banned_ips b ON v.ip_address = b.ip_address AND b.unbanned_at IS NULL

    UNION ALL

    SELECT
      b.ip_address,
      1 AS is_banned,
      b.id AS ban_id,
      0 AS is_suspicious,
      0 AS violation_count,
      NULL AS last_violated_at
    FROM banned_ips b
    WHERE b.unbanned_at IS NULL
      AND b.ip_address NOT IN (SELECT ip_address FROM rate_limit_violations)

    ORDER BY violation_count DESC, last_violated_at DESC`
  ).all(suspiciousThreshold) as CombinedIp[];
}

let violationCleanupCounter = 0;

export function tryAutoBan(ip: string): void {
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
