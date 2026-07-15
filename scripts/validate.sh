#!/usr/bin/env bash
set -euo pipefail

# Read-only validation of the production database.
# Identifies empty tables, unused columns, orphaned rows, and
# tables/columns not referenced in the app codebase.
#
# Usage: ./scripts/validate.sh [--db path/to/db]

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

# If not inside Docker, re-exec inside the container
if [ ! -f /.dockerenv ]; then
  echo "Running inside Docker container..."
  exec docker compose run --rm \
    -v "${SCRIPT_DIR}:/tmp/scripts:ro" \
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

// ── Section 5: Duplicate Indexes ─────────────────────────

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('  5. INDEX COVERAGE');
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

// ── Section 6: Summary ───────────────────────────────────

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('  SUMMARY');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('');
console.log('  Tables:       ' + tables.length + ' total, ' + emptyTables.length + ' empty, ' + unreferencedTables.length + ' unreferenced');
console.log('  Columns:      ' + totalChecked.columns + ' checked, ' + unusedColumns.length + ' unreferenced');
console.log('  Foreign keys: ' + (orphansFound ? 'orphans detected (see above)' : 'all clean'));
console.log('  Indexes:      ' + indexReport.filter(r => r.indexes > 0).length + ' tables indexed, ' + indexReport.filter(r => r.indexes === 0).length + ' tables without');
console.log('');

db.close();
"
