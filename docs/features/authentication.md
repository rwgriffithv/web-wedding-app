# Authentication

- **Scope:** Three auth methods, session management, rate limiting

## Overview

The app has three authentication methods, each granting a different level of access:

| Method | Session Type | Access |
|---|---|---|
| Username & Password (admin) | `admin` | Full admin dashboard |
| Party Code | `party` | RSVP page — can submit for all party members |
| Username & Password (guest) | `guest` | View-only public pages, no RSVP |

---

## Implementation

### Session Token

Sessions use HMAC-signed JSON tokens stored in an HTTP-only cookie:

```typescript
interface Session {
  guestId?: number;   // Present for admin and guest sessions
  partyId?: number;   // Present for party sessions
  type: "admin" | "party" | "guest";
}
```

The token is signed with HMAC-SHA256 using `SESSION_SECRET` (from `.env`):

```
payload={"guestId":1,"type":"admin"}.<hmac-signature>
```

### Password Hashing

Passwords are hashed with `scrypt` (synchronous, memory-hard):

```typescript
function hashPassword(password: string): string {
  const salt = crypto.randomBytes(32).toString("base64");
  const hash = crypto.scryptSync(password, salt, 64).toString("base64");
  return `${salt}:${hash}`;
}
```

### Auth Functions

| Function | Returns | Purpose |
|---|---|---|
| `parseSession()` | `Session \| null` | Read and verify session cookie |
| `getCurrentGuest()` | `Guest \| null` | Fetch full guest row for session's `guestId` |
| `getPartyId()` | `number \| null` | Get party ID from party session |
| `isAdmin()` | `boolean` | Check if session type is `admin` |
| `createSession(data)` | `string` | Create a signed session token |
| `destroySession()` | `void` | Clear session cookie (logout) |

---

## Login Flows

### Admin Login

```
User visits / or /login
  │
  ├─ Already has admin session? → redirect /admin
  │
  └─ Shows LoginForm (defaults to "Username & Password" tab)
       │
       User submits username + password
       │
       Server Action: login()
         ├─ Query: guest by username
         ├─ Verify: scrypt password hash
         ├─ Check: guest.type === "admin"
         └─ Set cookie: session={guestId, type:"admin"}
              └─ Return { redirectTo: "/admin" } → client navigates
```

### Party Code Login

```
User visits / or /login
  │
  ├─ Already has party session? → redirect /rsvp
  │
  └─ Switches to "Party Code" tab
       │
       User enters party code (e.g. DEMO-1234)
       │
       Server Action: loginByPartyCode()
         ├─ Query: party by code
         ├─ Verify: party exists and has members
         └─ Set cookie: session={partyId, type:"party"}
              └─ Return { redirectTo: "/rsvp" } → client navigates
```

### Guest Login

```
User visits / or /login
  │
  ├─ Already has guest session? → redirect /home
  │
  └─ Shows LoginForm
       │
       User submits username + password (e.g. guest / guest)
       │
       Server Action: login()
         ├─ Query: guest by username
         ├─ Verify: scrypt password hash
         └─ Set cookie: session={guestId, type:"guest"}
              └─ Return { redirectTo: "/home" } → client navigates
```

---

## Rate Limiting

Login attempts are rate-limited per-username and per-party-code:

| Variable | Default | Description |
|---|---|---|
| `RATE_LIMIT_MAX_ATTEMPTS_DEFAULT` | 5 | Max failed attempts per window |
| `RATE_LIMIT_WINDOW_SECONDS_DEFAULT` | 60 | Window duration (seconds) |

Both are configurable via the admin Security page (`/admin/security`). The rate limiter uses in-memory counters per key (e.g. `192.168.1.1:user:admin`). The `site_config` values are read on every request via `getRateLimitConfig()` — changes take effect immediately.

The rate limiter is in-process memory (cleaned every 60 seconds). See [ip-banning.md](ip-banning.md) for the persistent violation tracking and auto-ban system that layers on top of this.

---

## IP Banning

Repeated rate-limit violations trigger automatic IP bans. This is a defense layer on top of the in-memory rate limiter:

| Mechanism | Storage | Purpose |
|---|---|---|
| Rate limiting | In-memory | Fast first line of defense — blocks repeated attempts per key |
| IP banning | SQLite (`banned_ips`) | Persistent ban that survives server restarts |
| Violation tracking | SQLite (`rate_limit_violations`) | Records lockout events for auto-ban threshold decisions |

When a client exceeds the auto-ban threshold (default: 5 lockouts within 1 hour), their IP is banned. The login page renders a minimal banned screen for banned IPs — no images, no background, no heavy assets.

Admins can manually ban/unban IPs and tune auto-ban settings from `/admin/security`.

See [ip-banning.md](ip-banning.md) for the full implementation details, auto-ban flow, and admin UI.

---

## Session Cookie

| Attribute | Value |
|---|---|
| Name | `session` |
| HTTP-only | `true` |
| Secure | `true` (unconditional — production uses HTTPS via Cloudflare Tunnel) |
| SameSite | `lax` |
| Path | `/` |
| Max-Age | Configurable via `session_max_hours` in admin dashboard (default 24h, max 24h) |

**Note:** The `Secure` flag is always set. Local development over plain HTTP (`npm run dev`) will not persist session cookies in the browser. Use a self-signed cert or accept that sessions won't persist during local development.

### Session Invalidation

Sessions include a `pwChangedAt` timestamp. On every request, `validateSession()` compares this against the user's current `password_changed_at` in the database. If the password has been changed since the session was issued, the session is rejected and the user must log in again.

---

## Party Code Authentication

Party codes serve as both the **username and password** for party logins. This is an intentional design decision:

- Guests receive party codes via invitations or messages
- Each party has one code that grants access to RSVP for all party members
- Admins need visibility into party codes to manage delivery and troubleshoot access
- The party code is displayed in plaintext in the admin Parties panel with a copy button for convenience

When a party code is updated by an admin, the corresponding party user's password is also updated, and all existing sessions for that party are invalidated (due to the `pwChangedAt` check).

---

## Files

| File | Role |
|---|---|
| `src/lib/auth.ts` | Session create/parse/destroy, password hash/verify |
| `src/lib/config.ts` | Environment variable validation (`ADMIN_USERNAME`, `ADMIN_PASSWORD`, `SESSION_SECRET`) |
| `src/lib/ip.ts` | `getClientIp()` — IP extraction from proxy headers |
| `src/lib/rate-limit.ts` | `getRateLimitConfig()`, `createRateLimiter()` — in-memory rate limiter |
| `src/lib/repository/ip-bans.ts` | IP ban + violation DB operations, `getAutoBanConfig()` |
| `src/app/login/page.tsx` | Login page — IP ban check before rendering |
| `src/app/login/login-form.tsx` | Client component — dual-tab form (credentials / party code) |
| `src/app/login/actions.ts` | Server Actions — `login()`, `loginByPartyCode()`, `logout()`, auto-ban logic |

## Access Control

| Route | Guard | Redirect |
|---|---|---|
| `/admin/*` | `isAdmin()` | → `/login` |
| `/(main)/*` | `parseSession()` | → `/` (landing page) |
