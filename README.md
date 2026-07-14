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
| `npm test` | Run unit tests (Vitest) |
| `npm run test:e2e` | Run E2E tests (Playwright, headless) |
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

7 tables: `parties`, `guests`, `site_config`, `lodging_options`, `dress_code_images`, `rsvp_responses`, `media_items`.

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
| Unit tests | `npm test` | 37 tests (10 files) |
| E2E tests | `npm run test:e2e` | 17 tests (6 specs) |

- Unit tests cover: auth, db init, all repositories (guests, RSVP, lodging, dress code, media, site config), header, navigation.
- E2E tests cover: landing page, home page, admin auth, admin CRUD (lodging, guests, media), RSVP flows (party code login, submission, plus ones, view-only guest, invalid code), health check.

---

## Documentation

| Document | Contents |
|---|---|
| [Authentication](docs/features/authentication.md) | Three auth methods, session management, rate limiting |
| [Admin Dashboard](docs/features/admin-dashboard.md) | All admin pages and CRUD operations |
| [RSVP System](docs/features/rsvp.md) | Party-based RSVP, per-member submission |
| [Database Layer](docs/architecture/database-layer.md) | Schema, connection, migration, seed |
| [Architecture Overview](docs/architecture/overview.md) | Full system architecture and route map |
| [Project Structure](docs/architecture/project-structure.md) | Directory tree with annotations |
| [Deployment Pipeline](docs/architecture/deployment-pipeline.md) | Docker, Caddy, Cloudflare Tunnel |
