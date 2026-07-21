# Database Layer

SQLite via better-sqlite3 (WAL mode), server-only access through the repository pattern.

## Technology

**better-sqlite3** — Synchronous SQLite3 driver. Synchronous operations simplify the codebase. Acceptable for a single-server application with low concurrency.

## Connection Management

Singleton in `src/lib/db.ts`:

```typescript
let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!db) {
    fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
    db = new Database(DB_PATH);
    db.pragma("journal_mode = WAL");
    db.pragma("foreign_keys = ON");
    db.exec(DDL);
    seedDefaults(db);
  }
  return db;
}
```

- **Lazy initialization** — Created on first access
- **WAL mode** — Concurrent reads during writes
- **Foreign keys** — Enforced at database level
- **Auto-seed** — `seedDefaults()` inserts admin account on first run (demo data via `scripts/db-seed.ts`)

## Database Path

```
DATABASE_URL=file:/app/data/sqlite/prod.db    # Production (Docker volume)
DATABASE_URL=file:./data/dev.db               # Development (optional)
Falls back to:          data/dev.db           # No env var set
```

## Schema (14 Tables)

### `users`

Authentication entities — admin, viewer, and party roles.

```sql
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  display_name TEXT NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('admin', 'viewer', 'party')),
  party_id INTEGER,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  last_login_at TEXT,
  total_page_views INTEGER NOT NULL DEFAULT 0,
  password_changed_at TEXT,
  last_page_view_at TEXT,
  FOREIGN KEY (party_id) REFERENCES parties(id) ON DELETE SET NULL
);
```

| Column | Description |
|---|---|
| `username` | Login identifier (unique) |
| `password` | scrypt hash (`salt:hash` format) |
| `display_name` | Shown in admin UI |
| `type` | `admin` (from .env), `viewer` (view-only), `party` (RSVP access) |
| `party_id` | Links party users to their party |
| `last_login_at` | Timestamp of last successful login |
| `total_page_views` | Lifetime page view counter |
| `password_changed_at` | Used for session revocation on password change |
| `last_page_view_at` | Timestamp of last page view |

### `parties`

Groups of guests for family/household RSVP.

```sql
CREATE TABLE IF NOT EXISTS parties (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  invited INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

### `guests`

RSVP-able people. No auth fields — authentication is in `users`.

```sql
CREATE TABLE IF NOT EXISTS guests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  display_name TEXT NOT NULL,
  party_id INTEGER,
  can_bring_plus_one INTEGER NOT NULL DEFAULT 0,
  unexpected INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (party_id) REFERENCES parties(id) ON DELETE SET NULL
);
```

### `site_config`

Key-value store for all configurable site content.

```sql
CREATE TABLE IF NOT EXISTS site_config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
```

Keys are defined as constants in `src/lib/constants.ts`: `LANDING_TITLE_KEY`, `LANDING_BACKGROUND_KEY`, `DRESS_CODE_TEXT_KEY`, `SCHEDULE_TEXT_KEY`, `LODGING_TEXT_KEY`, `GIFTS_TEXT_KEY`, `RSVP_DEADLINE_KEY`, `HOME_BACKGROUND_VIDEO_POSTER_KEY`. Configuration keys (rate limits, auto-ban, session) follow the same pattern with `RL_`/`AUTO_BAN_`/`SESSION_` prefixes.

### `lodging_options`

Hotel/resort recommendations.

```sql
CREATE TABLE IF NOT EXISTS lodging_options (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  image_url TEXT NOT NULL,
  thumbnail_url TEXT,
  url TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0
);
```

### `dress_code_images`

Mood board images for the dress code page.

```sql
CREATE TABLE IF NOT EXISTS dress_code_images (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  image_url TEXT NOT NULL,
  thumbnail_url TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0
);
```

### `rsvp_responses`

RSVP submissions — one per guest (unique constraint on `guest_id`).

```sql
CREATE TABLE IF NOT EXISTS rsvp_responses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  guest_id INTEGER NOT NULL UNIQUE,
  guest_name TEXT NOT NULL,
  attending INTEGER NOT NULL DEFAULT 0,
  plus_one_name TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (guest_id) REFERENCES guests(id) ON DELETE CASCADE
);
```

### `media_items`

Photo and video gallery items.

```sql
CREATE TABLE IF NOT EXISTS media_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT NOT NULL CHECK(type IN ('image', 'video')),
  url TEXT NOT NULL,
  thumbnail_url TEXT,
  title TEXT,
  section TEXT NOT NULL DEFAULT 'General',
  sort_order INTEGER NOT NULL DEFAULT 0
);
```

### `schedule_items`

Wedding day schedule/timeline events.

```sql
CREATE TABLE IF NOT EXISTS schedule_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  time TEXT NOT NULL,
  label TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0
);
```

### `media_tabs`

Configurable tabs for the media gallery page.

```sql
CREATE TABLE IF NOT EXISTS media_tabs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0
);
```

| Column | Description |
|---|---|
| `slug` | URL-safe identifier (unique), used in `?tab=` param and as `section` values on `media_items` |
| `label` | Display name shown in tab navigation |
| `sort_order` | Tab ordering |

Tab deletion cascades to `media_items` via application logic (transaction deletes matching `media_items` where `section = slug`, then deletes the tab). Files on disk are never touched.

### `banned_ips`

IP addresses banned for brute-force or abuse. Soft-deleted via `unbanned_at`.

```sql
CREATE TABLE IF NOT EXISTS banned_ips (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ip_address TEXT NOT NULL,
  reason TEXT NOT NULL DEFAULT 'manual',
  banned_at TEXT NOT NULL DEFAULT (datetime('now')),
  unbanned_at TEXT
);
```

| Column | Description |
|---|---|
| `ip_address` | The banned IP (text, not validated as IPv4 — accepts any string) |
| `reason` | `"manual"` or `"auto:rate-limit-threshold"` |
| `banned_at` | When the ban was created |
| `unbanned_at` | NULL = active ban; set by admin unban action |

Partial unique index `idx_banned_ips_active` on `(ip_address) WHERE unbanned_at IS NULL` prevents duplicate active bans.

### `rate_limit_violations`

Tracks rate-limit lockout events per IP, used for auto-ban decisions.

```sql
CREATE TABLE IF NOT EXISTS rate_limit_violations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ip_address TEXT NOT NULL,
  violated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

| Column | Description |
|---|---|
| `ip_address` | The IP that triggered the lockout |
| `violated_at` | Timestamp of the violation |

Cleaned up periodically (every 50th lockout event) via `deleteOldViolations()`. See [ip-banning.md](../features/ip-banning.md) for the full auto-ban flow.

### Indexes

```sql
CREATE INDEX IF NOT EXISTS idx_guests_party_id ON guests(party_id);
CREATE INDEX IF NOT EXISTS idx_users_party_id ON users(party_id);
CREATE INDEX IF NOT EXISTS idx_users_type ON users(type);
CREATE INDEX IF NOT EXISTS idx_rsvp_attending ON rsvp_responses(attending);
CREATE INDEX IF NOT EXISTS idx_media_section ON media_items(section);
CREATE INDEX IF NOT EXISTS idx_media_sort_order ON media_items(sort_order);
CREATE INDEX IF NOT EXISTS idx_lodging_sort_order ON lodging_options(sort_order);
CREATE INDEX IF NOT EXISTS idx_schedule_sort_order ON schedule_items(sort_order);
CREATE INDEX IF NOT EXISTS idx_dress_code_sort_order ON dress_code_images(sort_order);
CREATE INDEX IF NOT EXISTS idx_media_tabs_sort_order ON media_tabs(sort_order);
CREATE INDEX IF NOT EXISTS idx_banned_ips_ip ON banned_ips(ip_address);
CREATE UNIQUE INDEX IF NOT EXISTS idx_banned_ips_active ON banned_ips(ip_address) WHERE unbanned_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_rate_limit_violations_ip ON rate_limit_violations(ip_address);
```

## Types

All interfaces defined in `src/lib/types.ts`, re-exported from `src/lib/db.ts`:

| Type | Description |
|---|---|
| `User` | Full user record (includes password) |
| `SafeUser` | `Omit<User, "password">` — returned by all repo functions except `getUserWithPassword` and `getPartyUserWithPassword` |
| `Guest` | RSVP-able person (no auth fields) |
| `Party` | Group with access code |
| `SiteConfig` | Key-value config entry |
| `LodgingOption` | Hotel recommendation |
| `DressCodeImage` | Mood board image |
| `RsvpResponse` | RSVP submission |
| `MediaItem` | Gallery photo/video |
| `MediaTab` | Gallery tab (slug, label, sort_order) |
| `ScheduleItem` | Timeline event |
| `BannedIp` | Banned IP record (ip_address, reason, banned_at, unbanned_at) |

## Repository Pattern

All SQL queries live in typed modules under `src/lib/repository/`. See [conventions.md](conventions.md) for naming rules, return types, and transaction patterns.

| File | Key Functions |
|---|---|
| `users.ts` | `getUserWithPassword()`, `getPartyUserWithPassword()`, `getUserById()`, `getAllUsers()`, `createUser()`, `updateUser()`, `deleteUser()`, `createPartyUser()`, `deleteUsersByPartyId()`, `recordLogin()`, `incrementPageViews()`, `getPartyActivity()` |
| `party.ts` | `getAllParties()`, `getPartyById()`, `getPartyByCode()`, `createParty()`, `updateParty()`, `deleteParty()`, `deleteEmptyParty()` |
| `guests.ts` | `getGuestById()`, `getAllGuests()`, `getGuestsByPartyId()`, `createGuest()`, `updateGuest()`, `deleteGuest()` |
| `rsvp.ts` | `getResponseByGuest()`, `getAllResponses()`, `getRecentResponses()`, `getResponsesByGuests()`, `getAllGuestsRsvpStatus()`, `submitResponse()`, `getResponseCount()` |
| `site-config.ts` | `getConfig()`, `getAllConfig()`, `setConfig()` |
| `lodging.ts` | `getAll()`, `create()`, `update()`, `deleteOption()`, `swapSortOrder()` |
| `dress-code.ts` | `getImages()`, `createImage()`, `deleteImage()` |
| `media.ts` | `getAll()`, `getBySection()`, `create()`, `update()`, `deleteItem()`, `swapItemSortOrder()`, `getAllTabs()`, `createTab()`, `updateTab()`, `deleteTab()`, `swapTabSortOrder()` |
| `schedule.ts` | `getAll()`, `create()`, `deleteItem()` |
| `ip-bans.ts` | `isIpBanned()`, `banIp()`, `unbanIp()`, `getBannedIps()`, `getBannedCount()`, `getAutoBanConfig()`, `recordRateLimitViolation()`, `getViolationCount()`, `getSuspiciousIpCount()`, `deleteOldViolations()` |

All functions return typed interfaces. All queries use parameterized statements. Repository functions use CRUD verbs (`create`, `update`, `delete`). Server Actions use domain verbs (`add`, `save`, `move`) — see [conventions.md](conventions.md).

## Thumbnail Generation

Three tables store `thumbnail_url` (nullable): `media_items`, `lodging_options`, `dress_code_images`. Thumbnails are auto-generated server-side — no manual inputs, no admin intervention.

**Pipeline:** Server Action → `ensureThumbnail(url)` (`src/lib/thumbnail.ts`) → resolves URL to local disk path → generates 400×400 WebP → returns `/api/media/thumbnails/{uuid}_400x400.webp` or `null`.

| Input | Source | Thumbnail? |
|---|---|---|
| File upload | `FileUpload` → `/api/upload` | Yes (local file) |
| Local file browser | `FileBrowser` → `/api/media/{path}` | Yes (local file) |
| Manual URL paste | Text input | Local: Yes. Remote: No (returns null) |

**Generation:** `sharp` for images (~50ms). `child_process.execFile` + `ffmpeg-static` for first-frame extraction → temp JPG → `sharp` for WebP conversion (~500ms–2s). SVGs excluded.

**Fallback:** All consumers use `thumbnail_url || url`. Generation failure never blocks the save.

**Cleanup:** Thumbnail files are deleted inside the same transaction as the parent record (see [conventions.md](conventions.md) — transaction patterns). The `deleteThumbnail()` helper only removes files under `/api/media/thumbnails/`.

**Dependencies:** `sharp` (image processing), `ffmpeg-static` (video frame extraction). Both configured in `serverExternalPackages` in `next.config.mjs`.

## Schema Management

DDL in `src/lib/db-schema.ts` handles all table creation via `CREATE TABLE IF NOT EXISTS`. No migration system — fresh databases only. Schema changes require recreating the database.

```typescript
// db.ts — DDL runs on every startup
db.exec(DDL);
seedDefaults(db);
```

## Access Rules

| Context | Access |
|---|---|
| Server Components | Read only |
| Route Handlers | Read and write |
| Server Actions | Read and write |
| Client Components | Never (must use Server Actions) |
