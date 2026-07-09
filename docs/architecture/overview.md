# Architecture Overview

- **Date:** 2026-07-03
- **Scope:** Full-stack architecture of the wedding webapp

## Design Philosophy

**Server-first architecture** built on Next.js 16 App Router (Turbopack). Rendering, data fetching, and mutations happen on the server by default. Client Components are used only where browser APIs or interactivity are required (forms, lightbox galleries), and are pushed to leaf nodes in the component tree.

**Repository pattern** — All SQL queries are extracted into typed modules under `src/lib/repository/`. Each entity (guests, parties, RSVP, lodging, etc.) gets its own file. This keeps page components focused on rendering, makes queries testable in isolation, and centralizes schema changes.

**Per-user password auth** — Replaced the original shared-password model with per-user username/password authentication. Admin credentials come from `.env`, party authentication uses access codes, and guest accounts are managed from the admin dashboard. Passwords are hashed with scrypt.

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

### Network Topology

| Network | Accessibility | Services |
|---|---|---|
| `frontend` | External | tunnel, caddy |
| `backend` | Internal (no external access) | webapp, caddy |

## Route Map

| Route | Type | Auth | Purpose |
|---|---|---|---|
| `/` | Dynamic | None | Wedding landing page with login form |
| `/login` | Dynamic | None | Authentication form (credentials or party code) |
| `/(main)/home` | Dynamic | Any session | Wedding home page with date, location, story |
| `/(main)/lodging` | Dynamic | Any session | Hotel/resort recommendations |
| `/(main)/dress-code` | Dynamic | Any session | Dress code mood board |
| `/(main)/rsvp` | Dynamic | Party or guest | Party-based RSVP with per-member forms |
| `/(main)/media` | Dynamic | Any session | Photo/video gallery |
| `/admin` | Dynamic | Admin only | Dashboard with stats and recent RSVPs |
| `/admin/site` | Dynamic | Admin only | Site configuration editor |
| `/admin/parties` | Dynamic | Admin only | Party management with access codes |
| `/admin/guests` | Dynamic | Admin only | Guest CRUD with party assignment |
| `/admin/lodging` | Dynamic | Admin only | Lodging recommendations CRUD |
| `/admin/dress-code` | Dynamic | Admin only | Dress code image management |
| `/admin/rsvp` | Dynamic | Admin only | RSVP response viewer |
| `/admin/media` | Dynamic | Admin only | Media gallery CRUD |
| `/api/health` | Static | None | Database-backed health check |

## Authentication & Authorization

Three session types, each with different access:

| Session Type | Created By | Access |
|---|---|---|
| `admin` | Username/password login | All routes |
| `party` | Party code login | `/(main)/*` + RSVP for party members |
| `guest` | Username/password login | `/(main)/*` only |

All authenticated routes use layout-level guards. Unauthenticated access redirects to the landing page or login page.

## Technology Stack

| Layer | Technology | Purpose |
|---|---|---|
| Framework | Next.js 16 (App Router, Turbopack) | Server-first React, file-based routing |
| Language | TypeScript 5.4 (strict) | Type safety with no `any` |
| Database | better-sqlite3 (WAL mode) | Synchronous SQLite, zero-config |
| Auth | HMAC-signed JSON cookie | Session tokens with scrypt password hashing |
| Styling | Plain CSS (custom properties) | Zero-dependency, themeable via `:root` |
| Proxy | Caddy 2.11 (alpine) | TLS, rate limiting, security headers |
| Tunnel | cloudflared 2026.6.1 | Outbound-only Cloudflare Tunnel |
| Testing | Vitest + Playwright | Unit tests (37) + E2E tests (17) |
| Deployment | Docker Compose | Multi-stage build, isolated networks |

## Directory Layout

```
src/
├── app/                      # Next.js App Router
│   ├── (main)/               # Authenticated guest pages
│   │   ├── dress-code/page.tsx
│   │   ├── home/page.tsx
│   │   ├── lodging/page.tsx
│   │   ├── media/page.tsx
│   │   ├── rsvp/page.tsx       + rsvp-form.tsx, actions.ts
│   │   └── layout.tsx          (auth guard + navigation)
│   ├── admin/                 # Admin dashboard
│   │   ├── dress-code/       # Image CRUD
│   │   ├── guests/           # Guest CRUD with party assignment
│   │   ├── lodging/          # Lodging CRUD
│   │   ├── media/            # Media gallery CRUD
│   │   ├── parties/          # Party CRUD with access codes
│   │   ├── rsvp/             # Response viewer
│   │   ├── site/             # Site config editor
│   │   └── layout.tsx         (admin guard + sidebar)
│   ├── api/health/route.ts   # Health check endpoint
│   ├── login/                # Login page + actions
│   └── (page.tsx, layout.tsx, error.tsx, not-found.tsx)
├── components/               # Shared UI
├── lib/                      # Server-only utilities
│   ├── repository/           # Data access layer (7 files)
│   ├── auth.ts               # Session + password
│   ├── db.ts                 # Connection + migration + seed
│   ├── schema.ts             # DDL
│   └── config.ts             # Env validation
├── app/globals.css           # Styles (490 lines)
```

## Key Architecture Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Data fetching | Server Components | No client-server waterfall, smaller bundles |
| Mutations | Server Actions | Type-safe, colocated, no API boilerplate |
| Database | SQLite | Zero-config, file-based, no server process needed |
| Auth | HMAC-signed JSON cookie | Simple, secure (signed), replaceable |
| Access control | Layout-level guards | Server-side redirects, never reaches client |
| RSVP | Party model | Families RSVP once with a code (not per-person passwords) |
| Styling | Plain CSS | Zero dependencies, themeable via custom properties |
| Deployment | Docker Compose | Isolated networks, multi-stage builds, health checks |
