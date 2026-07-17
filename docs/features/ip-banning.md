# IP Banning

- **Scope:** IP-based access control, auto-ban on rate-limit abuse, database schema, admin management UI

## Overview

IP banning layers on top of the rate limiting system. When a client exceeds the auto-ban threshold, their IP is banned persistently in SQLite. For rate limiting details, cookie architecture, and client vs server responsibilities, see [authentication.md](authentication.md).

| Mechanism | Storage | Survives Restart | Purpose |
|---|---|---|---|
| Rate limiting | In-memory `Map` | No | Fast first line of defense |
| Violation tracking | SQLite `rate_limit_violations` | Yes | Source of truth for auto-ban decisions |
| IP banning | SQLite `banned_ips` | Yes | Persistent ban |

---

## Auto-Ban Flow

When the server's rate limiter blocks a request, it records a violation and checks whether the IP should be banned:

```
Rate limiter blocks request
  │
  ├─ recordRateLimitViolation(ip)     → insert into rate_limit_violations
  │
  ├─ tryAutoBan(ip)
  │    ├─ getViolationCount(ip, autoBanWindow) >= threshold?
  │    │    └─ !isIpBanned(ip)?
  │    │         └─ banIp(ip, "auto:rate-limit-threshold")
  │    │              (wrapped in try-catch for unique constraint race)
  │    └─ every 50 lockouts: deleteOldViolations(autoBanWindow)
  │
  └─ Re-check: isIpBanned(ip)?
       └─ YES (just banned) → return { error: "IP banned", action: "refresh" }
```

The `action: "refresh"` response tells the client to re-fetch the page from the server. This is necessary because the page was initially rendered with the user's valid session, but now their IP is banned. A refresh causes the server to re-check the IP and render the banned screen.

For the full server action flow (IP ban check → rate limiter → auto-ban → auth), see [authentication.md](authentication.md).

---

## Configuration

### Auto-Ban Defaults

Defined in `src/lib/constants.ts`:

| Constant | Value | Used By |
|---|---|---|
| `AUTO_BAN_THRESHOLD_DEFAULT` | 5 | auto-ban logic |
| `AUTO_BAN_WINDOW_DEFAULT` | 3600 | auto-ban logic (1 hour) |

### Auto-Ban Config

`getAutoBanConfig()` in `src/lib/repository/ip-bans.ts` reads `auto_ban_login_threshold` and `auto_ban_window_seconds` from `site_config`, falling back to the constants above. Used by:
- `login/actions.ts` — auto-ban decisions
- `admin/page.tsx` — suspicious IP count on dashboard
- `admin/security/page.tsx` — pre-fill the auto-ban settings form

Rate limiting config (max attempts, window size) is documented in [authentication.md](authentication.md#server-side-source-of-truth).

---

## Database Schema

### `banned_ips`

| Column | Type | Default |
|---|---|---|
| `id` | INTEGER PK | autoincrement |
| `ip_address` | TEXT | — |
| `reason` | TEXT | `'manual'` |
| `banned_at` | TEXT | `datetime('now')` |
| `unbanned_at` | TEXT | NULL (active ban) |

Indexes:
- `idx_banned_ips_ip` — lookup by IP
- `idx_banned_ips_active` — **partial unique** on `(ip_address) WHERE unbanned_at IS NULL` — prevents duplicate active bans

### `rate_limit_violations`

| Column | Type | Default |
|---|---|---|
| `id` | INTEGER PK | autoincrement |
| `ip_address` | TEXT | — |
| `violated_at` | TEXT | `datetime('now')` |

Index: `idx_rate_limit_violations_ip` — lookup by IP for counting violations

### Migrations

| # | Description |
|---|---|
| 7 | Create `banned_ips` table + index |
| 8 | Create `rate_limit_violations` table + index |
| 9 | Create partial unique index `idx_banned_ips_active` |

---

## IP Extraction

`getClientIp()` in `src/lib/ip.ts` reads from `cf-connecting-ip` (Cloudflare's verified real client IP), then `x-forwarded-for` (first entry), then `x-real-ip`, falling back to `127.0.0.1`. This is correct behind Cloudflare Tunnel + Caddy where `cf-connecting-ip` contains the true client IP. Without Cloudflare, `x-forwarded-for` is used (spoofable without a reverse proxy).

---

## Admin UI

### Security Page (`/admin/security`)

Four sections:

| Section | Component | Description |
|---|---|---|
| Auto-Ban Settings | `AutoBanForm` | Configure threshold (1–100 lockouts) and window (60–86400s) |
| Login Rate Limiting | `RateLimitForm` | Max attempts and window for login rate limiter |
| Ban IP | `BanIpForm` | Manually ban an IP with optional reason (validates IPv4/IPv6 format) |
| Banned IPs | `BanList` | List of active bans with unban buttons and reason labels |

### Dashboard (`/admin`)

Security row shows:
- **Suspicious IPs** — IPs with violation count ≥ threshold (not yet banned)
- **Banned** — Count of active bans

### Login Page (`/login`)

If the client IP is banned, the login page renders a minimal banned screen instead of the login form. No images, background, or heavy assets are loaded. This is a Server Component check in `login/page.tsx` — it runs before any assets load, so banned clients never download the landing page background.

---

## Session Revocation on Ban

When an IP is banned, `revokeSessionsByIpBan(ip)` adds the IP to an in-memory `Set` in `session-revocation.ts`. The proxy (`proxy.ts`) checks this set on every matched request — if the request's IP is in the set, the session cookie is cleared and the user is redirected to `/login`. Server actions also check via `requireSession("admin")` (admin) or `requireSession()` + `validateSessionInDb(session)` (party) for defense-in-depth.

### Client-side prefetch cache limitation

Next.js App Router eagerly prefetches `<Link>` targets when they enter the viewport. Once prefetched, the RSC payload is cached on the client. A banned user clicking a prefetched `<Link>` is served from this client-side cache — no server request is made, the proxy never runs, and the ban screen is not shown. This affects all nav-bar links (always visible, always prefetched) and any other links that entered the viewport before the ban.

This is **not** a security vulnerability: the banned user only sees stale pre-ban data already rendered in their browser. The server is fully protected — it will not serve any new data, form submissions are rejected, and any full page navigation (reload, URL-bar, bookmark) immediately hits the proxy and shows the ban screen.

The serial E2E tests in `session-revocation.spec.ts` cover both scenarios:
- **Cached-Link navigation** (tests 4–6): banned user clicks a nav `<Link>` (served from cache), then submits a form or refreshes (hits server → proxy catches ban).
- **Full server navigation** (test 7): banned user navigates via `page.goto()` (simulating a reload/bookmark), which always hits the server → proxy redirects to ban screen.

See [authentication.md](authentication.md#known-limitations) for the full session revocation architecture.

---

## Design Decisions

### IP check at page level, not middleware

The banned IP check runs as a Server Component check in `login/page.tsx` before any images or assets load. This avoids serving the landing page background (which can be a large image/video) to banned clients.

### `tryAutoBan` extracted as shared module

`tryAutoBan()` lives in `src/lib/repository/ip-bans.ts` alongside the DB operations it orchestrates (`getViolationCount`, `banIp`, `deleteOldViolations`). Login actions simply call `tryAutoBan(ip)` after recording a violation — the threshold logic is centralized in the repository layer.

### Periodic cleanup via counter

`deleteOldViolations()` runs every 50th lockout event (via a module-level counter), not on a timer. This avoids background intervals for cleanup while still pruning stale rows regularly.

### Race condition guards

`banIp()` does not check for existing active bans — it relies on `idx_banned_ips_active` for uniqueness. Callers check `isIpBanned()` first for a fast path, then wrap `banIp()` in try-catch to handle the rare concurrent duplicate.

### In-memory rate limiter

The rate limiter resets on server restart. The DB-backed `rate_limit_violations` table persists across restarts and provides the data for auto-ban decisions. This is intentional — the in-memory limiter is a fast first line of defense; the DB is the source of truth for banning.

---

## Trust Boundary

**Deployment is exclusively via Cloudflare Tunnel + Caddy.** Direct access without Cloudflare is unsupported.

`getClientIp()` trusts `cf-connecting-ip`, `x-forwarded-for`, and `x-real-ip` headers. This is safe because:

- **`cf-connecting-ip`** is set by Cloudflare and is the primary IP source. It cannot be spoofed by clients.
- **`x-forwarded-for`** and **`x-real-ip`** are set by Caddy (trusted reverse proxy on the same Docker network).

Running the app without Cloudflare (e.g. direct access to Caddy or Next.js) would make `x-forwarded-for` spoofable, allowing IP impersonation and rate-limit bypass. This deployment model is a hard requirement, not a recommendation.

---

## Files

| File | Role |
|---|---|
| `src/lib/ip.ts` | `getClientIp()` — IP extraction from proxy headers |
| `src/lib/constants.ts` | Auto-ban default values (`AUTO_BAN_THRESHOLD_DEFAULT`, `AUTO_BAN_WINDOW_DEFAULT`) |
| `src/lib/schema.ts` | `banned_ips` + `rate_limit_violations` DDL |
| `src/lib/types.ts` | `BannedIp` interface |
| `src/lib/repository/ip-bans.ts` | All DB operations + `getAutoBanConfig()` + `tryAutoBan()` |
| `src/app/login/page.tsx` | Server Component IP ban check |
| `src/app/login/actions.ts` | Login server actions — call `tryAutoBan()` from repository layer |
| `src/app/admin/security/page.tsx` | Security admin page |
| `src/app/admin/security/actions.ts` | `saveAutoBanSettings`, `banIpAction`, `unbanIpAction`, `banViolationIpAction`, `clearViolationsAction`, `saveSessionSettings`, `saveSuspiciousSettings` |
| `src/app/admin/security/ban-list.tsx` | Banned IPs list with unban |
| `src/app/admin/security/auto-ban-form.tsx` | Auto-ban settings form |
| `src/app/admin/security/ban-ip-form.tsx` | Manual IP ban form |
| `src/components/rate-limit-form/` | Reusable rate limit config form |
| `src/app/admin/page.tsx` | Dashboard security stats |
