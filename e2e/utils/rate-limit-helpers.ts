import { openDb } from "./db-helpers";

export { openDb } from "./db-helpers";

let testIpsToClean: string[] = [];

export function seedViolations(ip: string, count: number) {
  const db = openDb();
  const insert = db.prepare("INSERT INTO rate_limit_violations (ip_address, violated_at) VALUES (?, datetime('now'))");
  for (let i = 0; i < count; i++) insert.run(ip);
  db.close();
  testIpsToClean.push(ip);
}

export function cleanupIp(ip: string) {
  const db = openDb();
  db.prepare("DELETE FROM rate_limit_violations WHERE ip_address = ?").run(ip);
  db.prepare("DELETE FROM banned_ips WHERE ip_address = ?").run(ip);
  db.close();
}

export function getViolationCountFromDb(ip: string): number {
  const db = openDb();
  const row = db.prepare("SELECT COUNT(*) as cnt FROM rate_limit_violations WHERE ip_address = ?").get(ip) as { cnt: number };
  db.close();
  return row.cnt;
}

export function isIpBannedInDb(ip: string): boolean {
  const db = openDb();
  const row = db.prepare("SELECT id FROM banned_ips WHERE ip_address = ? AND unbanned_at IS NULL").get(ip);
  db.close();
  return !!row;
}

export function nukeAllBansAndViolations() {
  const db = openDb();
  db.prepare("DELETE FROM banned_ips").run();
  db.prepare("DELETE FROM rate_limit_violations").run();
  db.close();
}

export function setConfig(key: string, value: string) {
  const db = openDb();
  db.prepare("INSERT OR REPLACE INTO site_config (key, value) VALUES (?, ?)").run(key, value);
  db.close();
}

/** Detect the real client IP from the DB by reading the most recent violation. */
export function detectClientIp(): string {
  const db = openDb();
  const row = db.prepare("SELECT ip_address FROM rate_limit_violations ORDER BY id DESC LIMIT 1").get() as { ip_address: string } | undefined;
  db.close();
  if (!row) throw new Error(
    "Cannot detect client IP — no violations in DB. " +
    "The first rate-limited login attempt must succeed before detectClientIp() is called."
  );
  return row.ip_address;
}

export function flushTestIps() {
  for (const ip of testIpsToClean) cleanupIp(ip);
  testIpsToClean = [];
}
