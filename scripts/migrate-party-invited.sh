#!/usr/bin/env bash
set -euo pipefail

# Adds 'invited' column to parties table (idempotent).
# Run from the project root: ./scripts/migrate-party-invited.sh

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
const columns = db.prepare('PRAGMA table_info(parties)').all();
if (columns.some(c => c.name === 'invited')) {
  console.log(\"Column 'invited' already exists. Nothing to do.\");
} else {
  db.exec(\"ALTER TABLE parties ADD COLUMN invited INTEGER NOT NULL DEFAULT 0\");
  console.log(\"Column 'invited' added to parties table.\");
}
db.close();
"

echo "Migration complete."
