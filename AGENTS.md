# Project Agent Instructions

## Project Purpose
A production-ready Next.js starter web application with admin dashboard, SQLite database, and Docker-based deployment via Cloudflare Tunnel + Caddy.

## Architecture
- **Framework**: Next.js 14 (App Router) — server-first by default
- **Language**: TypeScript (strict mode), no `any` allowed
- **Database**: SQLite via better-sqlite3 (WAL mode), server-only access
- **Auth**: Cookie-based session (simple base64-encoded JSON for demo)
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
- Admin routes protected via `isAdmin()` check in layout
- No Client Components unless interactivity requires it

## Testing
- **Unit tests:** Vitest with testing-library + jsdom, files colocated as `*.test.ts(x)`
- **E2E tests:** Playwright with Chromium, files in `e2e/`, auto-starts dev server
- **MCP integration:** Playwright MCP for browser automation, SQLite MCP connected to `data/dev.db`

## Key Commands
- `npm run dev` — Start dev server
- `npm run build` — Production build
- `npm test` — Run unit tests (Vitest)
- `npm run test:watch` — Unit tests in watch mode
- `npm run test:e2e` — Run E2E tests (Playwright, headless)
- `npm run test:e2e:ui` — Run E2E tests with Playwright UI mode
- `npm run typecheck` — Standalone TypeScript check
- `npm run lint` — ESLint via next lint
- `npm run db:seed` — Seed with demo data
- `./deploy.sh` — Docker deployment
- `./down.sh` — Stop and tear down services
- `./backup.sh` — Database backup

## Submodules
- `agent-dev-env/` — Agentic development toolkit (skills, rules, devcontainer)
- `web-deploy-env/` — Deployment infrastructure (templates, scripts)
