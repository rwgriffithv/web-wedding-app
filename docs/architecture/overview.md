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
                           │  │ proxy.ts       │  │
                           │  │ (cookie clear, │  │
                           │  │  revocation)   │  │
                           │  ├────────────────┤  │
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
| `/` | Dynamic | `requireSessionOrRedirect()` | Root router — redirects to `/home` |
| `/login` | Dynamic | `requireSession()` | Authentication (credentials or party code) |
| `/(main)/home` | Dynamic | `requireSessionOrRedirect()` | Wedding home with countdown timer |
| `/(main)/lodging` | Dynamic | `requireSessionOrRedirect()` | Hotel/resort recommendations |
| `/(main)/dress-code` | Dynamic | `requireSessionOrRedirect()` | Dress code mood board |
| `/(main)/rsvp` | Dynamic | `requireSessionOrRedirect()` | Party-based RSVP with per-member forms |
| `/(main)/media` | Dynamic | `requireSessionOrRedirect()` | Photo/video gallery with tab routing |
| `/(main)/schedule` | Dynamic | `requireSessionOrRedirect()` | Wedding day timeline |
| `/admin` | Dynamic | `requireSessionOrRedirect({ type: "admin" })` | Dashboard with stats and RSVP table |
| `/admin/users` | Dynamic | `requireSessionOrRedirect({ type: "admin" })` | User management (admin, viewer, party) |
| `/admin/guests` | Dynamic | `requireSessionOrRedirect({ type: "admin" })` | Guest CRUD with party assignment |
| `/admin/site` | Dynamic | `requireSessionOrRedirect({ type: "admin" })` | Site configuration editor |
| `/admin/lodging` | Dynamic | `requireSessionOrRedirect({ type: "admin" })` | Lodging recommendations CRUD |
| `/admin/dress-code` | Dynamic | `requireSessionOrRedirect({ type: "admin" })` | Dress code image management |
| `/admin/rsvp` | Dynamic | `requireSessionOrRedirect({ type: "admin" })` | RSVP response viewer (sortable table) |
| `/admin/media` | Dynamic | `requireSessionOrRedirect({ type: "admin" })` | Media gallery CRUD |
| `/admin/schedule` | Dynamic | `requireSessionOrRedirect({ type: "admin" })` | Wedding day schedule CRUD |
| `/admin/security` | Dynamic | `requireSessionOrRedirect({ type: "admin" })` | IP banning, auto-ban settings, rate limit config |
| `/api/health` | Static | None | Health check endpoint |
| `/api/upload` | Dynamic | `requireAdminSessionOrNull()` | File upload (multipart) |
| `/api/media/[...path]` | Dynamic | `requireSession()` | File serving (any logged-in user) |
| `/api/media/list` | Dynamic | `requireAdminSessionOrNull()` | Directory listing for file browser |
| `/api/login-background` | Static | None | Login background image (public) |

All routes are also checked by `proxy.ts` before rendering — expired, tampered, or revoked session cookies are cleared automatically.

## Authentication & Authorization

Three session types, each with a different access scope:

| Session Type | Created By | Access |
|---|---|---|
| `admin` | Username/password login | All routes |
| `party` | Party code login | `/(main)/*` + RSVP for party members |
| `viewer` | Username/password login | `/(main)/*` only |

### Auth Function Naming Convention

All auth functions follow a strict prefix convention that communicates the validation layer and side effects:

| Prefix | Meaning | Examples |
|---|---|---|
| `verify` | Crypto/integrity check (pure, no DB) | `verifyToken()`, `verifyTokenInCookie()`, `verifyPassword()` |
| `validate` | Business rule check (reads DB) | `validateSessionInDb()` |
| `require` | Gatekeeper (redirects or returns null) | `requireSessionOrRedirect()`, `requireAdminSessionOrNull()` |

Each layer adds checks: `verify` → crypto only, `validate` → DB truth, `require` → rejects on failure. See [authentication.md](../features/authentication.md#auth-function-naming-convention) for the full convention and call chain.

### Cookie Architecture

Two categories of cookies serve different purposes:

**Session cookie (`session`)** — Set and read by the server. HTTP-only, HMAC-signed JSON containing `{userId, type, partyId?, pwChangedAt?}`. Uses four-tier validation: proxy (crypto + revocation via `verifyToken()`), fast path (`verifyTokenInCookie()` — crypto-only, no DB) for page loads, revocation check (in-memory maps via `isSessionRevoked()`), mutation path (`validateSessionInDb()` — DB check) for state-changing actions. This is the only cookie the server uses for authentication.

**Rate-limit cookies (`rl_until`, `rl_r_until`, `rl_q_until`)** — Set and read by the client only. Created from `cooldownUntil` timestamps returned in server responses. Never read by the server. These are UX helpers that provide pre-submit guards (block form before server call) and reload persistence (restore cooldown timer after page refresh). They have no security function — the server's in-memory rate limiter enforces limits regardless of cookies.

### Session Revocation

When an admin changes a user's password or bans an IP, active sessions are immediately invalidated via in-memory caches. The proxy (`proxy.ts`) checks these caches on every page request via `verifyToken()` + `isSessionRevoked()` and clears the cookie for revoked sessions. Server actions check them via `requireAdminSessionOrNull()`. This eliminates the window where a user could continue using a stale session after a password change or IP ban. See [authentication.md](../features/authentication.md#session-revocation) for the full revocation architecture.

### Protection Layers

Requests pass through multiple protection layers:

1. **Cloudflare Edge** — TLS, DDoS mitigation, bot detection
2. **Caddy** — Connection-level rate limiting, security headers
3. **proxy.ts** — Session cookie: crypto check + revocation check; clears cookie for invalid/revoked sessions
4. **Server Actions** — IP ban check → in-memory rate limiter → auto-ban → authentication → authorization
5. **SQLite** — Parameterized queries, WAL mode, foreign keys

The server enforces the same protection for UI clients (browsers) and non-UI clients (curl, scripts, bots). Rate-limit cookies are a UX convenience for browsers; the server's rate limiter is the actual enforcement.

Auth is enforced at the layout level (`requireSessionOrRedirect()` guard) and in every Server Action (`requireAdminSessionOrNull()` / `validateSessionInDb()`). `SafeUser` type (`Omit<User, "password">`) is returned by all repository functions except `getUserWithPassword` and `getPartyUserWithPassword`. See [authentication.md](../features/authentication.md) for the full cookie architecture, session revocation, client vs server responsibilities, and protection details.

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
| Testing | Vitest + Playwright | 340 unit tests + 68 E2E specs (57 parallel + 11 serial) |
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
│   │   └── layout.tsx            # Auth guard (requireSessionOrRedirect) + bottom nav
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
│   │   ├── security/             # IP banning, auto-ban, rate limit config
│   │   └── layout.tsx            # Admin guard (requireSessionOrRedirect({ type: "admin" })) + responsive sidebar
│   ├── login/                    # Login page + actions
│   ├── api/health/route.ts       # Health check
│   ├── api/upload/route.ts       # File upload (admin)
│   ├── api/media/[...path]/      # File serving (session auth via requireSession)
│   ├── api/media/list/route.ts   # Directory listing (admin)
│   ├── api/login-background/     # Login bg image (public)
│   └── (page.tsx, layout.tsx, error.tsx, not-found.tsx)
├── proxy.ts                      # Cookie-clearing proxy — runs before page renders, checks revocation
├── components/                   # Shared UI (6 client components)
│   ├── searchable-select.tsx     # WAI-ARIA combobox
│   ├── countdown-timer.tsx       # T-XYZ / T+XYZ timer
│   ├── file-upload.tsx           # Drag-and-drop upload
│   ├── file-browser.tsx          # Text-based file explorer
│   ├── logout-button.tsx         # Logout form wrapper
│   ├── cookie-block-warning.tsx  # Client-side cookie blocking detection
│   └── rate-limit-form/          # Reusable rate limit config form
├── lib/                          # Server-only utilities
│   ├── repository/               # Data access (12 entity files)
│   ├── types.ts                  # All interfaces + SafeUser
│   ├── auth.ts                   # Session create/destroy, verifyToken, verifyTokenInCookie, requireSessionOrRedirect, requireSession, requireAdminSessionOrNull, validateSessionInDb, password hash/verify
│   ├── session-revocation.ts     # In-memory revocation maps (password changes + IP bans)
│   ├── db.ts                     # Connection + DDL + seed
│   ├── schema.ts                 # DDL (12 tables)
│   ├── config.ts                 # Env validation
│   ├── form-data.ts              # Safe FormData extraction + validateMediaUrl
│   ├── ip.ts                     # getClientIp() — IP extraction from proxy headers
│   ├── media.ts                  # Media directory config
│   └── rate-limit.ts             # In-memory rate limiter + getRateLimitConfig()
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
| Auth | HMAC-signed JSON cookie + four-tier validation | Simple, secure (signed). Proxy: crypto + revocation + cookie clear. Fast path: crypto-only for page loads (0 DB queries). Revocation: in-memory maps for immediate invalidation. Mutation path: validates `pwChangedAt` against DB on writes only. |
| Session revocation | In-memory maps + proxy | Immediate invalidation on password change or IP ban. Proxy clears cookie before page renders. Maps reset on server restart — intentional (expired sessions already handled by `exp` field). |
| Access control | Layout-level guards + server actions | Every admin page and action validates session server-side via `requireSessionOrRedirect()` / `requireAdminSessionOrNull()` |
| RSVP | Party model | Families RSVP once with a code (not per-person passwords) |
| Styling | Plain CSS | Zero dependencies, themeable via custom properties. **No Tailwind CSS** — utility classes are hand-crafted in `globals.css`. |
| Deployment | Docker Compose | Isolated networks, multi-stage builds, health checks |
| Error handling | Per-route error.tsx | Granular error boundaries per route segment |
| Media auth | Session-based (not admin) | Any logged-in user can view media; login bg gets dedicated public endpoint |
| Media tabs | Database-driven + URL routing | Reuses guide `?tab=` pattern for consistency; slug-based loose coupling |
| Rate limiting | In-memory + SQLite violations + client cookies | Server enforces per-key rate limits and auto-ban; client creates cookies from response timestamps for UX (pre-submit guard, reload persistence). Cookies are never read server-side — the rate limiter is the source of truth. |
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
