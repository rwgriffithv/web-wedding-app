# Wedding Web App

A production-ready wedding website built with Next.js 16, SQLite, and Docker. Features an admin dashboard for managing all content, guest authentication, party-based RSVP, and a full deployment pipeline via Caddy + Cloudflare Tunnel.

```text
┌─────────────────────────────────────────────────┐
│                    Guests                        │
│  ┌──────────┐  ┌──────────┐  ┌────────────────┐ │
│  │ Landing  │  │  Login   │  │  Party Code    │ │
│  │  Page    │  │(username │  │  (family login)│ │
│  │          │  │ /password)│  │                │ │
│  └──────────┘  └────┬─────┘  └───────┬────────┘ │
│                     │                │          │
│              ┌──────▼────────────────▼──────┐   │
│              │      Authenticated Pages     │   │
│              │  home | lodging | dress-code │   │
│              │  rsvp | media                │   │
│              └─────────────────────────────┘   │
└─────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────┐
│                     Admin                        │
│  site | parties | guests | lodging | dress-code │
│  rsvp | media                                    │
└─────────────────────────────────────────────────┘
```

---

## Features

| Feature | Description |
|---|---|
| **Landing Page** | Configurable title and background image with login form |
| **Home Page** | Wedding date, location, subtitle, optional background video |
| **Lodging** | Curated hotel/resort recommendations with images and links |
| **Dress Code** | Mood board with images and description text |
| **RSVP** | Party-based group RSVP with per-member responses, plus ones |
| **Media Gallery** | Photo and video sections (e.g. Engagement, Ceremony, Reception) |
| **Admin Dashboard** | Full CRUD for all content, parties, guests, and RSVP viewer |
| **Authentication** | Admin (username/password), Party (access code), Guest (shared view-only) |
| **Security** | IP banning, auto-ban on brute-force, configurable rate limits |
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
| **Lodging** | Add hotel/resort recommendations with photos and booking links |
| **Dress Code** | Upload mood board images |
| **Media** | Upload engagement photos, ceremony/reception galleries |
| **RSVP** | View all submitted responses in one place |

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
| Styling | Plain CSS with custom properties (no Tailwind, no CSS-in-JS) |

### Directory Structure

```text
src/
├── app/                    # Next.js App Router
│   ├── (main)/             # Authenticated public pages (home, lodging, dress-code, rsvp, media)
│   ├── admin/              # Admin dashboard (site, guests, parties, lodging, dress-code, rsvp, media)
│   ├── api/health/         # Health check endpoint
│   └── login/              # Login page and actions
├── components/             # Shared UI (header, navigation, logout-button)
├── lib/                    # Server-only utilities
│   ├── repository/         # Data access layer (one file per entity)
│   ├── auth.ts             # Session management, password hashing
│   ├── db.ts               # Database connection, migration, seed
│   ├── schema.ts           # DDL statements
│   └── config.ts           # Environment validation
├── app/globals.css         # Global styles (490 lines)
```

### Database

12 tables: `users`, `parties`, `guests`, `site_config`, `lodging_options`, `dress_code_images`, `rsvp_responses`, `media_items`, `media_tabs`, `schedule_items`, `banned_ips`, `rate_limit_violations`.

See [docs/architecture/database-layer.md](docs/architecture/database-layer.md) for the full schema.

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
| Unit tests | `npm run test:unit` | 383 tests (38 files) |
| E2E (parallel) | `npm run test:e2e:parallel` | 56 tests (13 specs) |
| E2E (serial) | `npm run test:e2e:serial` | 11 tests (2 specs) |
| All | `npm test` | 450 tests |

- Unit tests cover: auth, session revocation, db init, all repositories (guests, RSVP, lodging, dress code, media, site config, users, IP bans, sessions), all server actions (security, RSVP, help, media, lodging, users), components (header, navigation, RSVP form, media forms, cookie warning, char count, rate-limit cooldown), rate limiting, and more.
- E2E tests cover: login/logout, session expiry, session indicator, admin auth, admin CRUD (lodging, guests, media), admin security (rate limits, violations, IP banning, suspicious IPs), RSVP flows (party code login, submission, plus ones, deadline locking, view-only guest, invalid code), help/FAQ, guide tabs, media sections, health check.
- Serial E2E tests (rate limiting, session revocation) run separately with a fresh server to avoid interfering with parallel tests.

---

## Documentation

| Document | Contents |
|---|---|
| [Authentication](docs/features/authentication.md) | Three auth methods, session management, rate limiting |
| [IP Banning](docs/features/ip-banning.md) | IP banning, auto-ban, rate-limit refactoring |
| [Admin Dashboard](docs/features/admin-dashboard.md) | All admin pages and CRUD operations |
| [RSVP System](docs/features/rsvp.md) | Party-based RSVP, per-member submission |
| [Database Layer](docs/architecture/database-layer.md) | Schema, connection, migration, seed |
| [Architecture Overview](docs/architecture/overview.md) | Full system architecture and route map |
| [Project Structure](docs/architecture/project-structure.md) | Directory tree with annotations |
| [Deployment Pipeline](docs/architecture/deployment-pipeline.md) | Docker, Caddy, Cloudflare Tunnel |
