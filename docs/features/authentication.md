# Authentication

- **Date:** 2026-06-30
- **Scope:** Login flow, session management, and access control

## Design Decision: Minimal Auth

Authentication uses a **cookie-based session** with a simple base64-encoded JSON payload. This is intentionally minimal — the project's primary purpose is to demonstrate a production-ready **deployment stack** (Docker + Caddy + Cloudflare Tunnel + SQLite), not auth patterns.

**Why not Auth.js (NextAuth)?**

| Factor | Decision |
|---|---|
| Scope | The starter exists to demo the deploy pipeline, not auth. Auth is incidental. |
| Vendor lock-in | 28 lines of custom code vs vendor-specific schemas and adapter config. Keeps the parent free to pick any auth library. |
| Complexity | Auth.js adds OAuth config, callback routes, a database adapter, provider keys — all noise for a demo deployment. |
| Replaceability | The current auth is trivial to swap. The code itself flags this with comments and the docs link to production alternatives. |

**Important:** This is not cryptographically signed. For production, swap to Auth.js, Lucia, or signed JWTs via `jose`.

## How Authentication Works

Auth has two independent parts — the **password** (a shared secret) and the **user database** (per-user profiles with roles).

### The Password: `ADMIN_PASSWORD`

- Set via the `ADMIN_PASSWORD` environment variable.
- **Default:** `"admin"` (if not set).
- It is a **shared secret** — every admin user authenticates with the same password. There are no per-user passwords.
- The password is compared in plaintext (`password !== ADMIN_PASSWORD`). No hashing.
- For production, replace with hashed per-user passwords (bcrypt/argon2) or OAuth.

### The User Database: `db-seed`

Tables are auto-created by the app on first connection. `npm run db:seed` (running `scripts/db-seed.ts`) inserts user **profiles** — email, name, and role — into the SQLite `users` table. It does **not** set passwords. The seed creates:

| Email | Name | Role |
|---|---|---|
| admin@example.com | Admin User | admin |
| alice@example.com | Alice Johnson | user |
| bob@example.com | Bob Smith | user |
| charlie@example.com | Charlie Brown | user |

Any user with role `admin` can log in using the shared `ADMIN_PASSWORD`.

## Implementation

### Session Creation (`src/lib/auth.ts`)

```typescript
function createSession(user: User): string {
  const session = { userId: user.id, role: user.role };
  return btoa(JSON.stringify(session));  // → base64 cookie value
}
```

### Session Parsing

```typescript
function parseSession(): Session | null {
  const store = cookies();
  const token = store.get("session")?.value;
  if (!token) return null;
  try {
    return JSON.parse(atob(token)) as Session;
  } catch {
    return null;
  }
}
```

On each request, the session cookie is base64-decoded and parsed as JSON. If parsing fails (invalid format, tampered data), `null` is returned and the user is treated as unauthenticated.

### Guard Functions

Two functions provide access control:

| Function | Returns | Purpose |
|---|---|---|
| `getCurrentUser()` | `User \| null` | Fetch full user row from DB for the session |
| `isAdmin()` | `boolean` | Check if session role is `"admin"` |

## Login Flow

```
User visits /login
  │
  ├─ Already has valid session? → redirect /admin
  │
  └─ Shows LoginForm (Client Component)
       │
       User submits email + password
       │
        Server Action: login()
          ├─ Query: SELECT * FROM users WHERE email = ?
          ├─ Password check: ADMIN_PASSWORD env var (defaults to "admin")
          │     (password !== ADMIN_PASSWORD) → return { error: "..." }
          │
          └─ Set cookie: session=<base64>
               └─ redirect /admin
```

### Files Involved

| File | Role |
|---|---|
| `src/app/login/page.tsx` | Login page — checks session, redirects if authenticated |
| `src/app/login/login-form.tsx` | Client form using `useFormState` from `react-dom` |
| `src/app/login/actions.ts` | Server Action — validates credentials, sets cookie |
| `src/lib/auth.ts` | Session read/create utilities |

### Demo Credentials

| Field | Value |
|---|---|---|
| Email | `admin@example.com` |
| Password | `ADMIN_PASSWORD` env var (defaults to `"admin"`) |

## Access Control

Admin routes are protected at the layout level in `src/app/admin/layout.tsx`:

```typescript
export default function AdminLayout({ children }) {
  if (!isAdmin()) redirect("/login");
  return <div className="admin-layout">...</div>;
}
```

This is a **server-side redirect** — the client never receives admin page content if unauthorised. The redirect runs before any page component renders.

## Session Cookie Attributes

| Attribute | Value |
|---|---|
| Name | `session` |
| HTTP-only | `true` |
| Path | `/` |
| Max-Age | 86400 (24 hours) |

## Security Considerations

These are accepted as part of the [intentionally minimal auth design](#design-decision-minimal-auth). For production, each should be addressed:

| Issue | Current State | Recommendation |
|---|---|---|
| Password model | Shared `ADMIN_PASSWORD` for all admin users | Per-user hashed passwords (bcrypt/argon2) or OAuth |
| Session signing | Unsigned base64 JSON | Use `jose` or similar to sign tokens |
| CSRF protection | None (Server Actions are same-origin by default) | Add CSRF token for state-changing operations |
| Brute force | No rate limiting on login | Add exponential backoff or CAPTCHA |
| Session invalidation | No logout mechanism | Add `destroySession()` and logout route |

For a production-grade auth solution, consider [Auth.js](https://authjs.dev), [Lucia](https://lucia-auth.com), or signed JWTs via `jose`. The current implementation is designed to be swapped without changing the rest of the application.
