# Database Layer

- **Date:** 2026-06-29
- **Scope:** SQLite schema, connection management, and query patterns

## Technology

**better-sqlite3** — A synchronous SQLite3 driver for Node.js. Synchronous operations simplify the codebase by eliminating callback or promise chains for database access. This is acceptable for a single-server application with low concurrency.

## Connection Management

The database connection is a **singleton** managed by `src/lib/db.ts`:

```typescript
let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma("journal_mode = WAL");
    db.pragma("foreign_keys = ON");
  }
  return db;
}
```

- **Lazy initialization** — The connection is created on first access, not at module load time
- **WAL mode** — Write-Ahead Logging allows concurrent reads during writes
- **Foreign keys** — Enforced at the database level

## Database Path

The database location is determined by the `DATABASE_URL` environment variable:

```
DATABASE_URL=file:/app/data/prod.db    # Production (Docker)
DATABASE_URL=file:./data/dev.db         # Development (optional)
Falls back to:          data/dev.db     # Default
```

The path is derived by stripping the `file:` prefix from `DATABASE_URL`. This supports both absolute paths (Docker volumes) and relative paths (local development).

## Schema

### `users` Table

```sql
CREATE TABLE IF NOT EXISTS users (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  email      TEXT    NOT NULL UNIQUE,
  name       TEXT    NOT NULL,
  role       TEXT    NOT NULL DEFAULT 'user'
                     CHECK(role IN ('admin', 'user')),
  created_at TEXT    NOT NULL DEFAULT (datetime('now'))
);
```

| Column | Type | Constraints |
|---|---|---|
| `id` | INTEGER | Primary key, auto-increment |
| `email` | TEXT | Not null, unique |
| `name` | TEXT | Not null |
| `role` | TEXT | Not null, default 'user', constrained to 'admin' or 'user' |
| `created_at` | TEXT | Not null, default current datetime |

### `page_views` Table

```sql
CREATE TABLE IF NOT EXISTS page_views (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  path      TEXT    NOT NULL,
  viewed_at TEXT    NOT NULL DEFAULT (datetime('now'))
);
```

| Column | Type | Constraints |
|---|---|---|
| `id` | INTEGER | Primary key, auto-increment |
| `path` | TEXT | Not null |
| `viewed_at` | TEXT | Not null, default current datetime |

## TypeScript Interfaces

Defined in `src/lib/db.ts`:

```typescript
interface User {
  id: number;
  email: string;
  name: string;
  role: "admin" | "user";
  created_at: string;
}

interface PageView {
  id: number;
  path: string;
  viewed_at: string;
}
```

All database queries cast their results to these interfaces for type safety. The `role` field uses a union type (`"admin" | "user"`) which mirrors the SQL `CHECK` constraint.

## Access Rules

| Context | Access |
|---|---|
| Server Components | ✅ Read and write |
| Route Handlers | ✅ Read and write |
| Server Actions | ✅ Read and write |
| Client Components | ❌ Never |

Database access is **server-only**. Client Components must go through Server Actions or Route Handlers to read or write data.

## Query Patterns

### Parameterized queries only

```typescript
// ✅ Safe — parameterized
const user = db.prepare("SELECT * FROM users WHERE email = ?").get(email);

// ❌ Never — string concatenation
const user = db.prepare(`SELECT * FROM users WHERE email = '${email}'`).get();
```

### Typed results

```typescript
const user = db.prepare("SELECT * FROM users WHERE id = ?").get(id) as User | undefined;
const users = db.prepare("SELECT * FROM users ORDER BY created_at DESC").all() as User[];
const count = db.prepare("SELECT COUNT(*) as count FROM users").get() as { count: number };
```

## Seeding

Tables are auto-created on first database connection by `getDb()` in `src/lib/db.ts`. Use the seed script to insert demo data:

| Script | Command | Purpose |
|---|---|---|
| `scripts/db-seed.ts` | `npm run db:seed` | Inserts demo data (skips if users exist) |

The seed script also creates tables if they don't exist, so it can be run standalone.

### Demo Data

| Email | Name | Role |
|---|---|---|
| `admin@example.com` | Admin User | admin |
| `alice@example.com` | Alice Johnson | user |
| `bob@example.com` | Bob Smith | user |
| `charlie@example.com` | Charlie Brown | user |

## Data Directory

The `data/` directory contains:

| Path | Purpose | Git |
|---|---|---|
| `data/dev.db` | Development database | Ignored |
| `data/dev.db-wal` | WAL file | Ignored |
| `data/dev.db-shm` | Shared memory file | Ignored |
| `data/backups/` | Automated backup archives | Ignored |

In production (Docker), the database is mounted at `/app/data` inside the container, and the SQLite files persist on the host via the `./data/sqlite:/app/data` volume mount.
