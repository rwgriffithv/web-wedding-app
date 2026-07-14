# IP Banning

- **Scope:** IP-based access control, auto-ban on rate-limit abuse, admin management UI

## Overview

The IP banning system protects the login flow from brute-force attacks. It operates at two levels:

1. **Rate limiting** — In-memory per-key counters that block repeated login attempts
2. **IP banning** — Persistent SQLite-backed bans triggered automatically or manually

When a client exceeds the rate limit threshold within a configurable window, their IP is automatically banned. Admins can also manually ban/unban IPs and tune auto-ban settings from the Security page.

---

## Implementation

### Tables

#### `banned_ips`

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

#### `rate_limit_violations`

| Column | Type | Default |
|---|---|---|
| `id` | INTEGER PK | autoincrement |
| `ip_address` | TEXT | — |
| `violated_at` | TEXT | `datetime('now')` |

Index: `idx_rate_limit_violations_ip` — lookup by IP for counting violations

### IP Extraction

`getClientIp()` in `src/lib/ip.ts` reads from `x-forwarded-for` (first entry) or `x-real-ip`, falling back to `127.0.0.1`. This is correct behind Caddy/Cloudflare Tunnel but spoofable without a reverse proxy.

### Rate Limiting

`createRateLimiter(name)` in `src/lib/rate-limit.ts` returns an in-memory rate limiter keyed by name (e.g. `"login"`, `"rsvp"`). Each limiter maintains a `Map` of key → `{ count, resetAt }` entries with a 60-second cleanup interval.

`getRateLimitConfig()` reads max attempts and window from `site_config` with explicit fallback defaults:

```typescript
function getRateLimitConfig(
  maxKey: string,        // e.g. "rate_limit_max_attempts"
  windowKey: string,     // e.g. "rate_limit_window_seconds"
  defaultMax: number,    // e.g. 5
  defaultWindowSeconds: number, // e.g. 60
): RateLimitConfig
```

Every caller passes explicit defaults — no hidden fallback values.

### Auto-Ban Flow

```
Login attempt
  │
  ├─ isIpBanned(ip)? → return "Your IP has been banned."
  │
  └─ rateLimiter.check(key, config)?
       │
       ├─ PASS → proceed with login
       │
       └─ FAIL (rate limited)
            ├─ recordRateLimitViolation(ip)    // insert into rate_limit_violations
            ├─ tryAutoBan(ip)                  // check if threshold exceeded
            │    ├─ getViolationCount(ip, window) >= threshold?
            │    │    └─ !isIpBanned(ip)?
            │    │         └─ banIp(ip, "auto:rate-limit-threshold")
            │    │              (wrapped in try-catch for unique constraint race)
            │    └─ every 50 lockouts: deleteOldViolations(window)
            └─ return "Too many attempts."
```

### Configuration Defaults

Defined in `src/lib/constants.ts`:

| Constant | Value | Used By |
|---|---|---|
| `RATE_LIMIT_MAX_ATTEMPTS_DEFAULT` | 5 | login, help, question rate limiters |
| `RATE_LIMIT_WINDOW_SECONDS_DEFAULT` | 60 | login, help, question rate limiters |
| `AUTO_BAN_THRESHOLD_DEFAULT` | 5 | auto-ban logic |
| `AUTO_BAN_WINDOW_DEFAULT` | 3600 | auto-ban logic (1 hour) |

`RateLimitForm` imports these constants and uses them as prop defaults, so callers don't need to pass them explicitly.

### Auto-Ban Config

`getAutoBanConfig()` in `src/lib/repository/ip-bans.ts` reads `auto_ban_login_threshold` and `auto_ban_window_seconds` from `site_config`, falling back to the constants above. Used by:
- `login/actions.ts` — auto-ban decisions
- `admin/page.tsx` — suspicious IP count on dashboard
- `admin/security/page.tsx` — pre-fill the auto-ban settings form

---

## Admin UI

### Security Page (`/admin/security`)

Four sections:

| Section | Component | Description |
|---|---|---|
| Auto-Ban Settings | `AutoBanForm` | Configure threshold (1–100 lockouts) and window (60–86400s) |
| Login Rate Limiting | `RateLimitForm` | Max attempts and window for login rate limiter |
| Ban IP | `BanIpForm` | Manually ban an IP with optional reason (validates IPv4 format) |
| Banned IPs | `BanList` | List of active bans with unban buttons and reason labels |

### Dashboard (`/admin`)

Security row shows:
- **Suspicious IPs** — IPs with violation count ≥ threshold (not yet banned)
- **Banned** — Count of active bans

### Login Page (`/login`)

If the client IP is banned, the login page renders a minimal banned screen instead of the login form. No images, background, or heavy assets are loaded.

---

## Files

| File | Role |
|---|---|
| `src/lib/ip.ts` | `getClientIp()` — IP extraction from proxy headers |
| `src/lib/constants.ts` | Rate limit and auto-ban default values |
| `src/lib/rate-limit.ts` | `getRateLimitConfig()`, `createRateLimiter()` |
| `src/lib/schema.ts` | `banned_ips` + `rate_limit_violations` DDL |
| `src/lib/types.ts` | `BannedIp` interface |
| `src/lib/repository/ip-bans.ts` | All DB operations + `getAutoBanConfig()` |
| `src/app/login/page.tsx` | Server Component IP ban check |
| `src/app/login/actions.ts` | Ban check, rate limit, auto-ban with `tryAutoBan()` |
| `src/app/admin/security/page.tsx` | Security admin page |
| `src/app/admin/security/actions.ts` | `saveAutoBanSettings`, `banIpAction`, `unbanIpAction` |
| `src/app/admin/security/ban-list.tsx` | Banned IPs list with unban |
| `src/app/admin/security/auto-ban-form.tsx` | Auto-ban settings form |
| `src/app/admin/security/ban-ip-form.tsx` | Manual IP ban form |
| `src/components/rate-limit-form/` | Reusable rate limit config form |
| `src/app/admin/page.tsx` | Dashboard security stats |

### Migrations

| # | Description |
|---|---|
| 7 | Create `banned_ips` table + index |
| 8 | Create `rate_limit_violations` table + index |
| 9 | Create partial unique index `idx_banned_ips_active` |

---

## Design Decisions

### IP check at page level, not middleware

The banned IP check runs as a Server Component check in `login/page.tsx` before any images or assets load. This avoids serving the landing page background (which can be a large image/video) to banned clients.

### `tryAutoBan` extracted as helper

Both `login()` and `loginByPartyCode()` call the same auto-ban logic. The helper is defined once at module scope to avoid duplication.

### Periodic cleanup via counter

`deleteOldViolations()` runs every 50th lockout event (via a module-level counter), not on a timer. This avoids background intervals for cleanup while still pruning stale rows regularly.

### Race condition guards

`banIp()` does not check for existing active bans — it relies on `idx_banned_ips_active` for uniqueness. Callers check `isIpBanned()` first for a fast path, then wrap `banIp()` in try-catch to handle the rare concurrent duplicate.

### In-memory rate limiter

The rate limiter resets on server restart. The DB-backed `rate_limit_violations` table persists across restarts and provides the data for auto-ban decisions. This is intentional — the in-memory limiter is a fast first line of defense; the DB is the source of truth for banning.

---

## Trust Boundary

`getClientIp()` trusts `x-forwarded-for` and `x-real-ip` headers. This is correct in the current deployment (Caddy → Cloudflare Tunnel) where these headers are set by trusted proxies. If the app is ever exposed directly to the internet without a reverse proxy, these headers can be spoofed to bypass rate limiting and bans.
