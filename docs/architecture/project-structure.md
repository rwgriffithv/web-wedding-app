# Project Structure

- **Date:** 2026-06-30
- **Scope:** Directory-level overview with key file annotations

## Directory Tree

```
web-starter-app/
├── .devcontainer/          # Devcontainer config (symlinked from agent-dev-env)
├── .opencode/              # OpenCode agent runtime config and skills
├── agent-dev-env/          # Git submodule: agentic development toolkit
├── web-deploy-env/         # Git submodule: deployment infrastructure (Docker, Caddy, cloudflared)
├── data/                   # Persistent storage: SQLite DB, backups (most is gitignored)
├── public/                 # Static assets served by Next.js
├── scripts/                # Database seed scripts
├── src/                    # Application source code (Next.js App Router)
│   ├── app/                # Pages, layouts, API routes
│   ├── components/         # Reusable UI components
│   ├── lib/                # Shared utilities (db, auth)
│   └── test/               # Vitest setup
├── docs/                   # Architecture and feature documentation
├── e2e/                    # Playwright end-to-end tests
├── .env                    # Environment variables (gitignored)
├── .dockerignore           # Symlink → web-deploy-env/templates/.dockerignore
├── Dockerfile              # Symlink → web-deploy-env/templates/Dockerfile
├── docker-compose.yml      # Symlink → web-deploy-env/templates/
├── Caddyfile               # Symlink → web-deploy-env/templates/
├── deploy.sh               # Symlink → web-deploy-env/scripts/
├── down.sh                 # Symlink → web-deploy-env/scripts/
├── backup.sh               # Symlink → web-deploy-env/scripts/
├── setup.sh                # Submodule initialization orchestrator
├── vitest.config.ts        # Vitest configuration
├── playwright.config.ts    # Playwright configuration
├── next.config.mjs         # Next.js configuration
├── tsconfig.json           # TypeScript strict-mode config
├── package.json            # Dependencies and scripts
├── AGENTS.md               # Project agent instructions
├── LICENSE
└── README.md
```

## Key Directories

| Directory | Purpose |
|---|---|
| `src/app/` | Next.js App Router pages and API routes (`layout.tsx`, `page.tsx`, `route.ts`) |
| `src/components/` | Reusable client/server components with colocated `*.test.tsx` unit tests |
| `src/lib/` | Server-only utilities (`db.ts`, `auth.ts`) with colocated unit tests |
| `scripts/` | Database seed script (`db-seed.ts`) run via `npm run db:seed` |
| `docs/architecture/` | ADRs and design records for architectural decisions |
| `docs/features/` | Feature specifications (auth, admin, health, error handling) |
| `e2e/` | Playwright E2E specs (`*.spec.ts`) |
| `data/` | SQLite databases and backup archives (most gitignored) |

## Symlink Map

Root-level infrastructure files are symlinks into `web-deploy-env/`:

| Root File | Symlink Target |
|---|---|
| `Dockerfile` | `web-deploy-env/templates/Dockerfile` |
| `.dockerignore` | `web-deploy-env/templates/.dockerignore` |
| `docker-compose.yml` | `web-deploy-env/templates/docker-compose.yml` |
| `Caddyfile` | `web-deploy-env/templates/Caddyfile` |
| `deploy.sh` | `web-deploy-env/scripts/deploy.sh` |
| `down.sh` | `web-deploy-env/scripts/down.sh` |
| `backup.sh` | `web-deploy-env/scripts/backup.sh` |

The `Dockerfile` uses Docker `ARG` defaults instead of template processing.
