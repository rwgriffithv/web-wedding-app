#!/usr/bin/env bash
set -euo pipefail

# Adds 'unexpected' column to guests table (idempotent).
# Run from the project root: ./scripts/migrate-guest-unexpected.sh

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
const columns = db.prepare('PRAGMA table_info(guests)').all();
if (columns.some(c => c.name === 'unexpected')) {
  console.log(\"Column 'unexpected' already exists. Nothing to do.\");
} else {
  db.exec(\"ALTER TABLE guests ADD COLUMN unexpected INTEGER NOT NULL DEFAULT 0\");
  console.log(\"Column 'unexpected' added to guests table.\");
}
db.close();
"

echo "Migration complete."
