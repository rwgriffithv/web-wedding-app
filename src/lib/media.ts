import path from "node:path";
import fs from "node:fs";

export const MEDIA_DIR = process.env.MEDIA_DIR || path.join(process.cwd(), "data", "media");

let ensured = false;

export function ensureMediaDir(): void {
  if (ensured) return;
  fs.mkdirSync(MEDIA_DIR, { recursive: true });
  ensured = true;
}
