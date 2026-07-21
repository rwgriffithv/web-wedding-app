#!/usr/bin/env bash
set -euo pipefail

# Read-only validation of the production database.
# Identifies empty tables, unused columns, orphaned rows, and
# tables/columns not referenced in the app codebase.
#
# Usage: ./scripts/validate.sh [--db path/to/db]

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

# If not inside Docker, re-exec inside the container
if [ ! -f /.dockerenv ]; then
  echo "Running inside Docker container..."
  exec docker compose run --rm \
    -v "${SCRIPT_DIR}:/tmp/scripts:ro" \
    -v "${PROJECT_DIR}/src:/app/src:ro" \
    webapp bash "/tmp/scripts/$(basename "$0")" "$@"
fi

DB="${DB_PATH:-$(pwd)/data/sqlite/prod.db}"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --db) DB="$2"; shift 2 ;;
    *) echo "Unknown arg: $1"; exit 1 ;;
  esac
done

if [ ! -f "$DB" ]; then
  echo "Error: Database not found at $DB"
  exit 1
fi

echo "╔══════════════════════════════════════════════════════╗"
echo "║          Database Validation Report                 ║"
echo "╚══════════════════════════════════════════════════════╝"
echo ""
echo "Database: $DB"
echo ""

node -e "
const Database = require('better-sqlite3');
const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const db = new Database('${DB}');
db.pragma('journal_mode = WAL');

// ── Helpers ──────────────────────────────────────────────

function getTables() {
  return db.prepare(\"SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'\").all().map(r => r.name);
}

function getColumns(table) {
  return db.prepare('PRAGMA table_info(' + table + ')').all();
}

function getIndexInfo(table) {
  return db.prepare('PRAGMA index_list(' + table + ')').all();
}

function getRowCount(table) {
  const r = db.prepare('SELECT COUNT(*) as cnt FROM \"' + table + '\"').get();
  return r.cnt;
}

function getForeignKeys(table) {
  return db.prepare('PRAGMA foreign_key_list(' + table + ')').all();
}

function grepCode(pattern) {
  try {
    const out = execSync(
      'grep -r --include=\"*.ts\" --include=\"*.tsx\" --include=\"*.js\" --include=\"*.jsx\" -l \"' + pattern + '\" src/ 2>/dev/null || true',
      { encoding: 'utf-8', cwd: process.cwd() }
    ).trim();
    return out.length > 0;
  } catch {
    return false;
  }
}

function grepCodeCount(pattern) {
  try {
    const out = execSync(
      'grep -r --include=\"*.ts\" --include=\"*.tsx\" --include=\"*.js\" --include=\"*.jsx\" -c \"' + pattern + '\" src/ 2>/dev/null || true',
      { encoding: 'utf-8', cwd: process.cwd() }
    ).trim();
    if (!out) return 0;
    return out.split('\\n').reduce((sum, line) => {
      const n = parseInt(line.split(':').pop() || '0', 10);
      return sum + (isNaN(n) ? 0 : n);
    }, 0);
  } catch {
    return 0;
  }
}

// ── Section 1: Empty Tables ──────────────────────────────

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('  1. EMPTY TABLES');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('');

const tables = getTables();
const emptyTables = [];
const populatedTables = [];

for (const t of tables) {
  const cnt = getRowCount(t);
  if (cnt === 0) emptyTables.push(t);
  else populatedTables.push({ name: t, count: cnt });
}

if (emptyTables.length === 0) {
  console.log('  ✓ All tables have data.');
} else {
  console.log('  Found ' + emptyTables.length + ' empty table(s):');
  console.log('');
  for (const t of emptyTables) {
    console.log('    • ' + t);
  }
  console.log('');
  console.log('  Suggestion: Empty tables are not necessarily unused — they may');
  console.log('  be populated later (e.g. faq_items, questions). Verify whether');
  console.log('  the table is expected to have data before dropping it.');
}
console.log('');

// ── Section 2: Table Usage in Code ───────────────────────

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('  2. TABLES NOT REFERENCED IN APP CODE');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('');

const unreferencedTables = [];
for (const t of tables) {
  // Skip internal SQLite tables
  if (t.startsWith('sqlite_')) continue;
  if (!grepCode(t)) {
    unreferencedTables.push(t);
  }
}

if (unreferencedTables.length === 0) {
  console.log('  ✓ All tables are referenced in app code.');
} else {
  console.log('  Found ' + unreferencedTables.length + ' unreferenced table(s):');
  console.log('');
  for (const t of unreferencedTables) {
    const cnt = getRowCount(t);
    console.log('    • ' + t + ' (' + cnt + ' rows)');
  }
  console.log('');
  console.log('  Suggestion: These tables exist in the database but no .ts/.tsx');
  console.log('  file contains the table name. They may be legacy or accessed');
  console.log('  via raw SQL. Verify before dropping:');
  console.log('    sqlite3 $DB \"SELECT * FROM <table> LIMIT 5;\"');
}
console.log('');

// ── Section 3: Unused Columns ────────────────────────────

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('  3. COLUMNS NOT REFERENCED IN APP CODE');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('');

const unusedColumns = [];
const totalChecked = { tables: 0, columns: 0 };

for (const t of tables) {
  if (t.startsWith('sqlite_')) continue;
  const cols = getColumns(t);
  for (const col of cols) {
    totalChecked.columns++;
    // Skip id columns — always used for PKs
    if (col.name === 'id') continue;
    // Check if the column name appears in app code
    if (!grepCode(col.name)) {
      unusedColumns.push({ table: t, column: col.name, type: col.type, notnull: col.notnull, dflt: col.dflt_value });
    }
  }
  totalChecked.tables++;
}

if (unusedColumns.length === 0) {
  console.log('  ✓ All columns are referenced in app code.');
} else {
  console.log('  Found ' + unusedColumns.length + ' unreferenced column(s) across ' + totalChecked.tables + ' tables:');
  console.log('');
  for (const { table, column, type, notnull, dflt } of unusedColumns) {
    const parts = [type];
    if (notnull) parts.push('NOT NULL');
    if (dflt !== null) parts.push('DEFAULT ' + dflt);
    console.log('    • ' + table + '.' + column + ' (' + parts.join(', ') + ')');
  }
  console.log('');
  console.log('  Suggestion: Column names not found in any .ts/.tsx file may be');
  console.log('  unused. Before removing, verify:');
  console.log('    1. Not used in raw SQL queries (grep -r \"<column>\" src/)');
  console.log('    2. Not a migration artifact that\'s still needed');
  console.log('    3. Safe to drop: sqlite3 $DB \"ALTER TABLE <table> DROP COLUMN <column>;\"');
  console.log('    (SQLite 3.35.0+ required for DROP COLUMN)');
}
console.log('');

// ── Section 4: Orphaned Foreign Keys ─────────────────────

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('  4. ORPHANED FOREIGN KEYS');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('');

let orphansFound = false;
for (const t of tables) {
  if (t.startsWith('sqlite_')) continue;
  const fks = getForeignKeys(t);
  if (fks.length === 0) continue;

  for (const fk of fks) {
    const fromCol = fk.from;
    const toTable = fk.table;
    const toCol = fk.to;

    // Skip if referenced table doesn't exist (would be caught by FK enforcement)
    const toTableExists = tables.includes(toTable);
    if (!toTableExists) continue;

    const orphans = db.prepare(
      'SELECT COUNT(*) as cnt FROM \"' + t + '\" WHERE \"' + fromCol + '\" IS NOT NULL AND \"' + fromCol + '\" NOT IN (SELECT \"' + toCol + '\" FROM \"' + toTable + '\")'
    ).get();

    if (orphans.cnt > 0) {
      orphansFound = true;
      console.log('    • ' + t + '.' + fromCol + ' → ' + toTable + '.' + toCol + ': ' + orphans.cnt + ' orphaned row(s)');
    }
  }
}

if (!orphansFound) {
  console.log('  ✓ No orphaned foreign key references found.');
} else {
  console.log('');
  console.log('  Suggestion: Orphaned rows reference non-existent parent records.');
  console.log('  This can happen if foreign keys were added after data was inserted,');
  console.log('  or if ON DELETE behavior prevented cascading. To clean up:');
  console.log('    DELETE FROM <table> WHERE <column> NOT IN (SELECT <ref_col> FROM <ref_table>);');
}
console.log('');

// ── Section 5: Migration Verification ────────────────────

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('  5. MIGRATION VERIFICATION');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('');

const expectedMigrations = [
  { name: 'idx_banned_ips_ip', table: 'banned_ips', columns: ['ip_address'] },
  { name: 'idx_banned_ips_active', table: 'banned_ips', columns: ['ip_address'], unique: true, partial: 'unbanned_at IS NULL' },
  { name: 'idx_rate_limit_violations_ip', table: 'rate_limit_violations', columns: ['ip_address'] },
  { name: 'idx_rate_limit_violations_violated_at', table: 'rate_limit_violations', columns: ['violated_at'] },
  { name: 'idx_media_tabs_sort_order', table: 'media_tabs', columns: ['sort_order'] },
  { name: 'idx_media_section', table: 'media_items', columns: ['section'] },
  { name: 'idx_faq_sort_order', table: 'faq_items', columns: ['sort_order'] },
  { name: 'idx_questions_party_id', table: 'questions', columns: ['party_id'] },
];

const expectedColumns = [
  { table: 'users', column: 'password_changed_at' },
  { table: 'users', column: 'last_page_view_at' },
  { table: 'parties', column: 'invited' },
  { table: 'guests', column: 'unexpected' },
];

let migrationIssues = 0;

// Check columns
for (const { table, column } of expectedColumns) {
  if (!tables.includes(table)) {
    console.log('    ⚠ Table ' + table + ' missing (expected for column ' + column + ')');
    migrationIssues++;
    continue;
  }
  const cols = getColumns(table).map(c => c.name);
  if (!cols.includes(column)) {
    console.log('    ✗ ' + table + '.' + column + ' — MISSING (migration not applied)');
    migrationIssues++;
  } else {
    console.log('    ✓ ' + table + '.' + column + ' — present');
  }
}

// Check indexes
for (const idx of expectedMigrations) {
  if (!tables.includes(idx.table)) {
    console.log('    ⚠ Table ' + idx.table + ' missing (skipping index check for ' + idx.name + ')');
    migrationIssues++;
    continue;
  }
  const indexes = getIndexInfo(idx.table);
  const found = indexes.find(i => i.name === idx.name);
  if (!found) {
    console.log('    ✗ Index ' + idx.name + ' on ' + idx.table + ' — MISSING');
    migrationIssues++;
  } else {
    const extra = [];
    if (idx.unique && !found.unique) extra.push('should be UNIQUE');
    if (found.origin === 'pk') extra.push('is primary key');
    console.log('    ✓ Index ' + idx.name + ' on ' + idx.table + ' — present' + (extra.length ? ' (' + extra.join(', ') + ')' : ''));
  }
}

if (migrationIssues === 0) {
  console.log('');
  console.log('  ✓ All migrations applied successfully.');
} else {
  console.log('');
  console.log('  ⚠ ' + migrationIssues + ' issue(s) detected. Run ./scripts/migrate.sh to apply missing migrations.');
}
console.log('');

// ── Section 6: Data Format Validation ────────────────────

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('  6. DATA FORMAT VALIDATION');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('');

const ISO_DATETIME = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/;
const IP_V4 = /^(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)$/;
const IP_V6 = /^[0-9a-fA-F]{0,4}(?::[0-9a-fA-F]{0,4}){2,7}$/;
const VALID_USER_TYPES = ['admin', 'viewer', 'party'];

let formatIssues = 0;

function isValidIp(ip) {
  return IP_V4.test(ip) || IP_V6.test(ip);
}

function isValidDatetime(s) {
  if (!s || s === '') return true; // NULLs are allowed
  return ISO_DATETIME.test(s);
}

// Validate banned_ips
if (tables.includes('banned_ips')) {
  const allBans = db.prepare('SELECT id, ip_address, banned_at, reason FROM banned_ips').all();
  const badIps = allBans.filter(r => r.ip_address && !isValidIp(r.ip_address));
  const badDates = allBans.filter(r => !isValidDatetime(r.banned_at));
  const longReasons = allBans.filter(r => r.reason && r.reason.length > 500);

  if (badIps.length > 0) {
    console.log('  ✗ banned_ips.ip_address: ' + badIps.length + ' row(s) with invalid IP format:');
    for (const r of badIps.slice(0, 5)) console.log('    id=' + r.id + ' ip="' + r.ip_address + '"');
    formatIssues += badIps.length;
  } else {
    console.log('  ✓ banned_ips.ip_address — all ' + allBans.length + ' row(s) valid');
  }

  if (badDates.length > 0) {
    console.log('  ✗ banned_ips.banned_at: ' + badDates.length + ' row(s) with invalid datetime:');
    for (const r of badDates.slice(0, 5)) console.log('    id=' + r.id + ' banned_at="' + r.banned_at + '"');
    formatIssues += badDates.length;
  } else {
    console.log('  ✓ banned_ips.banned_at — format valid');
  }

  if (longReasons.length > 0) {
    console.log('  ✗ banned_ips.reason: ' + longReasons.length + ' row(s) exceed 500 chars:');
    for (const r of longReasons.slice(0, 5)) console.log('    id=' + r.id + ' length=' + r.reason.length);
    formatIssues += longReasons.length;
  } else {
    console.log('  ✓ banned_ips.reason — all within length limits');
  }
}

// Validate rate_limit_violations
if (tables.includes('rate_limit_violations')) {
  const allViolations = db.prepare('SELECT id, ip_address, violated_at FROM rate_limit_violations').all();
  const badIps = allViolations.filter(r => r.ip_address && !isValidIp(r.ip_address));
  const badDates = allViolations.filter(r => !isValidDatetime(r.violated_at));

  if (badIps.length > 0) {
    console.log('  ✗ rate_limit_violations.ip_address: ' + badIps.length + ' row(s) with invalid IP format:');
    for (const r of badIps.slice(0, 5)) console.log('    id=' + r.id + ' ip="' + r.ip_address + '"');
    formatIssues += badIps.length;
  } else {
    console.log('  ✓ rate_limit_violations.ip_address — all ' + allViolations.length + ' row(s) valid');
  }

  if (badDates.length > 0) {
    console.log('  ✗ rate_limit_violations.violated_at: ' + badDates.length + ' row(s) with invalid datetime:');
    for (const r of badDates.slice(0, 5)) console.log('    id=' + r.id + ' violated_at="' + r.violated_at + '"');
    formatIssues += badDates.length;
  } else {
    console.log('  ✓ rate_limit_violations.violated_at — format valid');
  }
}

// Validate users.type
if (tables.includes('users')) {
  const allUsers = db.prepare('SELECT id, username, type FROM users').all();
  const badTypes = allUsers.filter(function(r) { return VALID_USER_TYPES.indexOf(r.type) === -1; });
  if (badTypes.length > 0) {
    console.log('  ✗ users.type: ' + badTypes.length + ' row(s) with invalid type:');
    for (var i = 0; i < Math.min(badTypes.length, 5); i++) {
      var r = badTypes[i];
      console.log('    id=' + r.id + ' username="' + r.username + '" type="' + r.type + '"');
    }
    formatIssues += badTypes.length;
  } else {
    var cnt = getRowCount('users');
    console.log('  ✓ users.type — all ' + cnt + ' row(s) valid (admin/viewer/party)');
  }
}

// Validate foreign key integrity
if (tables.includes('guests') && tables.includes('parties')) {
  var allGuests = db.prepare('SELECT id, party_id FROM guests WHERE party_id IS NOT NULL').all();
  var partyIds = db.prepare('SELECT id FROM parties').all().map(function(r) { return r.id; });
  var orphanedGuests = allGuests.filter(function(r) { return partyIds.indexOf(r.party_id) === -1; });
  if (orphanedGuests.length > 0) {
    console.log('  ✗ guests.party_id: ' + orphanedGuests.length + ' orphaned reference(s) to parties');
    formatIssues += orphanedGuests.length;
  } else {
    console.log('  ✓ guests.party_id — all foreign keys valid');
  }
}

if (formatIssues === 0) {
  console.log('');
  console.log('  ✓ All data formats valid.');
} else {
  console.log('');
  console.log('  ⚠ ' + formatIssues + ' format issue(s) detected. Investigate before deploying.');
}
console.log('');

// ── Section 7: Index Coverage ────────────────────────────

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('  7. INDEX COVERAGE');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('');

const indexReport = [];
for (const t of tables) {
  if (t.startsWith('sqlite_')) continue;
  const indexes = getIndexInfo(t);
  if (indexes.length === 0) {
    indexReport.push({ table: t, indexes: 0, note: 'no indexes' });
  } else {
    const names = indexes.map(i => i.name);
    indexReport.push({ table: t, indexes: indexes.length, names });
  }
}

for (const { table, indexes, names, note } of indexReport) {
  if (indexes === 0) {
    console.log('    ⚠ ' + table + ': ' + (note || 'no indexes'));
  } else {
    console.log('    ✓ ' + table + ': ' + indexes + ' index(es) — ' + names.join(', '));
  }
}
console.log('');

// ── Section 8: Site Config ──────────────────────────────

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('  8. SITE CONFIG');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('');

// Extract known key string literals from constants.ts for comparison.
const knownKeys = new Set();
try {
  const src = require('fs').readFileSync('src/lib/constants.ts', 'utf-8');
  for (const line of src.split('\n')) {
    const m = line.match(/=\s+\"([^\"]+)\"/);
    if (m) knownKeys.add(m[1]);
  }
} catch { /* ignore */ }

const allConfig = db.prepare('SELECT key, value FROM site_config ORDER BY key').all();
let staleKeys = 0;
if (allConfig.length === 0) {
  console.log('  (empty)');
} else {
  for (const { key, value } of allConfig) {
    if (knownKeys.has(key)) {
      console.log('    ' + key + ' = ' + value);
    } else {
      console.log('  ⚠ ' + key + ' = ' + value + '  (not found in src/lib/constants.ts)');
      staleKeys++;
    }
  }
}
console.log('');

// ── Section 9: Summary ───────────────────────────────────

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('  SUMMARY');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('');
console.log('  Tables:       ' + tables.length + ' total, ' + emptyTables.length + ' empty, ' + unreferencedTables.length + ' unreferenced');
console.log('  Columns:      ' + totalChecked.columns + ' checked, ' + unusedColumns.length + ' unreferenced');
console.log('  Migrations:   ' + (migrationIssues === 0 ? 'all applied' : migrationIssues + ' issue(s)'));
console.log('  Data formats: ' + (formatIssues === 0 ? 'all valid' : formatIssues + ' issue(s)'));
console.log('  Foreign keys: ' + (orphansFound ? 'orphans detected (see above)' : 'all clean'));
console.log('  Indexes:      ' + indexReport.filter(r => r.indexes > 0).length + ' tables indexed, ' + indexReport.filter(r => r.indexes === 0).length + ' tables without');
console.log('  Site config:  ' + allConfig.length + ' key(s)' + (staleKeys > 0 ? ', ' + staleKeys + ' stale' : ''));
console.log('');

db.close();
"
