#!/usr/bin/env bash
set -euo pipefail

# One-shot idempotent migration for all schema changes.
# Run from the project root: ./scripts/migrate.sh
#
# This combines all previous per-migration scripts into a single run.
# Individual scripts at scripts/migrate-*.sh are retained for reference
# but this is the canonical migration entry point.

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

function tableExists(name) {
  const r = db.prepare(\"SELECT count(*) as c FROM sqlite_master WHERE type='table' AND name=?\").get(name);
  return r.c > 0;
}

function columnExists(table, column) {
  const cols = db.prepare('PRAGMA table_info(' + table + ')').all().map(r => r.name);
  return cols.includes(column);
}

// ── Migration 1: password_changed_at on users ──
if (!columnExists('users', 'password_changed_at')) {
  db.exec('ALTER TABLE users ADD COLUMN password_changed_at TEXT');
  console.log('  ✓ Column password_changed_at added to users.');
} else {
  console.log('  - Column password_changed_at already exists.');
}

// ── Migration 2: last_page_view_at on users ──
if (!columnExists('users', 'last_page_view_at')) {
  db.exec('ALTER TABLE users ADD COLUMN last_page_view_at TEXT');
  console.log('  ✓ Column last_page_view_at added to users.');
} else {
  console.log('  - Column last_page_view_at already exists.');
}

// ── Migration 3: invited on parties ──
if (!columnExists('parties', 'invited')) {
  db.exec('ALTER TABLE parties ADD COLUMN invited INTEGER NOT NULL DEFAULT 0');
  console.log('  ✓ Column invited added to parties.');
} else {
  console.log('  - Column invited already exists.');
}

// ── Migration 4: unexpected on guests ──
if (!columnExists('guests', 'unexpected')) {
  db.exec('ALTER TABLE guests ADD COLUMN unexpected INTEGER NOT NULL DEFAULT 0');
  console.log('  ✓ Column unexpected added to guests.');
} else {
  console.log('  - Column unexpected already exists.');
}

// ── Migration 5: faq_items table ──
if (!tableExists('faq_items')) {
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
  console.log('  ✓ Table faq_items created.');
} else {
  console.log('  - Table faq_items already exists.');
}

// ── Migration 6: questions table ──
if (!tableExists('questions')) {
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
  console.log('  ✓ Table questions created.');
} else {
  console.log('  - Table questions already exists.');
}

// ── Migration 7: banned_ips table ──
if (!tableExists('banned_ips')) {
  db.exec(\`
    CREATE TABLE banned_ips (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ip_address TEXT NOT NULL,
      reason TEXT NOT NULL DEFAULT 'manual',
      banned_at TEXT NOT NULL DEFAULT (datetime('now')),
      unbanned_at TEXT
    );
  \`);
  db.exec('CREATE INDEX IF NOT EXISTS idx_banned_ips_ip ON banned_ips(ip_address)');
  console.log('  ✓ Table banned_ips created.');
} else {
  console.log('  - Table banned_ips already exists.');
}

// ── Migration 8: rate_limit_violations table ──
if (!tableExists('rate_limit_violations')) {
  db.exec(\`
    CREATE TABLE rate_limit_violations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ip_address TEXT NOT NULL,
      violated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  \`);
  db.exec('CREATE INDEX IF NOT EXISTS idx_rate_limit_violations_ip ON rate_limit_violations(ip_address)');
  console.log('  ✓ Table rate_limit_violations created.');
} else {
  console.log('  - Table rate_limit_violations already exists.');
}

// ── Migration 9: unique index on active bans ──
try {
  db.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_banned_ips_active ON banned_ips(ip_address) WHERE unbanned_at IS NULL');
  console.log('  ✓ Unique index idx_banned_ips_active created.');
} catch (e: unknown) {
  const msg = e instanceof Error ? e.message : String(e);
  if (msg.includes('already exists')) {
    console.log('  - Unique index idx_banned_ips_active already exists.');
  } else {
    throw e;
  }
}

// ── Migration 10: idx_media_tabs_sort_order ──
db.exec('CREATE INDEX IF NOT EXISTS idx_media_tabs_sort_order ON media_tabs(sort_order)');
console.log('  ✓ Index idx_media_tabs_sort_order ensured.');

// ── Migration 11: idx_media_section ──
db.exec('CREATE INDEX IF NOT EXISTS idx_media_section ON media_items(section)');
console.log('  ✓ Index idx_media_section ensured.');

// ── Migration 12: idx_rate_limit_violations_violated_at ──
// Optimizes the combined IP table query's MAX(violated_at) aggregation.
db.exec('CREATE INDEX IF NOT EXISTS idx_rate_limit_violations_violated_at ON rate_limit_violations(violated_at)');
console.log('  ✓ Index idx_rate_limit_violations_violated_at ensured.');

// ── Migration 13: standardize site_config key names for rate limit configs ──
// Adds _max_attempts and _window_seconds suffixes for consistency.
const SITE_CONFIG_RENAMES = [
  { from: 'rsvp_rate_limit_max', to: 'rsvp_rate_limit_max_attempts' },
  { from: 'rsvp_rate_limit_window', to: 'rsvp_rate_limit_window_seconds' },
  { from: 'question_rate_limit_max', to: 'question_rate_limit_max_attempts' },
  { from: 'question_rate_limit_window', to: 'question_rate_limit_window_seconds' },
];
for (const { from, to } of SITE_CONFIG_RENAMES) {
  const existing = db.prepare('SELECT value FROM site_config WHERE key = ?').get(from);
  if (existing) {
    db.prepare('UPDATE site_config SET key = ? WHERE key = ?').run(to, from);
    console.log('  ✓ site_config key \"' + from + '\" → \"' + to + '\"');
  } else {
    console.log('  - site_config key \"' + from + '\" not found, skipping.');
  }
}

// ── Migration 14: media_max_file_size_ttl_ms → media_max_file_size_ttl_seconds ──
// Rename key and convert existing values from ms to seconds.
const ttlRow = db.prepare(\"SELECT value FROM site_config WHERE key = 'media_max_file_size_ttl_ms'\").get();
if (ttlRow) {
  const existingSec = Math.round(parseInt(ttlRow.value, 10) / 1000) || 60;
  db.prepare(\"INSERT OR REPLACE INTO site_config (key, value) VALUES ('media_max_file_size_ttl_seconds', ?)\").run(String(existingSec));
  db.prepare(\"DELETE FROM site_config WHERE key = 'media_max_file_size_ttl_ms'\").run();
  console.log('  ✓ media_max_file_size_ttl_ms → media_max_file_size_ttl_seconds (' + existingSec + 's)');
} else {
  console.log('  - media_max_file_size_ttl_ms not found, skipping.');
}

// ── Migration 15: auto-mark parties as invited if any guest has RSVP'd ──
// Backfills invited=1 for parties that were never manually marked invited
// but have at least one guest with an RSVP response.
const autoInvited = db.prepare(\`
  UPDATE parties SET invited = 1 WHERE invited = 0 AND id IN (
    SELECT g.party_id FROM guests g
    WHERE g.party_id IS NOT NULL
      AND EXISTS (SELECT 1 FROM rsvp_responses r WHERE r.guest_id = g.id)
  )
\`).run();
if (autoInvited.changes > 0) {
  console.log('  ✓ Auto-marked ' + autoInvited.changes + ' party(ies) as invited (have RSVP responses).');
} else {
  console.log('  - No parties need auto-invite backfill.');
}

db.close();
"

echo ""
echo "All migrations complete."
