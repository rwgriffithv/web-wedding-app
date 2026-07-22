# Wedding Web App

A production-ready wedding website built with Next.js 16, SQLite, and Docker. Features an admin dashboard for managing all content, guest authentication, party-based RSVP, and a full deployment pipeline via Caddy + Cloudflare Tunnel.

```text
┌─────────────────────────────────────────────────────┐
│                      Guests                          │
│  ┌──────────┐  ┌──────────┐  ┌──────────────────┐  │
│  │ Landing  │  │  Login   │  │  Party Code      │  │
│  │  Page    │  │(username │  │  (family login)  │  │
│  │          │  │ /password)│  │                  │  │
│  └──────────┘  └────┬─────┘  └───────┬──────────┘  │
│                     │                │              │
│              ┌──────▼────────────────▼──────┐       │
│              │      Authenticated Pages     │       │
│              │  home | guide | rsvp | media │       │
│              │  help                        │       │
│              └─────────────────────────────┘       │
└─────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────┐
│                      Admin                           │
│  site | users | parties | guests | schedule         │
│  lodging | dress-code | rsvp | media | gifts        │
│  help | security                                    │
└─────────────────────────────────────────────────────┘
```

---

## Features

| Feature | Description |
|---|---|
| **Landing Page** | Configurable title and background image with login form |
| **Home Page** | Wedding date, location, subtitle, optional background video |
| **Schedule** | Event timeline with dates and descriptions |
| **Lodging** | Curated hotel/resort recommendations with images and links |
| **Dress Code** | Mood board with images and description text |
| **RSVP** | Party-based group RSVP with per-member responses, plus ones |
| **Media Gallery** | Photo and video sections (e.g. Engagement, Ceremony, Reception) |
| **Guide** | Tabbed guide with schedule, lodging, and dress code info |
| **Help / FAQ** | Guest questions and admin-managed FAQ |
| **Admin Dashboard** | Full CRUD for all content, parties, guests, and RSVP viewer |
| **Authentication** | Admin (username/password), Party (access code), Guest (shared view-only) |
| **Security** | IP banning, auto-ban on brute-force, configurable rate limits |
| **Page View Tracking** | Debounced view counts per authenticated page |
| **Health Check** | `/api/health` endpoint for Docker health checks and monitoring |

---

## Quick Start

```bash
# Prerequisites: Node.js 22, npm

# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env
# Edit .env with your settings (required: ADMIN_USERNAME, ADMIN_PASSWORD, SESSION_SECRET)

# 3. Seed the database with demo data
npm run db:seed

# 4. Start development server
npm run dev
# → http://localhost:3000
```

### Demo Credentials

| Role | Login Method | Credentials |
|---|---|---|
| **Admin** | Username & Password tab | `admin` / `admin` |
| **Party** | Party Code tab | `DEMO-1234` |
| **Guest** (view-only) | Username & Password tab | `guest` / `guest` |

---

## Key Commands

| Command | Purpose |
|---|---|
| `npm run dev` | Start dev server with hot reload |
| `npm run build` | Production build (verifies compilation) |
| `npm test` | Run all tests (unit + E2E) |
| `npm run test:e2e` | Run all E2E tests (parallel then serial) |
| `npm run typecheck` | TypeScript strict-mode check |
| `npm run lint` | ESLint (flat config) |
| `npm run db:seed` | Seed database with demo data |

---

## For Brides & Grooms: Launching Your Wedding Site

### 1. Set Up Your Environment

```bash
cp .env.example .env
```

Required variables in `.env`:

```env
# Your chosen admin credentials
ADMIN_USERNAME=your-name
ADMIN_PASSWORD=your-password

# Session encryption key (at least 32 characters, keep secret!)
SESSION_SECRET=a-long-unique-string
```

### 2. Configure the Site

After logging in as admin (`/admin`):

| Page | What to do |
|---|---|
| **Site Config** | Set landing title, background image, home page text, date, location, dress code description |
| **Parties** | Create party groups (households) with unique access codes |
| **Guests** | Add guests, assign them to parties, set RSVP permissions and +1 ability |
| **Schedule** | Build the event timeline |
| **Lodging** | Add hotel/resort recommendations with photos and booking links |
| **Dress Code** | Upload mood board images |
| **Media** | Upload engagement photos, ceremony/reception galleries |
| **RSVP** | View all submitted responses in one place |
| **Gifts** | Manage gift registry items |
| **Help** | Create FAQ entries for guests |

### 3. Share Access

- **Party codes** — Print on invitations. Each party uses one code to RSVP for all members. The party code is both the username and password for that party's login — this is by design, as guests receive codes via invitations and admins need visibility to manage delivery.
- **Guest account** — A shared view-only account (`guest`/`guest`) for browsing without RSVP.
- **Admin account** — Only you and your partner need this.

### 4. Deploy

See [docs/architecture/deployment-pipeline.md](docs/architecture/deployment-pipeline.md) for Docker + Cloudflare Tunnel deployment.

---

## Architecture

### Application Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack) |
| Language | TypeScript 5.4 (strict, no `any`) |
| Database | SQLite via better-sqlite3 (WAL mode) |
| Auth | Cookie-based HMAC-signed JSON sessions |
| Caching | `Cache-Control: no-store` on pages; `immutable` on media |
| Styling | Plain CSS with custom properties (no Tailwind, no CSS-in-JS) |

### Directory Structure

```text
src/
├── app/                    # Next.js App Router
│   ├── (main)/             # Authenticated public pages
│   │   ├── home/           #   Wedding date, location, subtitle
│   │   ├── guide/          #   Tabbed guide (schedule, dress-code, lodging, gifts)
│   │   ├── rsvp/           #   Party-based RSVP
│   │   ├── media/          #   Photo/video gallery
│   │   └── help/           #   FAQ and guest questions
│   ├── admin/              # Admin dashboard
│   │   ├── site/           #   Site config
│   │   ├── users/          #   User management
│   │   ├── parties/        #   Party management
│   │   ├── guests/         #   Guest management
│   │   ├── schedule/       #   Schedule editor
│   │   ├── lodging/        #   Lodging editor
│   │   ├── dress-code/     #   Dress code editor
│   │   ├── rsvp/           #   RSVP viewer
│   │   ├── media/          #   Media manager
│   │   ├── gifts/          #   Gift registry
│   │   ├── help/           #   FAQ management
│   │   └── security/       #   IP bans, rate limits
│   ├── api/                # API routes
│   │   ├── health/         #   Health check
│   │   ├── login-background/ # Background image
│   │   ├── media/          #   Media serving + list
│   │   └── upload/         #   File upload
│   └── login/              # Login page and actions
├── components/             # Shared UI components
├── lib/                    # Server-only utilities
│   ├── repository/         # Data access layer (12 modules)
│   ├── auth.ts             # Session management, password hashing
│   ├── constants.ts        # Shared constants (cookie keys, rate limit defaults)
│   ├── datetime.ts         # Date/time formatting helpers
│   ├── db.ts               # Database connection, migration, seed
│   ├── db-schema.ts        # DDL statements (14 tables)
│   ├── env.ts              # Environment validation
│   ├── form-data.ts        # Safe FormData extraction helpers
│   ├── http-status.ts      # HTTP status code constants
│   ├── ip.ts               # Client IP extraction from proxy headers
│   ├── localstorage-cache.ts # localStorage expiration cache
│   ├── logger.ts           # Rate-limited console wrapper
│   ├── media.ts            # Media directory config and paths
│   ├── media-types.ts      # MIME type detection and extension maps
│   ├── rate-limit.ts       # In-memory rate limiter
│   ├── session-revocation.ts # In-memory revocation maps
│   ├── site-config.ts      # DB key-value config schema
│   ├── thumbnail.ts        # Image/video thumbnail generation
│   ├── types.ts            # All TypeScript interfaces
│   └── upload-limits.ts    # Upload size limit constants
├── proxy.ts                # Next.js proxy (auth, caching, IP bans)
└── globals.css             # Global styles
```

### Database

14 tables: `users`, `parties`, `guests`, `site_config`, `lodging_options`, `dress_code_images`, `rsvp_responses`, `media_items`, `media_tabs`, `schedule_items`, `faq_items`, `questions`, `banned_ips`, `rate_limit_violations`.

See [docs/architecture/database-layer.md](docs/architecture/database-layer.md) for the full schema.

### Caching

The application uses two independent caching layers:

| Layer | Storage | Controlled by | Purpose |
|---|---|---|---|
| HTTP cache | Browser disk | `Cache-Control` header | `no-store` on pages forces server verification on every navigation |
| RSC cache | Browser memory | Next.js internals | Stale content only; no new data served to banned users |

API routes set their own headers: media files use `private, max-age=86400, immutable`; the login background uses `public, max-age=86400`.

See [docs/architecture/conventions.md](docs/architecture/conventions.md#http-cache-vs-rsc-cache) for the full explanation.

### Deployment

Three Docker containers over two isolated networks:

```
Internet → Cloudflare Tunnel → Caddy (TLS) → webapp (Next.js) → SQLite
```

See [docs/architecture/deployment-pipeline.md](docs/architecture/deployment-pipeline.md).

---

## Testing

| Suite | Command | Count |
|---|---|---|
| Unit tests | `npm run test:unit` | 511 tests (46 files) |
| E2E (parallel) | `npm run test:e2e:parallel` | 49 tests (15 specs) |
| E2E (serial) | `npm run test:e2e:serial` | 41 tests (7 specs) |
| All | `npm test` | 601 tests |

- Unit tests cover: auth, session revocation, db init, all repositories (guests, RSVP, lodging, dress code, media, site config, users, IP bans, FAQ, questions, schedule, parties), all server actions (security, RSVP, help, media, lodging, users, schedule), components (header, navigation, RSVP form, media forms, cookie warning, char count, rate-limit form), rate limiting, and more.
- E2E tests cover: login/logout, session expiry, session indicator, admin auth, admin CRUD (lodging, guests, media), admin security (rate limits, violations, IP banning, suspicious IPs), RSVP flows (party code login, submission, plus ones, deadline locking, view-only guest, invalid code), admin media rate limiting, admin RSVP rate limiting, admin help rate limiting, help/FAQ, guide tabs, media sections, health check, page view tracking.
- Serial E2E tests (rate limiting, session revocation, page view tracking, media/RSVP/help rate limit config) run separately with a fresh server to avoid interfering with parallel tests.

---

## Documentation

| Document | Contents |
|---|---|
| [Authentication](docs/features/authentication.md) | Three auth methods, session management, rate limiting |
| [IP Banning](docs/features/ip-banning.md) | IP banning, auto-ban, rate-limit refactoring |
| [Admin Dashboard](docs/features/admin-dashboard.md) | All admin pages and CRUD operations |
| [RSVP System](docs/features/rsvp.md) | Party-based RSVP, per-member submission |
| [Media Gallery](docs/features/media-gallery.md) | Gallery sections and media display |
| [Media](docs/features/media.md) | Media upload and management |
| [Guide](docs/features/guide.md) | Tabbed guide page |
| [Help](docs/features/help.md) | FAQ and guest questions |
| [Banner](docs/features/banner.md) | Banner text display |
| [Error Handling](docs/features/error-handling.md) | Error boundaries and handling |
| [Searchable Select](docs/features/searchable-select.md) | Searchable select component |
| [Database Layer](docs/architecture/database-layer.md) | Schema, connection, migration, seed |
| [Architecture Overview](docs/architecture/overview.md) | Full system architecture and route map |
| [Conventions](docs/architecture/conventions.md) | Code conventions, HTTP cache vs RSC cache |
| [Deployment Pipeline](docs/architecture/deployment-pipeline.md) | Docker, Caddy, Cloudflare Tunnel |
