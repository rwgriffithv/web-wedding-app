# Authentication & Rate Limiting

- **Scope:** Session management, session revocation, rate limiting, IP banning, cookie architecture, client vs server responsibilities

## Overview

The app enforces access control through four layers:

1. **Session authentication** — HMAC-signed cookie identifies the user on every request
2. **Session revocation** — In-memory cache immediately invalidates sessions after password changes or IP bans
3. **Rate limiting** — In-memory sliding-window counters block repeated submissions
4. **IP banning** — Persistent SQLite-backed bans for IPs that exceed auto-ban thresholds

Each layer has a clear division of responsibility between server and client. The server is the source of truth for all security decisions. The client provides UX helpers (cooldown timers, pre-submit guards) that degrade gracefully if bypassed.

---

## Auth Function Naming Convention

All auth functions in `src/lib/auth.ts` follow a strict prefix convention. The prefix communicates what layer of validation the function performs and what side effects it has.

| Prefix | Layer | Side effects | Returns | Examples |
|---|---|---|---|---|
| `verify` | Cryptographic | None (pure/sync when possible) | Value or `null` | `verifyToken(token)`, `verifyTokenInCookie()`, `verifyPassword(pw, hash)` |
| `validate` | Business logic (DB) | DB read | Value or `null` | `validateSessionInDb(session?)` |
| `require` | Gatekeeper | Redirects or throws on failure | Value (never `null`) | `requireSessionOrRedirect()`, `requireSession("admin")`, `requireSession()` |

**`verify`** = "Is this token/password cryptographically authentic?" HMAC signature check, expiry check, scrypt comparison. No external state. Pure math.

**`validate`** = "Is this session still valid in the real world?" Checks against DB truth: user/party exists, type matches, password unchanged, IP not banned.

**`require`** = "Give me a session or reject." Returns a session on success. On failure, redirects (`redirect("/login")`) or returns `null` (for actions that handle errors themselves). Never returns a partially-valid state.

The call chain follows this progression:

```
verifyTokenInCookie()    →  verifyToken()           →  [crypto check]
        ↓
requireSessionOrRedirect() → requireSession()        →  [crypto + revocation]
        ↓
validateSessionInDb()      → validateSessionFields() →  [DB: user/party + pwChangedAt + IP ban]
```

Each layer adds more checks. The proxy (`proxy.ts`) calls `verifyToken()` + `isSessionRevoked()` directly. Layouts call `requireSessionOrRedirect()`. Server actions call `requireSession("admin")` or `validateSessionInDb()` depending on the operation's trust requirements.

---

## Cookie Architecture

There are two categories of cookies: **session cookies** (set and read by the server) and **rate-limit cooldowns** (stored in localStorage by the client only).

### Session Cookie

| Attribute | Value |
|---|---|
| Name | `session` |
| Set by | Server (via `Set-Cookie` header in Server Actions) |
| Read by | Server (on every request via `verifyTokenInCookie()`) |
| Content | HMAC-SHA256 signed JSON: `{"userId":1,"type":"admin","pwChangedAt":"..."}.<signature>` |
| HTTP-only | `true` — never accessible to JavaScript |
| Secure | `true` (unconditional — production uses HTTPS via Cloudflare Tunnel) |
| SameSite | `lax` |
| Path | `/` |
| Max-Age | Configurable via `SESSION_MAX_HOURS_KEY` in admin dashboard (default 24h, max 24h) |

The session cookie is the **only** cookie the server sets or reads for authentication. It contains:

```typescript
interface Session {
  userId: number;
  partyId?: number;   // Present for party sessions
  type: "admin" | "party" | "viewer";
  pwChangedAt?: string | null;  // Used for session invalidation on password change
}
```

**Session invalidation:** The session uses four-tier validation:

1. **Proxy (`proxy.ts`)** — Runs before any page renders. Crypto check (`verifyToken()`) + in-memory revocation check (`isSessionRevoked()`). Clears the cookie (sets `maxAge: 0`) for expired, tampered, or revoked sessions. Cannot use `next/headers` — reads cookies and headers from the raw `NextRequest`.
2. **Fast path (`verifyTokenInCookie()`)** — Crypto only (HMAC signature + expiry check). No database queries. Used by layouts via `requireSessionOrRedirect()` and by client components like `track-page-view.ts`.
3. **Mutation path (`validateSessionInDb(session?)`)** — Accepts an optional pre-parsed session to avoid double `verifyTokenInCookie()`. Validates session fields against DB truth: user/party exists, type matches, password unchanged, and IP not banned (via `isIpBanned()` against the `banned_ips` table). Called in all state-changing server actions (RSVP submission, admin CRUD, help questions, etc.).

This eliminates database queries from the hot path (every page load) while still catching password changes on mutations. The proxy handles cookie cleanup that Server Components cannot do (they cannot call `cookies().set()`).

**Note:** The `Secure` flag is always set. **HTTPS is required.** Local development over plain HTTP (`npm run dev`) will not persist session cookies in the browser. Production must use HTTPS via Cloudflare Tunnel.

### Rate-Limit Cooldowns (Client-Only)

| Storage Key Constant | Feature | Set by | Read by |
|---|---|---|---|
| `LOGIN_LIMIT_UNTIL_KEY` | Login | Client | Client |
| `RSVP_LIMIT_UNTIL_KEY` | RSVP | Client | Client |
| `QUESTION_LIMIT_UNTIL_KEY` | Questions | Client | Client |

These are **never set or read by the server**. They exist purely for client-side UX:

1. **Pre-submit guard:** `checkRateLimit()` reads localStorage before form submission to block the request before it reaches the server
2. **Reload persistence:** `useEffect` on mount reads localStorage to restore any active cooldown

**How they are created:**

```
Server action returns: { error: "...", action: "cooldown", cooldownUntil: 1690000000000 }
                                       ↓
Client receives response: syncFromResponse(cooldownUntil)
                                       ↓
Client persists:            localStorage.setItem(LOGIN_LIMIT_UNTIL_KEY, "1690000000000")
                                       ↓
Client starts timer:        setCooldown(45)  →  countdown displays "Please wait 45s..."
```

**Why the server doesn't set these:**

The server has no use for rate-limit cooldowns — it never reads them. If the server set them via `Set-Cookie` headers, there would be a race condition: with Next.js flight protocol, there is no guarantee the client has received the value by the time it reads it. By having the client persist from the `cooldownUntil` timestamp in the response, the client controls the timing and the race is eliminated.

**Why the cooldown still works despite being client-only:**

- A malicious client can delete the localStorage entry and submit again — but the server's in-memory rate limiter still blocks them. The localStorage entry is a UX convenience, not a security boundary.
- A client that never creates the entry (e.g. a script) still hits the server's rate limiter on every attempt.
- The entry's only job is to prevent *honest* users from accidentally submitting during a cooldown and seeing an error.

---

## Session Revocation

When an admin changes a user's password or bans an IP, active sessions for that user/IP must be immediately invalidated. Session revocation uses two in-memory caches that are checked on every request.

### Revocation Maps

| Map | Type | Key | Value | Populated By |
|---|---|---|---|---|
| `passwordRevocations` | `Map<number, number>` | `userId` | `Date.now()` timestamp | `revokeSessionsByPasswordChange(userId)` — called when admin changes a user's password |
| `recentBans` | `Set<string>` | IP address | (presence = revoked) | `revokeSessionsByIpBan(ip)` — called when admin bans an IP |

Both maps are in-memory and reset on server restart. This is intentional — the maps are a fast path for revoking *active* sessions. Expired sessions are already handled by the `exp` field in the cookie. Persistent bans survive restarts in the `banned_ips` SQLite table.

**Cleared by:**
- `clearPasswordRevocation(userId)` — when a user is deleted
- `unrevokeSessionsByIpBan(ip)` — when an IP is unbanned

### Revocation Check

```
isSessionRevoked(session, ip) → boolean
  1. session.userId != null && isSessionRevokedByPasswordChange(userId, pwChangedAt) → true
  2. isSessionRevokedByIpBan(ip) → true
  3. otherwise → false
```

`isSessionRevokedByPasswordChange(userId, sessionPwChangedAt)` compares the revocation timestamp against the session's `pwChangedAt`. If the revocation is newer, the session is revoked. This means sessions issued *after* a password change are not affected.

### Where Revocation Runs

| Layer | Function | What it checks | Cookie cleared? |
|---|---|---|---|
| **Proxy** (`proxy.ts`) | `verifyToken()` + `isSessionRevoked()` | Crypto + revocation | Yes (sets `maxAge: 0`) |
| **Layouts** (`requireSessionOrRedirect()`) | `verifyTokenInCookie()` | Crypto only (proxy handles revocation) | No (redirect only) |
| **Server Actions** (`requireSession("admin")`) | `isSessionRevoked()` inline | Crypto + revocation + admin type | No (returns null) |
| **API Routes** (`requireSession()`) | `isSessionRevoked()` inline | Crypto + revocation | No (returns null) |

**Why the proxy is necessary:** Server Components/layouts cannot call `cookies().set()`. When a session is revoked, the proxy clears the cookie in the HTTP response before the page renders. Without the proxy, a revoked session would cause a redirect loop: the layout would redirect to `/login`, which would see the (still-present) cookie and redirect back.

**The proxy and layouts check independently.** The proxy runs first (before any page renders). If the proxy clears the cookie, the layout's `requireSessionOrRedirect()` will find no cookie and redirect to `/login`. If the proxy somehow misses a case (e.g., API routes that skip the proxy matcher), the layout/action check catches it.

### Revocation Trigger Points

| Admin action | Function called | File |
|---|---|---|
| Password changed | `revokeSessionsByPasswordChange(userId)` | `admin/users/actions.ts` |
| User deleted | `clearPasswordRevocation(userId)` | `admin/users/actions.ts` |
| IP banned | `revokeSessionsByIpBan(ip)` | `admin/security/actions.ts` |
| IP unbanned | `unrevokeSessionsByIpBan(ip)` | `admin/security/actions.ts` |

### Known Limitations

**Client-side router cache (prefetch bypass):** Next.js App Router eagerly prefetches `<Link>` targets when they enter the viewport. Once prefetched, the RSC payload is cached on the client. When a banned user clicks a prefetched `<Link>`, the client-side router serves the cached payload without making a server request — the proxy never runs and the ban screen is not shown. This affects all nav-bar links (always visible, always prefetched) and any other links that entered the viewport before the ban. This is not a security vulnerability: the banned user only sees stale pre-ban data already rendered in their browser. The server is fully protected — it will not serve any new data, API calls are blocked, form submissions are rejected, and any full page navigation (reload, URL-bar, bookmark, `page.goto()`) immediately shows the ban screen. The serial E2E test suite (`session-revocation.spec.ts`) covers both cached-Link navigation (tests 4–6) and full-server-navigation (test 7) to verify this behavior. See [conventions.md](../architecture/conventions.md#http-cache-vs-rsc-cache) for the general HTTP cache vs RSC cache architecture.

**Multi-worker deployments:** The in-memory maps are per-process. If the server runs multiple workers (e.g. cluster mode), a ban in worker 1 won't be seen by worker 2. Current deployment is single-process — not an issue.

**Race between proxy and server actions:** An admin whose IP was just banned can still perform one server action before their next page navigation kicks them. The server action's `requireSession("admin")` now catches the ban (via in-memory check), so this window is closed.

---

## Rate Limiting

### Server-Side (Source of Truth)

The server maintains an in-memory fixed-window rate limiter per feature. Each limiter is a `Map` of key → `{ count, resetAt }` entries. Expired entries are pruned by a hardcoded 60-second cleanup interval — this is housekeeping, not a security boundary (the `check()` function also evicts the oldest entry inline when the store exceeds 10,000 entries).

**Configurable via admin UI** (`site_config`):

| Parameter | Config Key Constant | Defaults |
|---|---|---|
| Max attempts (login) | `LOGIN_RATE_LIMIT_MAX_KEY` | 5 |
| Window (login) | `LOGIN_RATE_LIMIT_WINDOW_SECONDS_KEY` | 60s |
| Max attempts (RSVP) | `RSVP_RATE_LIMIT_MAX_KEY` | 10 |
| Window (RSVP) | `RSVP_RATE_LIMIT_WINDOW_SECONDS_KEY` | 60s |
| Max attempts (questions) | `QUESTION_RATE_LIMIT_MAX_KEY` | 5 |
| Window (questions) | `QUESTION_RATE_LIMIT_WINDOW_SECONDS_KEY` | 60s |

Changes take effect immediately — `getRateLimitConfig()` reads from `site_config` on every request.

**How it works:**

```
Client submits form
  │
  Server action receives request
  │
  ├─ Check IP ban: isIpBanned(ip)?
  │    └─ YES → return { error: "ip banned", action: "refresh" }
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
  │         │    └─ YES (just banned) → return { error: "ip banned", action: "refresh" }
  │         │
  │         └─ return { error: "Too many attempts.", action: "cooldown", cooldownUntil: ... }
  │
  └─ Action proceeds normally
```

The `action` field in the response tells the client how to react:

| `action` | Meaning | Client Behavior |
|---|---|---|
| `"refresh"` | Page needs re-render (e.g. IP was just banned) | `router.refresh()` — re-fetches the page from server |
| `"cooldown"` | Rate limited, wait before retrying | `syncFromResponse(cooldownUntil)` — persists to localStorage, starts countdown |
| *(undefined)* | Normal success or validation error | Display error message, no special handling |

**Configuration changes take effect immediately** — `getRateLimitConfig()` reads from `site_config` on every request. No restart required.

### Client-Side (UX Helper)

The client provides two mechanisms that improve the user experience without affecting security:

**1. Pre-submit guard (`checkRateLimit()`):**

```typescript
function checkRateLimit(): boolean {
  const remaining = getRateLimitRemaining(key);
  if (remaining > 0) {
    setCooldown(remaining);
    return true;  // blocked
  }
  return false;  // allowed
}
```

Called before every form submission. If localStorage indicates an active cooldown, the form is blocked and the server is never called. This prevents unnecessary round-trips and gives the user an immediate "Please wait Xs..." message.

**2. Mount-time restoration (`useEffect`):**

```typescript
useEffect(() => {
  const remaining = getRateLimitRemaining(key);
  if (remaining > 0) setCooldown(remaining);
}, [key]);
```

On page load, reads localStorage to restore any active cooldown. This handles the case where the user refreshes the page during a cooldown — without this, the cooldown would appear to reset.

**3. Response sync (`syncFromResponse()`):**

```typescript
function syncFromResponse(cooldownUntil: number): void {
  const remaining = Math.ceil((cooldownUntil - Date.now()) / 1000);
  if (remaining > 0) {
    localStorage.setItem(key, String(cooldownUntil));
    setCooldown(remaining);
  }
}
```

Called when the server returns `action: "cooldown"`. Persists the cooldown to localStorage from the server's timestamp and starts the countdown. The key is feature-specific (`LOGIN_LIMIT_UNTIL_KEY` for login, `RSVP_LIMIT_UNTIL_KEY` for RSVP, `QUESTION_LIMIT_UNTIL_KEY` for questions).

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
│  Layer 3: proxy.ts (Node.js runtime)                │
│  Session cookie: crypto check + revocation check    │
│  Clears cookie for expired/tampered/revoked sessions│
│  Trust: untrusted input, validated at every step    │
└────────────────────────┬────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────┐
│  Layer 4: Next.js Server Actions                    │
│  IP ban check → rate limiter → auto-ban → auth      │
│  Trust: untrusted input, validated at every step    │
└────────────────────────┬────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────┐
│  Layer 5: SQLite Database                           │
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
  return { error: "ip banned", action: "refresh" };
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
    return { error: "IP banned", action: "refresh" };
  }
  return { error: "Too many attempts.", action: "cooldown", cooldownUntil: ... };
}
```

The rate limiter is an in-memory `Map` per feature name. Keys are namespaced by IP and user/party identifier. The check is synchronous and fast — no database query.

**Step 3 — Authentication (two-tier):**

For **read-only** operations (page loads, layouts, API reads):
```typescript
const session = await verifyTokenInCookie();  // crypto only, no DB
if (!session) return { error: "Not authenticated." };
```

For **admin mutations** (CRUD, config save, ban/unban):
```typescript
const session = await requireSession("admin");  // crypto + admin type + revocation check
if (!session) return { error: "Unauthorized" };
if (!(await validateSessionInDb(session))) return { error: "Session expired" };  // DB: user exists, type match, pwChangedAt, IP ban
```

For **party mutations** (RSVP submit, help questions):
```typescript
const hotSession = await requireSession();  // crypto + in-memory revocation (~0ms)
if (!hotSession) { await destroySession(); return redirect; }
const session = await validateSessionInDb(hotSession);  // DB: party exists, pwChangedAt, IP ban
if (!session) { await destroySession(); return redirect; }
```

`requireSession("admin")` includes an in-memory revocation check (password changes + IP bans) in addition to the crypto and type check. `validateSessionInDb()` checks DB truth: user/party existence, type match, password unchanged, and IP not banned in `banned_ips` table. Admin actions use `requireSession("admin")` + `validateSessionInDb(session)` for defense-in-depth. Party actions use `requireSession()` + `validateSessionInDb(session)` — the same two-step hot+cold pattern.

**Step 4 — Business logic and database write:**

All SQL queries use parameterized statements. No string interpolation in queries. The repository pattern centralizes all database access.

### How This Protects Against Different Attack Vectors

**UI client (browser):**

| Attack | Defense |
|---|---|
| Rapid form submission | Client pre-submit guard blocks before server call; server rate limiter blocks if bypassed |
| Page refresh during cooldown | Client restores cooldown from localStorage on mount |
| Bypassing client-side checks | Server rate limiter still blocks; client cookie is UX only |
| Brute-force login | Rate limiter per key; auto-ban after threshold |
| Session hijacking | HMAC-signed cookie; HTTP-only prevents XSS access |
| Stale session after password change | In-memory revocation map + proxy clears cookie |
| Stale session after IP ban | In-memory revocation set + proxy clears cookie + redirects to `/login` |

**Non-UI client (curl, scripts, bots):**

| Attack | Defense |
|---|---|
| Rapid requests | Server rate limiter blocks on every request (no cookie needed) |
| Brute-force login | Rate limiter per key; auto-ban after threshold |
| IP spoofing via headers | `cf-connecting-ip` is set by Cloudflare (cannot be spoofed); `x-forwarded-for` / `x-real-ip` trusted only from Caddy/Cloudflare (trusted proxy) |
| Banned IP access | `isIpBanned()` checked at top of every action; immediate rejection |
| Database flooding | In-memory rate limiter rejects before any DB query (except IP ban check) |
| Using revoked session token | `requireSession("admin")` checks revocation maps; proxy + `requireSession()` check revocation |

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
  ├─ proxy.ts: crypto-valid cookie, not revoked → pass through
  │  login/page.tsx: requireSession() → session found → redirect /admin
  │
  └─ proxy.ts: no cookie or revoked → pass through (or redirect /login)
     login/page.tsx: requireSession() → null → shows LoginForm
       │
       User switches to "Username & Password" tab
       │
        Client: checkRateLimit() reads LOGIN_LIMIT_UNTIL_KEY localStorage entry
          └─ Active cooldown? → block submit, show countdown
          └─ No cooldown? → allow submit
        │
        User submits username + password
       │
       Server Action: login()
         ├─ isIpBanned(ip)? → return banned error
         ├─ rateLimiter.check()? → proceed or return cooldown error
          ├─ Query: user by username
          ├─ Verify: scrypt password hash
          ├─ Check: user.type === "admin"
         └─ Set session cookie: session={userId, type:"admin"}
              └─ Return { redirectTo: "/admin" } → client navigates
```

### Party Code Login

```
User visits / or /login
  │
  ├─ proxy.ts: crypto-valid cookie, not revoked → pass through
  │  login/page.tsx: requireSession() → session found → redirect /home
  │
  └─ proxy.ts: no cookie or revoked → pass through (or redirect /login)
     login/page.tsx: requireSession() → null → shows LoginForm
       │
        Client: checkRateLimit() reads LOGIN_LIMIT_UNTIL_KEY localStorage entry
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

Same flow as admin login, but with `type: "viewer"` session and redirect to `/home`.

---

## Three Session Types

| Session Type | Created By | Access | Rate Limit Key |
|---|---|---|---|
| `admin` | Username/password login | All routes | `{ip}:login` |
| `party` | Party code login | `/(main)/*` + RSVP for party members | `{ip}:login` |
| `viewer` | Username/password login | `/(main)/*` only | `{ip}:login` |

Auth is enforced at the layout level (`requireSessionOrRedirect()` guard) and in every Server Action.

---

## Access Control

| Route | Guard | Redirect |
|---|---|---|
| `/admin/*` | `requireSessionOrRedirect("admin")` (layout) + `requireSession("admin")` (actions) | → `/login` (no session/revoked) or `/home` (wrong type) |
| `/(main)/*` | `requireSessionOrRedirect()` (layout) + `requireSession()` + `validateSessionInDb(session)` (actions) | → `/login` |
| `/api/media/[...path]` | `requireSession()` → 401 JSON | N/A (JSON response) |
| `/login` | `requireSession()` → redirect to `/admin` or `/home` | N/A (already logged in) |

---

## Party Code Authentication

Party codes serve as both the **username and password** for party logins:

- Guests receive party codes via invitations or messages
- Each party has one code that grants access to RSVP for all party members
- Admins need visibility into party codes to manage delivery and troubleshoot access
- The party code is displayed in plaintext in the admin Parties panel with a copy button

When a party code is updated by an admin, the corresponding party user's password is also updated, and all existing sessions for that party are invalidated (via the `pwChangedAt` check).

---

## Design Decisions

### In-memory rate limiter resets on server restart

The rate limiter uses an in-memory `Map` that resets when the Node.js process restarts (Docker container restart, deployment). Violations and bans persist in SQLite, so auto-ban still works across restarts — but the per-window attempt counter resets. This is a deliberate simplicity trade-off: persistent rate limiting would require SQLite reads on every request, negating the performance benefit of the in-memory limiter.

### No rate limiting on admin actions

Admin server actions (ban, unban, config save, CRUD operations) have no rate limiting. The admin panel is already protected by session authentication, and rate limiting admin endpoints adds no meaningful security. An attacker with a compromised admin session could rapidly ban IPs or change config, but this is mitigated by the session auth requirement and the ability to manually unban IPs.

### `SESSION_SECRET` is admin responsibility

`SESSION_SECRET` must be set in the environment. A minimum length of 32 characters is enforced at startup. Changing the secret invalidates all active sessions (existing HMAC signatures become invalid). The secret is used to sign session cookies via HMAC-SHA256.

### Proxy runs in Node.js, not Edge Workers

Next.js 16 uses `proxy.ts` (not the deprecated `middleware.ts`) for request interception. The proxy runs in Node.js runtime — the same process as the rest of the server. This means it shares the same in-memory revocation maps as the server actions. No `runtime` config export is allowed in proxy files (Next.js 16 throws an error). The proxy reads cookies and headers from the raw `NextRequest`, not from `next/headers` (which is only available in Server Components/Route Handlers).

The proxy sets `Cache-Control: no-store` on every page response. This prevents the browser from caching authenticated content on disk, so the proxy always runs on every navigation (back button, reload, direct URL). API routes (`/api/media/*`, `/api/login-background`) are excluded from the proxy matcher and set their own cache headers. See [conventions.md](../architecture/conventions.md#http-cache-vs-rsc-cache) for the full caching architecture.

### `requireSessionOrRedirect()` does not clear cookies

Server Components/layouts cannot call `cookies().set()` — doing so throws `"Cookies can only be modified in a Server Action or Route Handler"`. The `requireSessionOrRedirect()` function only redirects on failure. Cookie clearing is handled by `proxy.ts`, which runs before any page renders and has direct access to the response headers.

### `login/page.tsx` uses `requireSession()`, not `requireSessionOrRedirect()`

`/login` is a public page that should show the login form when no session exists. If it used `requireSessionOrRedirect()`, a revoked-but-crypto-valid cookie would cause a redirect loop: login sees session → redirects to `/admin` → admin layout sees revoked → redirects to `/login`. Using `requireSession()` (which returns null instead of redirecting) breaks the loop.

### `requireSession()` hot path for party actions

RSVP and Help actions use the same hot+cold auth pattern as admin actions: `requireSession()` (crypto + in-memory revocation at ~0ms) → `validateSessionInDb(session)` (DB truth). This catches IP bans immediately at the in-memory layer (`recentBans` Set) without waiting for the DB query. Party actions had previously skipped the hot path, relying solely on `validateSessionInDb()` — which checks IP bans via DB but misses in-memory-only revocations (password changes via `passwordRevocations` Map).

### `tryAutoBan` lives in the repository layer

`tryAutoBan()` was extracted from `login/actions.ts` into `src/lib/repository/ip-bans.ts`. This places the business logic (threshold check → ban) alongside the DB operations it orchestrates (`getViolationCount`, `banIp`, `deleteOldViolations`). The login action simply calls `tryAutoBan(ip)` after recording a violation — it doesn't need to know the auto-ban threshold logic.

---

## Files

| File | Role |
|---|---|
| `src/proxy.ts` | Cookie-clearing proxy — runs before page renders, checks revocation, clears cookie for invalid/revoked sessions |
| `src/lib/auth.ts` | Session create/parse/destroy, `requireSession("admin")`, `requireSession()` (API), `requireSessionOrRedirect()` (layout), `validateSessionInDb()`, `verifyToken()`, `verifyTokenInCookie()`, password hash/verify |
| `src/lib/session-revocation.ts` | In-memory revocation maps + `isSessionRevoked(session, ip)` pure boolean check |
| `src/lib/ip.ts` | `getClientIp()` — IP extraction from proxy headers |
| `src/lib/env.ts` | Environment variable validation (`ADMIN_USERNAME`, `ADMIN_PASSWORD`, `SESSION_SECRET`) |
| `src/lib/rate-limit.ts` | `getRateLimitConfig()`, `createRateLimiter()` — in-memory rate limiter |
| `src/hooks/rate-limit.ts` | Client hook — localStorage read/write, pre-submit guard, countdown timer |
| `src/lib/constants.ts` | Default rate-limit and auto-ban thresholds |
| `src/lib/repository/ip-bans.ts` | IP ban + violation DB operations, `getAutoBanConfig()`, `tryAutoBan()` |
| `src/app/login/page.tsx` | Login page — `requireSession()` prevents redirect loop with revoked cookies |
| `src/app/login/login-form.tsx` | Client component — dual-tab form, owns `useRateLimitCooldown` |
| `src/app/login/actions.ts` | Server Actions — `login()`, `loginByPartyCode()`, `logout()` |
| `src/app/(main)/rsvp/actions.ts` | RSVP server action — rate limiting per party |
| `src/app/(main)/rsvp/rsvp-form.tsx` | RSVP client — calls `syncFromResponse(result.cooldownUntil)` |
| `src/app/(main)/help/actions.ts` | Help server action — rate limiting per party |
| `src/app/(main)/help/my-questions.tsx` | Help client — calls `syncFromResponse(result.cooldownUntil)` |
| `src/app/admin/users/actions.ts` | User CRUD — calls `revokeSessionsByPasswordChange()` and `clearPasswordRevocation()` |
| `src/app/admin/security/actions.ts` | Ban/unban — calls `revokeSessionsByIpBan()` and `unrevokeSessionsByIpBan()` |
