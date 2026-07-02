# Architecture Overview

- **Date:** 2026-06-29
- **Scope:** Full-stack architecture of the web-starter-app project

## Design Philosophy

The project follows a **server-first architecture** built on Next.js 14 App Router. Rendering, data fetching, and mutations are handled on the server by default. Client Components are used only where browser APIs or interactivity are required, and they are pushed to leaf nodes in the component tree.

The deployment infrastructure separates application logic from infrastructure plumbing via two Git submodules:

- `agent-dev-env/` — Agentic development toolkit (devcontainer, skills, shared rules)
- `web-deploy-env/` — Deployment infrastructure (Docker, Caddy, deployment scripts)

This separation means improvements to infrastructure or agent tooling propagate to all downstream projects via a submodule update, without touching application code.

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

Three Docker services connected over isolated networks:
- **tunnel** — outbound-only Cloudflare Tunnel connection (frontend network only)
- **caddy** — reverse proxy, TLS termination, rate limiting (frontend + backend networks)
- **webapp** — Next.js application server, SQLite database (backend network only)

## Network Topology

| Network | Accessibility | Services |
|---|---|---|
| `frontend` | External | tunnel, caddy |
| `backend` | Internal (no external access) | webapp, caddy |

The `tunnel` service has no access to `backend`, ensuring the database is never directly reachable from the Cloudflare edge.

## Key Architectural Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Data fetching | Server Components | Eliminates client-server waterfall, reduces bundle size |
| Mutations | Server Actions | Type-safe, colocated with routes, no API boilerplate |
| Database | SQLite via better-sqlite3 | Zero-config, file-based, no external server process |
| Auth | Cookie-based session (base64 JSON) | Simple demo auth; production should replace with OAuth/SAML |
| Deployment | Multi-stage Docker | Dev dependencies stripped for lean production images |
| TLS | Cloudflare Origin CA | Required when behind Cloudflare Tunnel (Let's Encrypt HTTP-01 cannot reach origin) |

## Technology Stack

| Layer | Technology | Purpose |
|---|---|---|
| Framework | Next.js 14 (App Router) | Server-first React, file-based routing |
| Language | TypeScript 5.4 (strict) | Type safety with no `any` |
| Database | better-sqlite3 (WAL mode) | Synchronous SQLite with concurrent read performance |
| Styling | Plain CSS (custom properties) | Zero-dependency, themeable via `:root` variables |
| Proxy | Caddy 2.11 (alpine) | TLS, rate limiting, security headers |
| Tunnel | cloudflared 2026.6.1 | Outbound-only Cloudflare Tunnel |
| Development | OpenCode + Ollama | AI-assisted coding with reusable skills |

## Development Workflow

### 1. Host Setup (one-time)

Run the setup orchestrator from the project root. This initializes submodules, configures the host, and bootstraps both toolkits:

```bash
./setup.sh
```

This delegates to each submodule's `setup-host.sh` and `bootstrap.sh` scripts in dependency order:
1. **`web-deploy-env`** — Pulls Docker images (`caddy`, `cloudflared`), builds `web-deploy-base` image, symlinks templates and scripts
2. **`agent-dev-env`** — Installs `curl`, `git`, `zstd`, installs Ollama, pulls `qwen2.5-coder` models, links devcontainer and skills

Both `setup-host.sh` scripts have a devcontainer guard — they abort if run inside a devcontainer, since host-level operations (Docker, Ollama) belong on the host.

### 2. Open in Devcontainer

After host setup, open the project in VS Code and reopen in the devcontainer. The devcontainer config is at `.devcontainer/base/devcontainer.json` (symlinked from `agent-dev-env/.devcontainer/base/`).

The devcontainer:

- Inherits from the `web-deploy-base` image (Node.js 22, system libs)
- Installs additional packages: Playwright, SQLite CLI, browser dependencies
- Installs OpenCode CLI globally (`opencode-ai`)
- Runs `configure.sh` on creation to install OpenCode config and verify Ollama connectivity

The `configure.sh` script validates:
- Ollama is reachable at `host.docker.internal:11434`
- `BRAVE_API_KEY` is set for web search
- Skills symlink exists under `.opencode/skills`
- Project rules and base env rules are present

### 3. Start Development Server

From inside the devcontainer:

```bash
npm run dev
```

This starts Next.js on port 3000. The dev server supports hot module replacement and displays errors in-browser.

Before first launch, seed the database with demo data:

```bash
npm run db:seed   # Creates tables if needed, then inserts demo data (skips if already populated)
```

### 4. Run Tests

The project includes both unit tests (Vitest) and end-to-end tests (Playwright).

**Unit tests** cover library code and components:

```bash
npm test             # vitest run — single run
npm run test:watch   # vitest — watch mode
```

Test files are colocated with source code using the `.test.ts` / `.test.tsx` naming convention. There are currently 9 unit tests across 3 files:

| Test File | Tests | Coverage |
|---|---|---|
| `src/lib/db.test.ts` | 4 | Database schema, constraints, validation |
| `src/lib/auth.test.ts` | 2 | Session creation and encoding |
| `src/components/header.test.tsx` | 3 | Component rendering and props |

**End-to-end tests** verify full-page flows in a headless Chromium browser:

```bash
npm run test:e2e      # playwright test — headless
npm run test:e2e:ui   # playwright test --ui — interactive UI mode
```

E2E tests are in `e2e/` directory. The Playwright config automatically starts the dev server via `webServer` config. There are currently 8 E2E tests across 3 files:

| Test File | Tests | Coverage |
|---|---|---|
| `e2e/home.spec.ts` | 3 | Page load, navigation links, header rendering |
| `e2e/health.spec.ts` | 1 | API health endpoint response |
| `e2e/admin-auth.spec.ts` | 4 | Auth redirect, login flow, credentials validation, dashboard rendering |

Both test suites are designed to be run inside the devcontainer, which has Chromium pre-installed.

### 5. Build and Type Check

The production build can be run inside the devcontainer to verify compilation before deployment:

```bash
npm run build       # Next.js production build (compiles all routes)
npm run typecheck   # npx tsc --noEmit — standalone type check
npm run lint        # ESLint via next lint
```

The build pipeline compiles all routes, resolves imports, and generates the `.next` output directory. The typecheck step validates TypeScript strict mode independently of the Next.js build.

### 6. Deploy (host only, not in devcontainer)

Deployment must run on the host machine, not inside the devcontainer. The deploy script enforces this with a devcontainer guard.

See [Deployment Pipeline](deployment-pipeline.md) for full details.

### Development Cycle Summary

```
Host Machine                         Devcontainer (Docker)
────────────                         ────────────────────
./setup.sh (one-time)
    │
    ▼
Open in VS Code → Reopen in Devcontainer
                                        │
                                        ▼
                                    npm run db:seed
                                    npm run test       ← new
                                    npm run dev        ← iterate
                                    npm run build      ← verify
                                    npm run typecheck  ← verify
                                    npm run test:e2e   ← verify
                                        │
                                        ▼
Host: ./deploy.sh (production deploy)
```

```
Host Machine                         Devcontainer (Docker)
────────────                         ────────────────────
./setup.sh (one-time)
    │
    ▼
Open in VS Code → Reopen in Devcontainer
                                        │
                                        ▼
                                    npm run db:seed
                                    npm run dev        ← iterate
                                    npm run build      ← verify
                                    npm run typecheck  ← verify
                                        │
                                        ▼
Host: ./deploy.sh (production deploy)
```

## Route Map

| Route | Type | Purpose |
|---|---|---|
| `/` | Static | Landing page with feature cards |
| `/features` | Static | Full feature listing |
| `/about` | Static | Architecture and stack description |
| `/login` | Dynamic | Authentication form |
| `/admin` | Dynamic | Admin dashboard (protected) |
| `/admin/users` | Dynamic | User management (protected) |
| `/admin/settings` | Dynamic | App configuration display (protected) |
| `/api/health` | Static | Database-backed health check |
| `404` | Static | Custom not-found page |
| `error` | Client | Error boundary with retry |
