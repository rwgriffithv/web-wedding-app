# Deployment Pipeline

- **Date:** 2026-06-29
- **Scope:** Build, test, and deploy workflows using the web-deploy-env toolkit

## Overview

The deployment infrastructure is sourced entirely from the `web-deploy-env` Git submodule. Templates are symlinked or generated at bootstrap time. This ensures that infrastructure improvements can propagate to all downstream projects via a submodule update.

Three phases comprise the full lifecycle:

1. **Bootstrap** — One-time host + image setup (submodule scripts)
2. **Build & Test** — Application compilation inside the devcontainer
3. **Deploy** — Multi-stage Docker build + container orchestration (host only)

---

## Phase 1: Bootstrap Infrastructure

The `web-deploy-env` submodule provides two scripts that prepare the host environment:

### `scripts/setup-host.sh`

Idempotent host configuration. Must run on the host (not inside the devcontainer).

| Step | Details |
|---|---|---|
| OS check | Debian/Ubuntu only |
| Verify Docker | Required for image builds and container orchestration |
| Pull `caddy:2.11.4-alpine` | Pre-caches the reverse proxy image |
| Pull `cloudflare/cloudflared:2026.6.1` | Pre-caches the tunnel image |

### `scripts/bootstrap.sh`

Idempotent project bootstrapping. Must run on the host after `setup-host.sh`.

| Step | Details |
|---|---|---|
| Build `local/web-deploy-base:latest` | Base production image from `Dockerfile.base` (Node.js 22-slim + system libs) |
| Create `data/` directories | Ensures directories for SQLite and backups exist |
| Symlink `Dockerfile` | Points to `web-deploy-env/templates/Dockerfile` |
| Symlink `.dockerignore` | Points to `web-deploy-env/templates/.dockerignore` |
| Symlink `docker-compose.yml` | Points to `web-deploy-env/templates/docker-compose.yml` |
| Symlink `Caddyfile` | Points to `web-deploy-env/templates/Caddyfile` |
| Symlink `deploy.sh` | Points to `web-deploy-env/scripts/deploy.sh` |
| Symlink `down.sh` | Points to `web-deploy-env/scripts/down.sh` |
| Symlink `backup.sh` | Points to `web-deploy-env/scripts/backup.sh` |

### Base Image Lineage

```
Dockerfile.base (Node.js 22-bookworm-slim + system libs)
    │  docker build -t local/web-deploy-base:latest
    ▼
web-deploy-base         (prod base — lean, no dev deps)
    │
    ├── agent-dev-env/.devcontainer/base/Dockerfile
    │   (inherits web-deploy-base, adds: git, curl, sqlite3,
    │    Playwright deps, opencode-ai, chromium)
    │   ▼
    │   agent-dev-env image    (dev base — full toolchain)
    │       │
    │       └── Dockerfile stage 1 (FROM agent-dev-env)
    │           npm install + npm run build
    │
    └── Dockerfile stage 2 (FROM web-deploy-base)
        copies only: node_modules, .next, public, package.json
```

---

## Phase 2: Build & Test (Inside Devcontainer)

Development, compilation, and verification happen inside the devcontainer. The devcontainer provides Node.js 22, TypeScript, Playwright, SQLite CLI, and OpenCode.

### Seed Database

Tables are auto-created on first database connection. To insert demo data:

```bash
npm run db:seed   # npx tsx scripts/db-seed.ts
```

The seed script is idempotent — it skips insertion if users already exist.

### Development Server

```bash
npm run dev        # next dev — starts on port 3000 with HMR
```

The dev server supports:
- Hot module replacement — saves reflect instantly in the browser
- Error overlay — compilation and runtime errors display in-browser
- API route reloading — route handlers recompile on change

### Production Build Verification

Before deploying, verify the production build inside the devcontainer:

```bash
npm run build      # next build — compiles all routes, resolves imports
```

The build output shows:
- Each route and its size (static vs dynamic)
- First Load JS bundle size
- Any compilation warnings or errors

### Type Checking

Run TypeScript strict-mode validation independently:

```bash
npm run typecheck  # tsc --noEmit
```

This catches type errors that the Next.js build might not surface (e.g., in `.ts` files not imported by pages).

### Database Verification

Verify the database schema and seed data:

```bash
sqlite3 data/dev.db ".tables"          # Should show: page_views  users
sqlite3 data/dev.db "SELECT * FROM users;"  # Should show 4 demo users
```

---

## Phase 3: Production Deployment (Host Only)

Deployment runs on the host machine. The `deploy.sh` script (symlinked to `web-deploy-env/scripts/deploy.sh`) enforces a devcontainer guard — it aborts with an error if `REMOTE_CONTAINERS` or `CODESPACES` is set.

### Prerequisites

| Requirement | Details |
|---|---|
| `.env` file | Must define `DOMAIN` and `TUNNEL_TOKEN` |
| Docker | Docker Engine + Compose plugin (v2) or standalone `docker-compose` (v1) |

Example `.env`:

```env
DOMAIN=app.yourdomain.com
TUNNEL_TOKEN=eyJhIjoi... (your Cloudflare tunnel token)
```

### Deploy Command

```bash
./deploy.sh
```

### Deploy Script Steps

| Step | Description |
|---|---|
| 1. Validate env vars | Checks `DOMAIN` and `TUNNEL_TOKEN` are non-empty |
| 2. Detect Compose | Prefers `docker compose` (v2), falls back to `docker-compose` (v1) |
| 3. Build images | Runs `docker compose build --pull` with BuildKit inline cache |
| 4. Start services | Runs `docker compose up -d` |
| 5. Start services | Runs `docker compose up -d` (detached) |
| 6. Health check | Waits 5 seconds, then checks each service status via `docker compose ps` |

### Docker Compose Services

```bash
# Build and start (deploy.sh handles this)
docker compose build --pull
docker compose up -d

# View logs
docker compose logs webapp
docker compose logs caddy
docker compose logs tunnel

# Stop
docker compose down

# Rebuild without cache
docker compose build --no-cache
```

### Health Check Verification

After deployment, verify all services are healthy:

```bash
docker compose ps
# NAME                STATUS
# web-starter-webapp  Up 2 minutes (healthy)
# web-starter-caddy   Up 2 minutes (healthy)
# web-starter-tunnel  Up 2 minutes (healthy)
```

The application health endpoint can be tested directly (inside the Docker network):

```bash
curl http://localhost:3000/api/health
# {"status":"ok","database":"connected"}
```

---

## Multi-Stage Docker Build

### `Dockerfile`

Symlinked from `web-deploy-env/templates/Dockerfile`. Uses Docker `ARG` defaults for base image selection — no template processing needed.

**Stage 1: dev-base** — Builds the application with full dev toolchain:

```dockerfile
FROM local/agent-dev-env:latest AS dev-base
WORKDIR /app
COPY . .
RUN npm install && npm run build
```

**Stage 2: prod** — Extracts only production artifacts:

```dockerfile
FROM local/web-deploy-base:latest AS prod
WORKDIR /app
COPY --from=dev-base /app/node_modules ./node_modules
COPY --from=dev-base /app/.next ./.next
COPY --from=dev-base /app/public ./public
COPY --from=dev-base /app/package.json ./package.json
CMD ["node", "node_modules/.bin/next", "start"]
```

The `dev-base` stage builds inside the `agent-dev-env` image (Node.js + dev tools). The `prod` stage starts fresh from `web-deploy-base` (only Node.js runtime) and copies only build artifacts — no source code, no `node_modules/.cache`, no dev dependencies.

### Build Arguments

| ARG | Default | Override |
|---|---|---|
| `IMAGE_REGISTRY` | `local` | `--build-arg IMAGE_REGISTRY=ghcr.io/myorg` |
| `DEV_BASE_IMAGE` | `${IMAGE_REGISTRY}/agent-dev-env:latest` | `--build-arg DEV_BASE_IMAGE=custom/dev:latest` |
| `PROD_BASE_IMAGE` | `${IMAGE_REGISTRY}/web-deploy-base:latest` | `--build-arg PROD_BASE_IMAGE=custom/prod:latest` |

Override at build time:

```bash
docker compose build --build-arg IMAGE_REGISTRY=ghcr.io/myorg
```

---

## Service Architecture

### Service Stack

| Service | Image | Role | Networks |
|---|---|---|---|
| `webapp` | Custom build | Next.js application server (port 3000) | backend |
| `caddy` | `caddy:2.11.4-alpine` | Reverse proxy, TLS termination, security headers, rate limiting | frontend, backend |
| `tunnel` | `cloudflare/cloudflared:2026.6.1` | Outbound Cloudflare Tunnel | frontend |

### Network Isolation

```
                 Internet
                    │
              [frontend network]
              ┌─────┼─────┐
              │     │     │
           tunnel  caddy  │
                          │
                   [backend network]
                          │
                       webapp
                          │
                       SQLite
```

- `tunnel` has outbound-only access to `frontend` — no access to `backend`
- `caddy` bridges both networks — receives external traffic, proxies to `webapp:3000`
- `webapp` is isolated on `backend` — no external network access

### Caddy Configuration

The `Caddyfile` (symlinked from `web-deploy-env/templates/Caddyfile`) configures:

| Feature | Setting |
|---|---|
| Upstream | `reverse_proxy webapp:3000` |
| Compression | `encode gzip` |
| HSTS | `max-age=31536000; includeSubDomains; preload` |
| CSP | `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'` |
| Rate limit | 100 requests per IP per minute |

### Traffic Flow

```
User HTTPS request
    │
    ▼
Cloudflare Edge (TLS termination)
    │
    ▼
Cloudflare Tunnel (encrypted tunnel)
    │
    ▼
cloudflared container (port 80, frontend network)
    │
    ▼
Caddy — security gateway (security headers, rate limiting)
    │  Reverse proxy: webapp:3000
    ▼
webapp container (port 3000, backend network)
    │
    ▼
SQLite database (/app/data/prod.db)
```

---

## Health Checks

| Service | Check | Interval | Timeout | Retries | Start Period |
|---|---|---|---|---|---|
| `webapp` | `GET /api/health` → 200 | 30s | 10s | 3 | 15s |
| `caddy` | `GET /healthz` (wget) | 30s | 10s | 3 | 10s |

The `webapp` health check runs inside the container and verifies:
1. HTTP server is listening on port 3000
2. Next.js request handling is functional
3. SQLite database responds to `SELECT 1`

It does NOT go through Caddy — it hits `localhost:3000` directly, isolating the check to the application layer.

---

## Automated Backups

The `backup.sh` script (symlinked from `web-deploy-env/scripts/backup.sh`):

```bash
# Manual backup
./backup.sh

# Dry run
BACKUP_DRY_RUN=true ./backup.sh

# Custom backup directory
BACKUP_DIR=./my-backups ./backup.sh

# Custom rotation (keep 30 days)
BACKUP_ROTATION_KEEP=30 ./backup.sh
```

### Backup Steps

1. Archive `data/sqlite/` → `data/backups/db_backup_YYYYMMDD_HHMMSS.tar.gz`
2. Write SHA-256 checksum → `db_backup_YYYYMMDD_HHMMSS.tar.gz.sha256`
3. Verify checksum immediately
4. Delete backups older than `BACKUP_ROTATION_KEEP` days (default: 7)

### Restore

```bash
# List available backups
ls data/backups/db_backup_*.tar.gz

# Verify integrity
sha256sum -c data/backups/db_backup_20260629_120000.tar.gz.sha256

# Extract to SQLite directory
tar -xzf data/backups/db_backup_20260629_120000.tar.gz -C data/sqlite/
```

---

## Deployment Checklist

- [ ] Host setup complete (`./setup.sh`)
- [ ] Submodules initialized (`git submodule update --init --remote`)
- [ ] `.env` file configured with `DOMAIN` and `TUNNEL_TOKEN`
- [ ] Application builds in devcontainer (`npm run build`)
- [ ] Type check passes (`npm run typecheck`)
- [ ] Demo data seeded (`npm run db:seed`, optional)
- [ ] Deploy from host (`./deploy.sh`)
- [ ] Verify health endpoint
- [ ] Verify domain resolves and TLS works
- [ ] Configure automated backups (cron: `0 3 * * * /path/to/backup.sh`)
