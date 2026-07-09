import { getDb, type SiteConfig } from "@/lib/db";

export function getConfig(key: string): string {
  const db = getDb();
  const row = db.prepare("SELECT value FROM site_config WHERE key = ?").get(key) as { value: string } | undefined;
  return row?.value ?? "";
}

export function getAllConfig(): SiteConfig[] {
  const db = getDb();
  return db.prepare("SELECT * FROM site_config ORDER BY key").all() as SiteConfig[];
}

export function setConfig(key: string, value: string): void {
  const db = getDb();
  db.prepare("INSERT OR REPLACE INTO site_config (key, value) VALUES (?, ?)").run(key, value);
}
