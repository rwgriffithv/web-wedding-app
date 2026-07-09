# Database Layer

- **Date:** 2026-07-03
- **Scope:** SQLite schema, connection management, repository pattern, seed data

## Technology

**better-sqlite3** — A synchronous SQLite3 driver for Node.js. Synchronous operations simplify the codebase by eliminating callback chains for database access. Acceptable for a single-server application with low concurrency.

## Connection Management

The database connection is a **singleton** managed by `src/lib/db.ts`:

```typescript
let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!db) {
    fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
    db = new Database(DB_PATH);
    db.pragma("journal_mode = WAL");
    db.pragma("foreign_keys = ON");
    db.exec(DDL);
    runMigrations(db);
    seedDefaults(db);
  }
  return db;
}
```

- **Lazy initialization** — Connection created on first access, not at module load time
- **WAL mode** — Write-Ahead Logging allows concurrent reads during writes
- **Foreign keys** — Enforced at the database level
- **Auto-migration** — `runMigrations()` adds columns for schema evolution
- **Auto-seed** — `seedDefaults()` inserts default data on first run (admin account, demo party)

## Database Path

```
DATABASE_URL=file:/app/data/sqlite/prod.db    # Production (Docker volume — sqlite/ subdir inside data/ mount)
DATABASE_URL=file:./data/dev.db               # Development (optional — relative to project root)
Falls back to:          data/dev.db           # No env var set
```

## Schema (7 Tables)

### `parties`

Groups of guests for convenient RSVP.

```sql
CREATE TABLE IF NOT EXISTS parties (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT NOT NULL,
  code       TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

### `guests`

All user accounts — admin, party members, and standalone guests.

```sql
CREATE TABLE IF NOT EXISTS guests (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  username          TEXT NOT NULL UNIQUE,
  password          TEXT NOT NULL,
  display_name      TEXT NOT NULL,
  type              TEXT NOT NULL DEFAULT 'guest'
                    CHECK(type IN ('admin', 'guest', 'guest_plus_one')),
  party_id          INTEGER REFERENCES parties(id) ON DELETE SET NULL,
  can_rsvp          INTEGER NOT NULL DEFAULT 1,
  can_bring_plus_one INTEGER NOT NULL DEFAULT 0,
  created_at        TEXT NOT NULL DEFAULT (datetime('now'))
);
```

| Column | Description |
|---|---|
| `username` | Login identifier |
| `password` | scrypt hash (`salt:hash` format) |
| `display_name` | Shown on RSVP form and in admin |
| `type` | `admin` (from .env), `guest` (most users), `guest_plus_one` (legacy) |
| `party_id` | Optional party membership |
| `can_rsvp` | `1` = can submit RSVP, `0` = view-only |
| `can_bring_plus_one` | `1` = plus one field shown on RSVP form |

### `site_config`

Key-value store for all configurable site content.

```sql
CREATE TABLE IF NOT EXISTS site_config (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
```

Common keys: `landing_title`, `landing_background`, `home_title`, `home_subtitle`, `home_date`, `home_location`, `home_background_video`, `dress_code_text`.

### `lodging_options`

Hotel/resort recommendations.

```sql
CREATE TABLE IF NOT EXISTS lodging_options (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  title     TEXT NOT NULL,
  image_url TEXT NOT NULL,
  url       TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0
);
```

### `dress_code_images`

Mood board images for the dress code page.

```sql
CREATE TABLE IF NOT EXISTS dress_code_images (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  image_url  TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0
);
```

### `rsvp_responses`

RSVP submissions — one per guest (unique constraint on `guest_id`).

```sql
CREATE TABLE IF NOT EXISTS rsvp_responses (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  guest_id     INTEGER NOT NULL UNIQUE REFERENCES guests(id) ON DELETE CASCADE,
  guest_name   TEXT NOT NULL,
  attending    INTEGER NOT NULL DEFAULT 0,
  plus_one_name TEXT,
  created_at   TEXT NOT NULL DEFAULT (datetime('now'))
);
```

### `media_items`

Photo and video gallery items.

```sql
CREATE TABLE IF NOT EXISTS media_items (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  type         TEXT NOT NULL CHECK(type IN ('image', 'video')),
  url          TEXT NOT NULL,
  thumbnail_url TEXT,
  title        TEXT NOT NULL,
  section      TEXT,
  sort_order   INTEGER NOT NULL DEFAULT 0
);
```

## Repository Pattern

All SQL queries are extracted into typed modules under `src/lib/repository/`. Each entity gets its own file:

| File | Functions |
|---|---|
| `party.ts` | `getAllParties()`, `getPartyById()`, `getPartyByCode()`, `createParty()`, `updateParty()`, `deleteParty()`, `regenerateCode()` |
| `guests.ts` | `getAllGuests()`, `getGuestById()`, `getGuestByUsername()`, `getGuestsByPartyId()`, `createGuest()`, `updateGuest()` |
| `rsvp.ts` | `getResponseByGuest()`, `getAllResponses()`, `submitResponse()` |
| `site-config.ts` | `getConfig()`, `setConfig()`, `getAllConfig()` |
| `lodging.ts` | `getAllLodging()`, `createLodging()`, `deleteLodging()` |
| `dress-code.ts` | `getAllImages()`, `addImage()`, `deleteImage()` |
| `media.ts` | `getAllMedia()`, `getMediaBySection()`, `addMedia()`, `deleteMedia()` |

All functions return typed interfaces (no `any`). All queries use parameterized statements.

## Seed Data

The seed script (`scripts/db-seed.ts`) creates:

```
Admin (type=admin, username=admin)
  └── Demo Family (code=DEMO-1234)
        ├── party_member (guest, can_rsvp=1, can_bring_plus_one=1)
        └── party_member2 (guest, can_rsvp=1, can_bring_plus_one=0)

Guest (type=guest, username=guest, can_rsvp=0)  ← view-only, no party
```

Plus demo content for: site config, lodging, dress code images, and media items.

Run with: `npm run db:seed`

## Migration Strategy

The `runMigrations()` function in `db.ts` checks for new columns and adds them if missing:

```typescript
function runMigrations(database: Database.Database): void {
  const columns = database.prepare("PRAGMA table_info(guests)").all() as { name: string }[];
  const colNames = columns.map(c => c.name);
  if (!colNames.includes("party_id"))
    database.exec("ALTER TABLE guests ADD COLUMN party_id INTEGER REFERENCES parties(id) ON DELETE SET NULL");
  if (!colNames.includes("can_rsvp"))
    database.exec("ALTER TABLE guests ADD COLUMN can_rsvp INTEGER NOT NULL DEFAULT 1");
  if (!colNames.includes("can_bring_plus_one"))
    database.exec("ALTER TABLE guests ADD COLUMN can_bring_plus_one INTEGER NOT NULL DEFAULT 0");
}
```

This makes the schema forward-compatible — new columns are added to existing databases without data loss.

## Access Rules

| Context | Access |
|---|---|
| Server Components | Read only |
| Route Handlers | Read and write |
| Server Actions | Read and write |
| Client Components | Never (must use Server Actions) |
