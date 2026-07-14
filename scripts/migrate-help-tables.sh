#!/usr/bin/env bash
set -euo pipefail

# Creates faq_items and questions tables (idempotent).
# Run from the project root: ./scripts/migrate-help-tables.sh

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

# If not inside Docker, re-exec inside the container
if [ ! -f /.dockerenv ]; then
  HOST_BACKUP_DIR="$(pwd)/backups"
  mkdir -p "$HOST_BACKUP_DIR"
  echo "Running inside Docker container..."
  exec docker compose run --rm \
    -v "${SCRIPT_DIR}:/tmp/scripts:ro" \
    -v "${HOST_BACKUP_DIR}:/app/backups" \
    webapp bash "/tmp/scripts/$(basename "$0")"
fi

DB="${DB_PATH:-$(pwd)/data/sqlite/prod.db}"
BACKUP_DIR="$(pwd)/backups"
TIMESTAMP=$(date -u +"%Y-%m-%dT%H-%M-%SZ")

if [ ! -f "$DB" ]; then
  echo "Error: Database not found at $DB"
  exit 1
fi

mkdir -p "$BACKUP_DIR"
cp "$DB" "$BACKUP_DIR/prod-${TIMESTAMP}.db"
echo "Backup created at $BACKUP_DIR/prod-${TIMESTAMP}.db"

node -e "
const Database = require('better-sqlite3');
const db = new Database('${DB}');
db.pragma('journal_mode = WAL');

const tables = db.prepare(\"SELECT name FROM sqlite_master WHERE type='table'\").all().map(r => r.name);

if (!tables.includes('faq_items')) {
  db.exec(\`
    CREATE TABLE faq_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      question TEXT NOT NULL,
      answer TEXT NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  \`);
  db.exec('CREATE INDEX IF NOT EXISTS idx_faq_sort_order ON faq_items(sort_order)');
  console.log('Table faq_items created.');
} else {
  console.log('Table faq_items already exists.');
}

if (!tables.includes('questions')) {
  db.exec(\`
    CREATE TABLE questions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      party_id INTEGER NOT NULL,
      question TEXT NOT NULL,
      answer TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      answered_at TEXT,
      FOREIGN KEY (party_id) REFERENCES parties(id) ON DELETE CASCADE
    );
  \`);
  db.exec('CREATE INDEX IF NOT EXISTS idx_questions_party_id ON questions(party_id)');
  console.log('Table questions created.');
} else {
  console.log('Table questions already exists.');
}

db.close();
"

echo "Migration complete."
