# Authentication & Rate Limiting

- **Scope:** Session management, rate limiting, IP banning, cookie architecture, client vs server responsibilities

## Overview

The app enforces access control through three layers:

1. **Session authentication** — HMAC-signed cookie identifies the user on every request
2. **Rate limiting** — In-memory sliding-window counters block repeated submissions
3. **IP banning** — Persistent SQLite-backed bans for IPs that exceed auto-ban thresholds

Each layer has a clear division of responsibility between server and client. The server is the source of truth for all security decisions. The client provides UX helpers (cooldown timers, pre-submit guards) that degrade gracefully if bypassed.

---

## Cookie Architecture

There are two categories of cookies: **session cookies** (set and read by the server) and **rate-limit cookies** (set and read by the client only).

### Session Cookie

| Attribute | Value |
|---|---|
| Name | `session` |
| Set by | Server (via `Set-Cookie` header in Server Actions) |
| Read by | Server (on every request via `parseSession()`) |
| Content | HMAC-SHA256 signed JSON: `{"userId":1,"type":"admin","pwChangedAt":"..."}.<signature>` |
| HTTP-only | `true` — never accessible to JavaScript |
| Secure | `true` (unconditional — production uses HTTPS via Cloudflare Tunnel) |
| SameSite | `lax` |
| Path | `/` |
| Max-Age | Configurable via `session_max_hours` in admin dashboard (default 24h, max 24h) |

The session cookie is the **only** cookie the server sets or reads for authentication. It contains:

```typescript
interface Session {
  userId: number;
  partyId?: number;   // Present for party sessions
  type: "admin" | "party" | "viewer";
  pwChangedAt?: string | null;  // Used for session invalidation on password change
}
```

**Session invalidation:** The session uses two-tier validation:

1. **Fast path (`parseSession()`)** — Crypto only (HMAC signature + expiry check). No database queries. Used for page loads, layouts, and read-only checks.
2. **Mutation path (`validateSessionForMutation()`)** — Validates `pwChangedAt` against the user's current `password_changed_at` in the database. Called only in state-changing server actions (RSVP submission, admin CRUD, etc.).

This eliminates database queries from the hot path (every page load) while still catching password changes on mutations.

**Note:** The `Secure` flag is always set. Local development over plain HTTP (`npm run dev`) will not persist session cookies in the browser.

### Rate-Limit Cookies (Client-Only)

| Cookie Name | Feature | Set by | Read by |
|---|---|---|---|
| `rl_until` | Login | Client | Client |
| `rl_r_until` | RSVP | Client | Client |
| `rl_q_until` | Questions | Client | Client |

These cookies are **never set or read by the server**. They exist purely for client-side UX:

1. **Pre-submit guard:** `checkRateLimit()` reads the cookie before form submission to block the request before it reaches the server
2. **Reload persistence:** `useEffect` on mount reads the cookie to restore the cooldown timer after page navigation

**How they are created:**

```
Server action returns: { error: "...", action: "cooldown", cooldownUntil: 1690000000000 }
                                       ↓
Client receives response: syncFromResponse(cooldownUntil)
                                       ↓
Client creates cookie:    document.cookie = "rl_until=1690000000000; path=/; max-age=45"
                                       ↓
Client starts timer:      setCooldown(45)  →  countdown displays "Please wait 45s..."
```

**Why the server doesn't set these cookies:**

The server has no use for rate-limit cookies — it never reads them. If the server set them via `Set-Cookie` headers, there would be a race condition: with Next.js flight protocol, there is no guarantee the cookie appears in `document.cookie` by the time the client reads it. By having the client create the cookie from the `cooldownUntil` timestamp in the response, the client controls the timing and the race is eliminated.

**Why the cookies still work despite being client-only:**

- A malicious client can delete the cookie and submit again — but the server's in-memory rate limiter still blocks them. The cookie is a UX convenience, not a security boundary.
- A client that never creates the cookie (e.g. a script) still hits the server's rate limiter on every attempt.
- The cookie's only job is to prevent *honest* users from accidentally submitting during a cooldown and seeing an error.

---

## Rate Limiting

### Server-Side (Source of Truth)

The server maintains an in-memory sliding-window rate limiter per feature. Each limiter is a `Map` of key → `{ count, resetAt }` entries. Expired entries are pruned by a hardcoded 60-second cleanup interval — this is housekeeping, not a security boundary (the `check()` function also evicts the oldest entry inline when the store exceeds 10,000 entries).

**Configurable via admin UI** (`site_config`):

| Parameter | Config Keys | Defaults |
|---|---|---|
| Max attempts (login) | `rate_limit_max_attempts` | 5 |
| Window (login) | `rate_limit_window_seconds` | 60s |
| Max attempts (RSVP) | `rsvp_rate_limit_max` | 10 |
| Window (RSVP) | `rsvp_rate_limit_window` | 60s |
| Max attempts (questions) | `question_rate_limit_max` | 5 |
| Window (questions) | `question_rate_limit_window` | 60s |

Changes take effect immediately — `getRateLimitConfig()` reads from `site_config` on every request.

**How it works:**

```
Client submits form
  │
  Server action receives request
  │
  ├─ Check IP ban: isIpBanned(ip)?
  │    └─ YES → return { error: "Your IP has been banned.", action: "refresh" }
  │
  ├─ Check rate limiter: rateLimiter.check(key, config)
  │    ├─ PASS (under limit) → proceed with action
  │    └─ FAIL (over limit):
  │         ├─ recordRateLimitViolation(ip)     ← SQLite: rate_limit_violations
  │         ├─ tryAutoBan(ip)                   ← check if threshold exceeded
  │         │    └─ getViolationCount(ip) >= threshold?
  │         │         └─ banIp(ip, "auto:rate-limit-threshold")  ← SQLite: banned_ips
  │         │
  │         ├─ Re-check: isIpBanned(ip)?
  │         │    └─ YES (just banned) → return { error: "Your IP has been banned.", action: "refresh" }
  │         │
  │         └─ return { error: "Too many attempts.", action: "cooldown", cooldownUntil: ... }
  │
  └─ Action proceeds normally
```

The `action` field in the response tells the client how to react:

| `action` | Meaning | Client Behavior |
|---|---|---|
| `"refresh"` | Page needs re-render (e.g. IP was just banned) | `router.refresh()` — re-fetches the page from server |
| `"cooldown"` | Rate limited, wait before retrying | `syncFromResponse(cooldownUntil)` — creates cookie, starts countdown |
| *(undefined)* | Normal success or validation error | Display error message, no special handling |

**Configuration changes take effect immediately** — `getRateLimitConfig()` reads from `site_config` on every request. No restart required.

### Client-Side (UX Helper)

The client provides two mechanisms that improve the user experience without affecting security:

**1. Pre-submit guard (`checkRateLimit()`):**

```typescript
function checkRateLimit(): boolean {
  const remaining = getRateLimitRemaining(cookieName);
  if (remaining > 0) {
    setCooldown(remaining);
    return true;  // blocked
  }
  return false;  // allowed
}
```

Called before every form submission. If the cookie indicates an active cooldown, the form is blocked and the server is never called. This prevents unnecessary round-trips and gives the user an immediate "Please wait Xs..." message.

**2. Mount-time restoration (`useEffect`):**

```typescript
useEffect(() => {
  const remaining = getRateLimitRemaining(cookieName);
  if (remaining > 0) setCooldown(remaining);
}, [cookieName]);
```

On page load, reads the cookie to restore any active cooldown. This handles the case where the user refreshes the page during a cooldown — without this, the cooldown would appear to reset.

**3. Response sync (`syncFromResponse()`):**

```typescript
function syncFromResponse(cooldownUntil: number): void {
  const remaining = Math.ceil((cooldownUntil - Date.now()) / 1000);
  if (remaining > 0) {
    document.cookie = `${cookieName}=${cooldownUntil}; path=/; max-age=${remaining}`;
    setCooldown(remaining);
  }
}
```

Called when the server returns `action: "cooldown"`. Creates the cookie client-side from the server's timestamp and starts the countdown. The cookie name is feature-specific (`rl_until` for login, `rl_r_until` for RSVP, `rl_q_until` for questions).

---

## IP Banning

IP banning layers on top of rate limiting. When a client exceeds the auto-ban threshold, their IP is banned persistently in SQLite.

| Mechanism | Storage | Survives Restart | Purpose |
|---|---|---|---|
| Rate limiting | In-memory `Map` | No | Fast first line of defense |
| Violation tracking | SQLite `rate_limit_violations` | Yes | Source of truth for auto-ban decisions |
| IP banning | SQLite `banned_ips` | Yes | Persistent ban |

**Auto-ban flow:**

1. Client gets rate-limited → `recordRateLimitViolation(ip)` inserts into `rate_limit_violations`
2. `tryAutoBan(ip)` counts violations within the auto-ban window (default: 1 hour)
3. If count ≥ threshold (default: 5 lockouts) and IP isn't already banned → `banIp(ip)`
4. Subsequent requests from that IP are rejected immediately at the top of the action

**Periodic cleanup:** Every 50th lockout event, `deleteOldViolations()` prunes rows older than the auto-ban window.

**Admin controls:** Manual ban/unban and auto-ban threshold configuration at `/admin/security`. See [ip-banning.md](ip-banning.md) for database schema, admin UI, design decisions, and migrations.

---

## Protection Layers (Outside-In)

The server is protected by multiple layers, each with a different scope and trust model:

```
┌─────────────────────────────────────────────────────┐
│  Layer 1: Cloudflare Edge                           │
│  TLS termination, DDoS mitigation, bot detection    │
│  Trust: fully trusted (edge network)                │
└────────────────────────┬────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────┐
│  Layer 2: Caddy Reverse Proxy                       │
│  Rate limiting (connection-level), security headers │
│  Trust: fully trusted (same Docker network)         │
└────────────────────────┬────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────┐
│  Layer 3: Next.js Server Actions                    │
│  IP ban check → rate limiter → auto-ban → auth      │
│  Trust: untrusted input, validated at every step    │
└────────────────────────┬────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────┐
│  Layer 4: SQLite Database                           │
│  Parameterized queries, WAL mode, foreign keys      │
│  Trust: server-only access, never exposed to client │
└─────────────────────────────────────────────────────┘
```

### Server Action Protection (UI and Non-UI Clients)

Every server action enforces the same protection regardless of how the request was made:

**Step 1 — IP ban check:**

```typescript
const ip = await getClientIp();
if (isIpBanned(ip)) {
  return { error: "Your IP has been banned.", action: "refresh" };
}
```

`getClientIp()` reads from `cf-connecting-ip` (Cloudflare's verified real client IP), then `x-forwarded-for` (first entry), then `x-real-ip`, falling back to `127.0.0.1`. This is correct behind Cloudflare Tunnel + Caddy where `cf-connecting-ip` contains the true client IP.

**Step 2 — Rate limiter check:**

```typescript
if (!rateLimiter.check(key, rlConfig)) {
  recordRateLimitViolation(ip);
  tryAutoBan(ip);
  // re-check if just banned
  if (isIpBanned(ip)) {
    return { error: "Your IP has been banned.", action: "refresh" };
  }
  return { error: "Too many attempts.", action: "cooldown", cooldownUntil: ... };
}
```

The rate limiter is an in-memory `Map` per feature name. Keys are namespaced by IP and user/party identifier. The check is synchronous and fast — no database query.

**Step 3 — Authentication (two-tier):**

For **read-only** operations (page loads, layouts, API reads):
```typescript
const session = await parseSession();  // crypto only, no DB
if (!session) return { error: "Not authenticated." };
```

For **mutations** (RSVP submit, admin CRUD, etc.):
```typescript
if (!(await isAdmin())) return { error: "Unauthorized" };        // fast path: HMAC + type check
if (!(await validateSessionForMutation())) return { error: "Session expired" };  // DB: pwChangedAt check
```

This two-tier approach means page loads incur zero database queries for authentication. Only mutations validate against the database (to catch password changes since the session was issued).

**Step 4 — Business logic and database write:**

All SQL queries use parameterized statements. No string interpolation in queries. The repository pattern centralizes all database access.

### How This Protects Against Different Attack Vectors

**UI client (browser):**

| Attack | Defense |
|---|---|
| Rapid form submission | Client pre-submit guard blocks before server call; server rate limiter blocks if bypassed |
| Page refresh during cooldown | Client restores cooldown from cookie on mount |
| Bypassing client-side checks | Server rate limiter still blocks; client cookie is UX only |
| Brute-force login | Rate limiter per key; auto-ban after threshold |
| Session hijacking | HMAC-signed cookie; HTTP-only prevents XSS access |

**Non-UI client (curl, scripts, bots):**

| Attack | Defense |
|---|---|
| Rapid requests | Server rate limiter blocks on every request (no cookie needed) |
| Brute-force login | Rate limiter per key; auto-ban after threshold |
| IP spoofing via headers | `cf-connecting-ip` is set by Cloudflare (cannot be spoofed); `x-forwarded-for` / `x-real-ip` trusted only from Caddy/Cloudflare (trusted proxy) |
| Banned IP access | `isIpBanned()` checked at top of every action; immediate rejection |
| Database flooding | In-memory rate limiter rejects before any DB query (except IP ban check) |

**Database protection:**

| Threat | Defense |
|---|---|
| SQL injection | All queries parameterized; no string interpolation |
| Unbounded queries | Repository functions return typed arrays; no unbounded SELECT without LIMIT |
| Concurrent writes | SQLite WAL mode allows concurrent reads during writes |
| Data corruption | Foreign keys enforced; transactions for multi-step operations |
| Disk exhaustion | Rate limiting prevents unbounded row creation in `rate_limit_violations`; periodic cleanup prunes old rows |

See [ip-banning.md](ip-banning.md) for the `banned_ips` and `rate_limit_violations` table schemas and migration details.

---

## Login Flows

### Admin Login

```
User visits / or /login
  │
  ├─ Already has admin session? → redirect /admin
  │
  └─ Shows LoginForm (defaults to "Party Code" tab)
       │
       User switches to "Username & Password" tab
       │
       Client: checkRateLimit() reads rl_until cookie
         └─ Active cooldown? → block submit, show countdown
         └─ No cooldown? → allow submit
       │
       User submits username + password
       │
       Server Action: login()
         ├─ isIpBanned(ip)? → return banned error
         ├─ rateLimiter.check()? → proceed or return cooldown error
         ├─ Query: guest by username
         ├─ Verify: scrypt password hash
         ├─ Check: guest.type === "admin"
         └─ Set session cookie: session={userId, type:"admin"}
              └─ Return { redirectTo: "/admin" } → client navigates
```

### Party Code Login

```
User visits / or /login
  │
  ├─ Already has party session? → redirect /rsvp
  │
  └─ Shows LoginForm (defaults to "Party Code" tab)
       │
       Client: checkRateLimit() reads rl_until cookie
         └─ Active cooldown? → block submit, show countdown
         └─ No cooldown? → allow submit
       │
       User enters party code (e.g. DEMO-1234)
       │
       Server Action: loginByPartyCode()
         ├─ isIpBanned(ip)? → return banned error
         ├─ rateLimiter.check()? → proceed or return cooldown error
         ├─ Query: party by code
         ├─ Verify: party exists and has members
         └─ Set session cookie: session={userId, partyId, type:"party"}
              └─ Return { redirectTo: "/home" } → client navigates
```

### Guest Login

Same flow as admin login, but with `type: "guest"` session and redirect to `/home`.

---

## Three Session Types

| Session Type | Created By | Access | Rate Limit Key |
|---|---|---|---|
| `admin` | Username/password login | All routes | `{ip}:login` |
| `party` | Party code login | `/(main)/*` + RSVP for party members | `{ip}:login` |
| `viewer` | Username/password login | `/(main)/*` only | `{ip}:login` |

Auth is enforced at the layout level (`isAdmin()` guard) and in every Server Action.

---

## Access Control

| Route | Guard | Redirect |
|---|---|---|
| `/admin/*` | `isAdmin()` | → `/login` |
| `/(main)/*` | `parseSession()` | → `/` (landing page) |

---

## Party Code Authentication

Party codes serve as both the **username and password** for party logins:

- Guests receive party codes via invitations or messages
- Each party has one code that grants access to RSVP for all party members
- Admins need visibility into party codes to manage delivery and troubleshoot access
- The party code is displayed in plaintext in the admin Parties panel with a copy button

When a party code is updated by an admin, the corresponding party user's password is also updated, and all existing sessions for that party are invalidated (via the `pwChangedAt` check).

---

## Files

| File | Role |
|---|---|
| `src/lib/auth.ts` | Session create/parse/destroy, `validateSessionForMutation`, password hash/verify |
| `src/lib/config.ts` | Environment variable validation (`ADMIN_USERNAME`, `ADMIN_PASSWORD`, `SESSION_SECRET`) |
| `src/lib/ip.ts` | `getClientIp()` — IP extraction from proxy headers |
| `src/lib/rate-limit.ts` | `getRateLimitConfig()`, `createRateLimiter()` — in-memory rate limiter |
| `src/lib/use-rate-limit-cooldown.ts` | Client hook — cookie read/create, pre-submit guard, countdown timer |
| `src/lib/constants.ts` | Default rate-limit and auto-ban thresholds |
| `src/lib/repository/ip-bans.ts` | IP ban + violation DB operations, `getAutoBanConfig()` |
| `src/app/login/page.tsx` | Login page — IP ban check before rendering |
| `src/app/login/login-form.tsx` | Client component — dual-tab form, owns `useRateLimitCooldown` |
| `src/app/login/actions.ts` | Server Actions — `login()`, `loginByPartyCode()`, `logout()`, auto-ban logic |
| `src/app/(main)/rsvp/actions.ts` | RSVP server action — rate limiting per party |
| `src/app/(main)/rsvp/rsvp-form.tsx` | RSVP client — calls `syncFromResponse(result.cooldownUntil)` |
| `src/app/(main)/help/actions.ts` | Help server action — rate limiting per party |
| `src/app/(main)/help/my-questions.tsx` | Help client — calls `syncFromResponse(result.cooldownUntil)` |
