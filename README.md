# Web Starter App

A production-ready Next.js starter application demonstrating the integration of two infrastructure toolkits as Git submodules:

- **[`agent-dev-env`](agent-dev-env/)** — Agentic development environment (Dev Container, skills, shared rules)
- **[`web-deploy-env`](web-deploy-env/)** — Deployment infrastructure (Docker, Caddy, Cloudflare Tunnel, SQLite)

Designed to be forked. The starter gives you a working Next.js 14 app with admin dashboard, SQLite database, authentication, and a complete Docker-based deployment pipeline out of the box.

---

## What You Get

| Layer | Technology | Provided By |
|---|---|---|
| **Application** | Next.js 14 (App Router), TypeScript strict | Parent project |
| **Database** | SQLite via better-sqlite3 (WAL mode) | Parent project |
| **Auth** | Cookie-based demo session (shared `ADMIN_PASSWORD`) | Parent project |
| **Development** | Dev Container, Playwright, Vitest, agent skills | `agent-dev-env` |
| **Deployment** | Docker Compose, Caddy, Cloudflare Tunnel, backups | `web-deploy-env` |

---

## Directory Structure

```text
web-starter-app/
├── agent-dev-env/            # Git submodule — agentic development toolkit
├── web-deploy-env/           # Git submodule — deployment infrastructure
│
├── src/                      # Application source (Next.js App Router)
│   ├── app/                  # Pages, layouts, API routes
│   ├── components/           # Reusable UI components
│   └── lib/                  # Shared utilities (db, auth)
│
├── scripts/                  # Utility scripts (e.g. database seeding)
├── docs/                     # Architecture and feature documentation
├── e2e/                      # Playwright end-to-end tests
├── data/                     # Persistent storage (SQLite, backups)
│
├── .dockerignore             # Symlink → web-deploy-env/templates/
├── Dockerfile                # Symlink → web-deploy-env/templates/
├── docker-compose.yml        # Symlink → web-deploy-env/templates/
├── Caddyfile                 # Symlink → web-deploy-env/templates/
├── deploy.sh                 # Symlink → web-deploy-env/scripts/
├── down.sh                   # Symlink → web-deploy-env/scripts/
├── backup.sh                 # Symlink → web-deploy-env/scripts/
│
├── package.json
├── AGENTS.md                 # Project-specific agent context
├── rules/                    # Project-specific rules
└── README.md
```

---

## Setup

```bash
# 1. Clone with submodules
git clone <repo-url> && cd web-starter-app
git submodule update --init --recursive

# 2. Bootstrap both toolkits (run on host, not in devcontainer)
./agent-dev-env/scripts/setup-host.sh
./agent-dev-env/scripts/bootstrap.sh
./web-deploy-env/scripts/setup-host.sh
./web-deploy-env/scripts/bootstrap.sh

# 3. Open in VS Code → Reopen in Dev Container
# 4. Inside the devcontainer, seed the database:
npm run db:seed

# 5. Start developing
npm run dev
```

---

## Development

### Quick Start

```bash
npm run dev        # Next.js dev server (port 3000, HMR)
npm test           # Vitest unit tests
npm run test:e2e   # Playwright headless E2E tests
```

### Key Commands

| Command | Purpose |
|---|---|
| `npm run dev` | Start dev server with hot reload |
| `npm run build` | Production build |
| `npm test` | Run unit tests (Vitest) |
| `npm run test:e2e` | Run E2E tests (Playwright, headless) |
| `npm run typecheck` | TypeScript strict-mode check |
| `npm run lint` | ESLint via next lint |
| `npm run db:seed` | Insert demo data |
| `./deploy.sh` | Build and deploy via Docker |
| `./down.sh` | Stop all services |
| `./backup.sh` | Backup database |

---

## Architecture

### Application

A standard Next.js 14 App Router project with a public site and an admin dashboard. Authentication uses a minimal cookie-based session with a shared `ADMIN_PASSWORD` env var — intentionally simple for demo purposes. See [docs/features/authentication.md](docs/features/authentication.md) for details and swap recommendations.

### Deployment

Three Docker containers connected over two isolated networks:

```
                     Cloudflare Edge
                           |
                     Cloudflare Tunnel
                           |
                     ┌─────┘
               [frontend network]
                     |
           Caddy (security gateway)
                     |
               [backend network] (internal, no internet)
                     |
          webapp (Next.js on :3000)
                     |
                SQLite (/app/data)
```

- **tunnel** — Outbound-only Cloudflare connection (no public IP needed)
- **caddy** — Reverse proxy, security headers, network isolation
- **webapp** — Application server, isolated from the internet

See [web-deploy-env/README.md](web-deploy-env/README.md) for the full deployment architecture.

---

## Customizing for Production

This starter is designed to be forked. To make it your own:

1. **Replace the app** — Edit `src/` with your application code.
2. **Set your domain** — Add `DOMAIN` and `TUNNEL_TOKEN` to `.env`.
3. **Secure auth** — Replace the demo auth with Auth.js, Lucia, or signed JWTs.
4. **Create a Cloudflare tunnel** — Point it to `http://caddy:80`.
5. **Deploy** — Run `./deploy.sh` on your host machine.

See the deployment checklist in [web-deploy-env/README.md](web-deploy-env/README.md#deployment-checklist).

---

## Design Philosophy

This project separates concerns across three layers:

- **`web-starter-app`** — Owns the application code, business logic, and database schema.
- **`agent-dev-env`** — Owns the development environment and reusable agent capabilities.
- **`web-deploy-env`** — Owns the deployment infrastructure and operational runbooks.

Improvements to the toolkits propagate to all downstream projects via `git submodule update --remote`. The parent project never modifies the submodules — it customizes through `rules/`, `AGENTS.md`, and its own `package.json`.

---

## Documentation

- [docs/architecture/](docs/architecture/) — Architecture decision records and design docs
- [docs/features/](docs/features/) — Feature specifications
- [agent-dev-env/README.md](agent-dev-env/README.md) — Development toolkit reference
- [web-deploy-env/docs/](web-deploy-env/docs/) — Deployment guides and runbooks
