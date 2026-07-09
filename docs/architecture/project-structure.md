# Project Structure

- **Date:** 2026-07-03
- **Scope:** Directory-level overview with key file annotations

## Directory Tree

```
web-wedding-app/
├── .devcontainer/          # Devcontainer config (symlinked from agent-dev-env)
├── .opencode/              # OpenCode agent runtime config and skills
├── agent-dev-env/          # Git submodule: agentic development toolkit
├── web-deploy-env/         # Git submodule: deployment infrastructure
├── data/                   # Docker volume: SQLite + uploaded media (gitignored)
│   ├── sqlite/             # Database files (prod.db, dev.db)
│   └── media/              # Uploaded images and videos
├── backups/                # Backup archives (outside Docker volume, gitignored)
├── public/                 # Static assets
├── scripts/
│   └── db-seed.ts          # Database seeding with demo data
├── src/
│   ├── app/                # Next.js App Router (pages, layouts, API)
│   ├── components/          # Shared UI (header, navigation, logout-button, file-upload)
│   └── lib/                 # Server-only utilities
│       ├── repository/      # Data access layer (7 entity files)
│       ├── auth.ts          # Session management, password hashing
│       ├── db.ts            # DB connection, migration, seed
│       ├── media.ts         # Media directory config (self-hosted uploads)
│       ├── schema.ts        # DDL statements (7 tables)
│       └── config.ts        # Environment validation
├── e2e/                     # Playwright E2E tests (6 specs)
├── docs/                    # Architecture and feature documentation
├── .env                     # Environment variables (gitignored)
├── .env.example             # Environment template
├── vitest.config.ts         # Vitest configuration
├── playwright.config.ts     # Playwright configuration
├── next.config.mjs          # Next.js configuration
├── tsconfig.json            # TypeScript strict-mode
├── package.json             # Dependencies and scripts
├── AGENTS.md                # Project agent instructions
└── README.md
```

## Key Directories

| Directory | Purpose |
|---|---|
| `src/app/` | Next.js App Router — 14 route groups, 47 files |
| `src/app/(main)/` | Authenticated guest pages (home, lodging, dress-code, rsvp, media) |
| `src/app/admin/` | Admin dashboard (site, parties, guests, lodging, dress-code, rsvp, media) |
| `src/app/login/` | Login page with dual-tab form |
| `src/components/` | Reusable UI — header, navigation, logout button |
| `src/lib/repository/` | Data access — one file per entity (party, guests, rsvp, site-config, lodging, dress-code, media) |
| `scripts/` | Database seed script (`npm run db:seed`) |
| `docs/architecture/` | ADRs and design records |
| `docs/features/` | Feature specifications |
| `e2e/` | Playwright specs |

## App Router Map

```
src/app/
├── page.tsx                         # Landing page (title + login form)
├── layout.tsx                       # Root layout (fonts, metadata)
├── globals.css                      # Global styles
├── error.tsx                        # Error boundary
├── not-found.tsx                    # 404 page
│
├── (main)/
│   ├── layout.tsx                   # Auth guard + navigation
│   ├── home/page.tsx                # Wedding home (date, location)
│   ├── lodging/page.tsx             # Hotel recommendations
│   ├── dress-code/page.tsx          # Mood board
│   ├── rsvp/
│   │   ├── page.tsx                 # Party-aware RSVP
│   │   ├── rsvp-form.tsx            # Per-member form
│   │   └── actions.ts               # Submit server action
│   └── media/
│       ├── page.tsx                 # Gallery page
│       └── media-gallery.tsx        # Client gallery component
│
├── admin/
│   ├── layout.tsx                   # Admin guard + sidebar
│   ├── loading.tsx                  # Loading state
│   ├── page.tsx                     # Dashboard (stats + RSVP table)
│   ├── site/                        # Site config editor
│   ├── parties/                     # Party CRUD + code generation
│   ├── guests/                      # Guest CRUD with party assignment
│   ├── lodging/                     # Lodging CRUD
│   ├── dress-code/                  # Dress code image CRUD
│   ├── rsvp/                        # RSVP response viewer
│   └── media/                       # Media gallery CRUD
│
├── login/
│   ├── page.tsx                     # Login page
│   ├── login-form.tsx               # Dual-tab form
│   └── actions.ts                   # Login server actions
│
└── api/
    ├── health/route.ts              # Health check endpoint
    ├── upload/route.ts              # File upload (admin-only, POST)
    └── media/[filename]/route.ts    # File serving (public, GET)
```

## Symlink Map

Infrastructure files are symlinked from `web-deploy-env/`:

| Root File | Symlink Target |
|---|---|
| `Dockerfile` | `web-deploy-env/templates/Dockerfile` |
| `.dockerignore` | `web-deploy-env/templates/.dockerignore` |
| `docker-compose.yml` | `web-deploy-env/templates/docker-compose.yml` |
| `Caddyfile` | `web-deploy-env/templates/Caddyfile` |
| `deploy.sh` | `web-deploy-env/scripts/deploy.sh` |
| `down.sh` | `web-deploy-env/scripts/down.sh` |
| `backup.sh` | `web-deploy-env/scripts/backup.sh` |
