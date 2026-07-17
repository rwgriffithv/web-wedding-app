# Project Agent Instructions

## Project Purpose
A production-ready Next.js starter web application with admin dashboard, SQLite database, and Docker-based deployment via Cloudflare Tunnel + Caddy.

## Architecture
- **Framework**: Next.js 16 (App Router) — server-first by default
- **Language**: TypeScript (strict mode), no `any` allowed
- **Database**: SQLite via better-sqlite3 (WAL mode), server-only access
- **Auth**: Cookie-based session (HMAC-signed JSON for demo)
- **Security**: IP banning, auto-ban on rate-limit violations, configurable rate limits
- **Lint**: ESLint 9 with flat config (`eslint.config.js`)
- **Deployment**: Multi-stage Docker → Caddy reverse proxy → Cloudflare Tunnel

## Directory Structure
- `src/app/` — App Router pages and API routes
- `src/lib/` — Shared utilities (db, auth)
- `src/components/` — Reusable UI components
- `scripts/` — Utility scripts (e.g. database seeding)
- `data/` — SQLite database (gitignored)
- `Dockerfile` — Symlinked from web-deploy-env template (multi-stage build)
- `.dockerignore` — Symlinked from web-deploy-env template (reduces build context)

## Conventions
- Server Actions via `"use server"` in dedicated files (`actions.ts`)
- Structured return types `{ success, data?, error? }` from actions
- SQLite queries return typed interfaces from `src/lib/db.ts`
- Admin routes protected via `requireAdminSessionOrNull()` check in layout
- No Client Components unless interactivity requires it

## Testing

**Always use `npm run test` to verify changes.** It runs all test suites sequentially with isolated servers:

1. `test:unit` — Vitest unit tests (fast, no server)
2. `test:e2e:parallel` — Playwright parallel E2E tests (fresh server)
3. `test:e2e:serial` — Playwright serial E2E tests (fresh server, modifies rate-limit config)

Each E2E suite gets its own server build + seed, so rate-limit tests in the serial suite don't interfere with parallel tests.

| Command | What it runs |
|---|---|
| `npm run test` | **All tests** — unit + parallel E2E + serial E2E |
| `npm run test:check` | Typecheck + lint + all tests (full CI) |
| `npm run test:unit` | Unit tests only (Vitest) |
| `npm run test:watch` | Unit tests in watch mode |
| `npm run test:e2e` | All E2E tests (parallel then serial) |
| `npm run test:e2e:parallel` | Parallel E2E tests only (Playwright, headless) |
| `npm run test:e2e:serial` | Serial E2E tests only |
| `npm run test:e2e:ui` | E2E tests with Playwright UI mode |

## Key Commands
- `npm run dev` — Start dev server
- `npm run build` — Production build
- `npm run typecheck` — Standalone TypeScript check
- `npm run lint` — ESLint (flat config)
- `npm run db:seed` — Seed with demo data
- `./deploy.sh` — Docker deployment
- `./down.sh` — Stop and tear down services
- `./backup.sh` — Database backup

## Submodules
- `agent-dev-env/` — Agentic development toolkit (skills, rules, devcontainer)
- `web-deploy-env/` — Deployment infrastructure (templates, scripts)
