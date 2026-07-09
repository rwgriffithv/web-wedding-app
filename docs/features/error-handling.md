# Error Handling

- **Date:** 2026-07-03
- **Scope:** 404 page, error boundary, Server Action error patterns

## Overview

Next.js App Router provides two built-in error handling mechanisms for render errors, plus structured error returns for Server Actions:

| Mechanism | Type | Purpose |
|---|---|---|
| `not-found.tsx` | Server Component | 404 — unmatched routes or explicit `notFound()` |
| `error.tsx` | Client Component | Runtime errors during render |
| Server Action returns | Structured `{ success, error? }` | Form validation and business logic errors |

## 404 — Not Found

The custom 404 page (`src/app/not-found.tsx`) handles unmatched routes:

```
/                    →  Landing page
/login               →  Login page
/home                →  Wedding home
/lodging             →  Lodging recommendations
/dress-code          →  Dress code mood board
/rsvp                →  RSVP page
/media               →  Media gallery
/admin               →  Admin dashboard
/admin/site          →  Site config
/admin/parties       →  Party management
/admin/guests        →  Guest management
/admin/lodging       →  Lodging CRUD
/admin/dress-code    →  Dress code images
/admin/rsvp          →  RSVP responses
/admin/media         →  Media gallery CRUD
/api/health          →  Health check
/anything-else       →  404
```

## Error Boundary

`src/app/error.tsx` catches runtime errors thrown during rendering of any route or layout. This is a Client Component (`"use client"`) because the `error` and `reset` props are provided by the React error boundary runtime.

```
Error thrown in render → error.tsx mounts → shows message + "Try Again"
    │
    User clicks "Try Again" → reset() → re-render the segment
    │
    ├─ Success → page resumes
    └─ Error again → error.tsx re-mounts
```

## Server Action Error Pattern

All Server Actions return structured responses:

```typescript
interface ActionResponse {
  success?: boolean;
  error?: string;
  data?: T;
}
```

Errors are displayed inline in the form via the Client Component's `useActionState` state. This pattern is used consistently across all 8 action files:

| Action File | Example Error |
|---|---|
| `login/actions.ts` | "Invalid username or password." |
| `(main)/rsvp/actions.ts` | "You can only RSVP for members of your party." |
| `admin/guests/actions.ts` | "Failed to create guest. Username may already exist." |
| `admin/parties/actions.ts` | "Party name is required." |

## Error Handling Strategy

| Scenario | Mechanism | UX |
|---|---|---|
| Route not found | `not-found.tsx` | Clean 404 with "Go Home" link |
| Runtime error | `error.tsx` | Message + "Try Again" button |
| DB connection failure | `error.tsx` | Caught by error boundary, retryable |
| Form validation | Server Action return | Inline error message below form |
| Authorization failure | Layout guard redirect | Redirect to `/` or `/login` |
| API route error | `try/catch` → 503 JSON | `{ status: "error", database: "disconnected" }` |
