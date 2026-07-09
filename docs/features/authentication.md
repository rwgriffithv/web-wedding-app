# Authentication

- **Date:** 2026-07-03
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
| `RATE_LIMIT_MAX` | 5 | Max failed attempts per window |
| `RATE_LIMIT_WINDOW_MS` | 60000 | Window duration (60 seconds) |

The rate limiter is in-process memory (cleaned every 5 minutes). In production with multiple instances, replace with a Redis-backed rate limiter.

---

## Session Cookie

| Attribute | Value |
|---|---|
| Name | `session` |
| HTTP-only | `true` |
| Path | `/` |
| Max-Age | 86400 (24 hours) |

---

## Files

| File | Role |
|---|---|
| `src/lib/auth.ts` | Session create/parse/destroy, password hash/verify |
| `src/lib/config.ts` | Environment variable validation (`ADMIN_USERNAME`, `ADMIN_PASSWORD`, `SESSION_SECRET`) |
| `src/app/login/page.tsx` | Login page — redirects if already authenticated |
| `src/app/login/login-form.tsx` | Client component — dual-tab form (credentials / party code) |
| `src/app/login/actions.ts` | Server Actions — `login()`, `loginByPartyCode()`, `logout()` |

## Access Control

| Route | Guard | Redirect |
|---|---|---|
| `/admin/*` | `isAdmin()` | → `/login` |
| `/(main)/*` | `parseSession()` | → `/` (landing page) |
