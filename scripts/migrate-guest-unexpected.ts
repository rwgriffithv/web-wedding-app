import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

const dbPath = path.join(process.cwd(), "data", "sqlite", "prod.db");
const backupDir = path.join(process.cwd(), "backups");

if (!fs.existsSync(dbPath)) {
  console.error(`Database not found at ${dbPath}`);
  process.exit(1);
}

fs.mkdirSync(backupDir, { recursive: true });
const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
const backupPath = path.join(backupDir, `prod-${timestamp}.db`);
fs.copyFileSync(dbPath, backupPath);
console.log(`Backup created at ${backupPath}`);

const db = new Database(dbPath);
db.pragma("journal_mode = WAL");

const columns = db.prepare("PRAGMA table_info(guests)").all() as { cid: number; name: string; type: string; notnull: number; dflt_value: string | null; pk: number }[];
if (columns.some(c => c.name === "unexpected")) {
  console.log("Column 'unexpected' already exists. Nothing to do.");
} else {
  db.exec("ALTER TABLE guests ADD COLUMN unexpected INTEGER NOT NULL DEFAULT 0");
  console.log("Column 'unexpected' added to guests table.");
}

db.close();
