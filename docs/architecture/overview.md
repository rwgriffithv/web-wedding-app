# Architecture Overview

Server-first Next.js 16 App Router application with SQLite, deployed via Docker + Cloudflare Tunnel.

## Design Philosophy

**Server-first architecture** — Rendering, data fetching, and mutations happen on the server by default. Client Components are used only where browser APIs or interactivity are required (forms, lightbox galleries, timers), and are pushed to leaf nodes in the component tree.

**Repository pattern** — All SQL queries are extracted into typed modules under `src/lib/repository/`. Each entity gets its own file. Page components focus on rendering, queries are testable in isolation, schema changes are centralized. See [conventions.md](conventions.md) for naming rules, return types, and transaction patterns.

**Separation of auth and RSVP** — Authentication (`users` table) is separate from RSVP entities (`guests` table). Admin credentials come from `.env`, party authentication uses access codes, viewer accounts are managed from the admin dashboard. Passwords are hashed with scrypt.

## System Architecture

```
                          ┌─────────────────────┐
                          │  Cloudflare Edge     │
                          │  (TLS termination)   │
                          └──────────┬──────────┘
                                     │
                          ┌──────────▼──────────┐
                          │  cloudflared         │
                          │  (outbound tunnel)   │
                          └──────────┬──────────┘
                                     │
                          ┌──────────▼──────────┐
                          │  Caddy               │
                          │  (reverse proxy,     │
                          │   TLS, rate limit,   │
                          │   security headers)  │
                           └──────────┬──────────┘
                                      │
                           ┌──────────▼──────────┐
                           │  Next.js App         │
                           │  (port 3000)         │
                          │  ┌────────────────┐  │
                          │  │ Server Actions │  │
                          │  │ Route Handlers │  │
                          │  │ Server Comps   │  │
                          │  └────────┬───────┘  │
                          └──────────┬──────────┘
                                     │
                          ┌──────────▼──────────┐
                          │  SQLite              │
                          │  (WAL mode,          │
                          │   server-only)       │
                          └─────────────────────┘
```

### Network Topology

| Network | Accessibility | Services |
|---|---|---|
| `frontend` | External | tunnel, caddy |
| `backend` | Internal (no external access) | webapp, caddy |

## Route Map

| Route | Type | Auth | Purpose |
|---|---|---|---|
| `/` | Dynamic | None | Landing page with login form |
| `/login` | Dynamic | None | Authentication (credentials or party code) |
| `/(main)/home` | Dynamic | Any session | Wedding home with countdown timer |
| `/(main)/lodging` | Dynamic | Any session | Hotel/resort recommendations |
| `/(main)/dress-code` | Dynamic | Any session | Dress code mood board |
| `/(main)/rsvp` | Dynamic | Party session | Party-based RSVP with per-member forms |
| `/(main)/media` | Dynamic | Any session | Photo/video gallery with tab routing |
| `/(main)/schedule` | Dynamic | Any session | Wedding day timeline |
| `/admin` | Dynamic | Admin only | Dashboard with stats and RSVP table |
| `/admin/users` | Dynamic | Admin only | User management (admin, viewer, party) |
| `/admin/guests` | Dynamic | Admin only | Guest CRUD with party assignment |
| `/admin/site` | Dynamic | Admin only | Site configuration editor |
| `/admin/lodging` | Dynamic | Admin only | Lodging recommendations CRUD |
| `/admin/dress-code` | Dynamic | Admin only | Dress code image management |
| `/admin/rsvp` | Dynamic | Admin only | RSVP response viewer (sortable table) |
| `/admin/media` | Dynamic | Admin only | Media gallery CRUD |
| `/admin/schedule` | Dynamic | Admin only | Wedding day schedule CRUD |
| `/api/health` | Static | None | Health check endpoint |
| `/api/upload` | Dynamic | Admin only | File upload (multipart) |
| `/api/media/[...path]` | Dynamic | Session | File serving (any logged-in user) |
| `/api/media/list` | Dynamic | Admin only | Directory listing for file browser |
| `/api/login-background` | Static | None | Login background image (public) |

## Authentication & Authorization

Three session types:

| Session Type | Created By | Access |
|---|---|---|
| `admin` | Username/password login | All routes |
| `party` | Party code login | `/(main)/*` + RSVP for party members |
| `viewer` | Username/password login | `/(main)/*` only |

Auth is enforced at the layout level (`isAdmin()` guard) and in every Server Action. `SafeUser` type (`Omit<User, "password">`) is returned by all repository functions except `getUserWithPassword` and `getPartyUserWithPassword`.

## Technology Stack

| Layer | Technology | Purpose |
|---|---|---|
| Framework | Next.js 16 (App Router, Turbopack) | Server-first React, file-based routing |
| Language | TypeScript 5.4 (strict) | Type safety with no `any` |
| Database | better-sqlite3 (WAL mode) | Synchronous SQLite, zero-config |
| Auth | HMAC-signed JSON cookie | Session tokens with scrypt password hashing |
| Styling | Plain CSS (custom properties) | Zero-dependency, themeable via `:root`. **No Tailwind CSS.** Utility classes are hand-crafted in `globals.css`. |
| Proxy | Caddy 2.11 (alpine) | TLS, rate limiting, security headers |
| Tunnel | cloudflared 2026.6.1 | Outbound-only Cloudflare Tunnel |
| Testing | Vitest + Playwright | 66 unit tests + E2E specs |
| Deployment | Docker Compose | Multi-stage build, isolated networks |

## Directory Layout

```
src/
├── app/                          # Next.js App Router
│   ├── (main)/                   # Authenticated public pages
│   │   ├── home/page.tsx         # Countdown timer, date, location
│   │   ├── lodging/page.tsx      # Hotel recommendations
│   │   ├── dress-code/page.tsx   # Mood board
│   │   ├── rsvp/                 # Party-based RSVP
│   │   │   ├── page.tsx
│   │   │   ├── rsvp-form.tsx     # Per-member form (client)
│   │   │   └── actions.ts
│   │   ├── media/                # Photo/video gallery (tab routing)
│   │   │   ├── page.tsx
│   │   │   └── media-gallery.tsx # Grid + lightbox (client)
│   │   ├── schedule/page.tsx     # Wedding day timeline
│   │   └── layout.tsx            # Auth guard + bottom nav
│   ├── admin/                    # Admin dashboard
│   │   ├── users/                # User management
│   │   ├── guests/               # Guest CRUD + party assignment
│   │   ├── site/                 # Site config editor
│   │   ├── lodging/              # Lodging CRUD
│   │   ├── dress-code/           # Dress code images
│   │   ├── rsvp/                 # RSVP sortable table
│   │   ├── media/                # Media gallery CRUD
│   │   │   ├── page.tsx
│   │   │   ├── media-form.tsx    # Add form with SearchableSelect for tabs
│   │   │   ├── media-list.tsx    # Grouped by tab, inline title editing
│   │   │   └── actions.ts        # addItem, deleteItem, updateItem, createTabInline, renameTab, deleteTab
│   │   ├── schedule/             # Schedule CRUD
│   │   └── layout.tsx            # Admin guard + responsive sidebar
│   ├── login/                    # Login page + actions
│   ├── api/health/route.ts       # Health check
│   ├── api/upload/route.ts       # File upload (admin)
│   ├── api/media/[...path]/      # File serving (session auth)
│   ├── api/media/list/route.ts   # Directory listing (admin)
│   ├── api/login-background/     # Login bg image (public)
│   └── (page.tsx, layout.tsx, error.tsx, not-found.tsx)
├── components/                   # Shared UI (5 client components)
│   ├── searchable-select.tsx     # WAI-ARIA combobox
│   ├── countdown-timer.tsx       # T-XYZ / T+XYZ timer
│   ├── file-upload.tsx           # Drag-and-drop upload
│   ├── file-browser.tsx          # Text-based file explorer
│   └── logout-button.tsx         # Logout form wrapper
├── lib/                          # Server-only utilities
│   ├── repository/               # Data access (9 entity files)
│   ├── types.ts                  # All interfaces + SafeUser
│   ├── auth.ts                   # Session + password hashing
│   ├── db.ts                     # Connection + DDL + seed
│   ├── schema.ts                 # DDL (10 tables)
│   ├── config.ts                 # Env validation
│   ├── form-data.ts              # Safe FormData extraction + validateMediaUrl
│   ├── media.ts                  # Media directory config
│   └── rate-limit.ts             # LRU eviction rate limiter
├── test/                         # Test utilities
│   ├── test-utils.ts             # Shared test helpers
│   └── db-test-utils.ts          # createTestDb() + truncateAll()
└── app/globals.css               # Styles + utility classes
```

## Key Architecture Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Data fetching | Server Components | No client-server waterfall, smaller bundles |
| Mutations | Server Actions | Type-safe, colocated, no API boilerplate |
| Database | SQLite | Zero-config, file-based, no server process needed |
| Auth | HMAC-signed JSON cookie + DB validation | Simple, secure (signed), sessions validated against DB on every request |
| Access control | Layout-level guards + server actions | Every admin page and action validates `isAdmin()` server-side |
| RSVP | Party model | Families RSVP once with a code (not per-person passwords) |
| Styling | Plain CSS | Zero dependencies, themeable via custom properties. **No Tailwind CSS** — utility classes are hand-crafted in `globals.css`. |
| Deployment | Docker Compose | Isolated networks, multi-stage builds, health checks |
| Error handling | Per-route error.tsx | Granular error boundaries per route segment |
| Media auth | Session-based (not admin) | Any logged-in user can view media; login bg gets dedicated public endpoint |
| Media tabs | Database-driven + URL routing | Reuses guide `?tab=` pattern for consistency; slug-based loose coupling |
| Rate limiting | In-memory + Caddy | App-level for login protection, Caddy for IP-based defense. Configurable via admin dashboard. |
| Home page | ISR (revalidate: 60) | Zero personalization, safe to cache. All other pages are dynamic (session-dependent). |
| Video poster | ffmpeg + sharp pipeline | Auto-generates 1920x1080 WebP from first frame. Reuses existing thumbnail infrastructure. |
| RSVP deadline | Server-timezone comparison | `datetime-local` input parsed as server time (Pacific). Works because admin and server share timezone. |

## Database Migrations

**Migrations are manual operations.** They are never run automatically by `deploy.sh`, the webapp, or any startup script.

When schema changes require new columns or tables:
1. Write an idempotent migration script in `scripts/migrate-*.sh`
2. **Run it manually** on the production server before deploying: `./scripts/migrate-<name>.sh`
3. The script backs up the database, runs `ALTER TABLE`, and reports success

Like database backups, migrations are an explicit operator responsibility. The DDL in `schema.ts` uses `CREATE TABLE IF NOT EXISTS` — it creates new tables but **never alters existing ones**.

## Known Issues & Limitations

| Issue | Impact | Status |
|---|---|---|
| `prebuild-install@7.1.3` deprecated | Cosmetic npm warning during `npm install`. Transitive dependency of `better-sqlite3` — no action needed on our side. | Awaiting upstream migration in `better-sqlite3` |
| `postcss < 8.5.10` XSS vulnerability | Moderate severity — unescaped `</style>` in CSS Stringify output. Transitive dependency of `next@16.2.10`. Not exploitable in our deployment (no user-submitted CSS). | Awaiting Next.js upgrade to a version bundling postcss 8.5.10+. `npm audit fix --force` would downgrade to Next.js 9.x which is not viable. |
| Turbopack NFT trace warning during build | `media.ts` and `db.ts` use `process.cwd()` at module scope for `MEDIA_DIR` and `DB_PATH`. Turbopack's NFT trace cannot narrow the dependency set, producing a harmless warning. Build succeeds and output is correct. | **Do NOT "fix" this.** Previous attempts to use lazy getters (`getMediaDir()`) or `turbopackIgnore` comments did not resolve the warning and added unnecessary complexity. The warning is cosmetic — leave it as-is. |
