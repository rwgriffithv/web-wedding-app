# Codebase Conventions

Naming rules, return types, error handling, and structural patterns used across repository and action layers.

---

## Naming Conventions by Layer

### Repository Functions (`src/lib/repository/`)

SQL-layer functions that map directly to database operations. Use **CRUD verbs**.

| Pattern | Purpose | Examples |
|---|---|---|
| `create*(...)` | INSERT, returns the new row | `create()`, `createParty()`, `createUser()`, `createGuest()`, `createTab()`, `createImage()` |
| `get*()` / `getAll*()` | SELECT single or many, returns typed row(s) | `getAll()`, `getById()`, `getAllGuests()`, `getImages()`, `getResponseByGuest()` |
| `update(id, data)` | UPDATE fields, returns `void` | `update()`, `updateUser()`, `updateGuest()`, `updateParty()`, `updateTab()` |
| `delete*(id)` | DELETE, returns `void` | `deleteItem()`, `deleteParty()`, `deleteGuest()`, `deleteUser()`, `deleteTab()`, `deleteImage()` |
| `deleteEmpty*(id)` | Conditional DELETE | `deleteEmptyParty()` |
| `delete*(parentId)` | Bulk DELETE by parent | `deleteUsersByPartyId()` |
| `swap*SortOrder(a, b)` | Transactional position swap | `swapSortOrder()`, `swapItemSortOrder()`, `swapTabSortOrder()` |
| `setConfig(k, v)` | Key-value upsert (site_config) | `setConfig()` |
| `recordLogin(id)` | Side-effect update | `recordLogin()`, `incrementPageViews()` |

**Repository layer: never use `remove`** — always `delete*`. The `remove*` verb is valid in the action layer (e.g. `removeUser`, `removeGuest`, `removeParty`) but never in the repository layer.

### Server Actions (`src/app/admin/*/actions.ts`)

User-facing mutation handlers. Use **domain verbs** that describe the user's intent.

| Pattern | Purpose | Examples |
|---|---|---|
| `add*(formData)` | Create a new entity | `addItem()`, `addOption()`, `addImage()`, `addUser()`, `addGuest()` |
| `update*(formData)` | Modify an existing entity | `updateItem()`, `updateOption()`, `updateGuest()`, `updateUser()`, `updateParty()` |
| `remove*(formData)` | Remove an entity (alternative) | `removeUser()`, `removeGuest()`, `removeParty()` |
| `delete*(formData)` | Remove an entity | `deleteItem()`, `deleteOption()`, `deleteTab()`, `deleteImage()` |
| `move*(formData)` | Reorder via up/down | `moveItem()`, `moveTab()`, `moveOption()` |
| `save*(formData)` | Persist config or settings | `saveSiteConfig()` |
| `rename*(formData)` | Change display name/slug | `renameTab()` |
| `create*Inline(formData)` | Create + return ID for immediate UI use | `createTabInline()`, `createPartyInline()` |
| `submit*(formData)` | Submit a response or form | `submitRsvp()` |

**Batch-capable actions keep singular names.** When an `add*` action handles both single and multiple items, use `FormData.get()` for one item or `FormData.getAll()` for many — the function name stays singular (`addImage`, not `addImages`). The form component decides whether it submits one value or many; the action doesn't need to care.

**Repository layer may use plural variants for different implementations.** While actions abstract over batch vs single (the caller doesn't care), the repository layer may have separate functions when the implementation differs. For example, `createImage` wraps each insert in its own transaction, while `createImages` wraps all inserts in a single transaction. The action calls the appropriate one based on input count.

```
addImage (action, singular)  →  createImage (repo, single transaction)
                              →  createImages (repo, batch transaction)
```

This distinction exists because:
- **Actions** are user-facing — the user adds "an image" or "images"; the function name reflects intent, not implementation.
- **Repository functions** are implementation-facing — batch vs single have different transaction strategies, error handling, and performance characteristics.

### Why They Differ

**Actions use domain verbs** (`add`, `save`, `move`) because they describe what the *user* is doing — adding a photo, saving settings, moving an item up.

**Repository functions use CRUD verbs** (`create`, `update`, `delete`) because they describe what the *database* is doing — inserting a row, updating fields, deleting a record.

The same entity can have different names at each layer:

```
addImage (action)  →  createImage (repo)
deleteImage (action)  →  deleteImage (repo)
deleteOption (action)  →  deleteOption (repo)
```

When an action name collides with a repo name in the same import scope, alias the repo import:

```typescript
import { deleteItem as deleteItemRepo } from "@/lib/repository/media";
// ...
deleteItemRepo(id);
```

---

## Return Types

### Repository Functions

| Operation | Returns |
|---|---|
| `create*(...)` | The new row (typed interface) |
| `get*(...)` | Typed row or `undefined` |
| `getAll*()` | Array of typed rows |
| `update(...)` | `void` |
| `delete*(...)` | `void` |
| `swap*SortOrder(...)` | `void` |
| `setConfig(...)` | `void` |

**Never return the updated row from `update*`** — no caller uses the return value.

### Server Actions

All actions return a state object (not raw data):

```typescript
interface SomeState { success?: boolean; error?: string; /* optional extra fields */ }
```

Every action follows the same signature:

```typescript
export async function someAction(prevState: SomeState | null, formData: FormData): Promise<SomeState>
```

Common patterns:

```typescript
// Auth check
const session = await requireSession("admin");
if (!session) return { success: false, error: "Unauthorized" };

// Validation
const id = getInt(formData, "id");
if (id === null) return { success: false, error: "Invalid ID." };

// Success
return { success: true };

// Error (caught)
return { success: false, error: "Failed to do something." };
```

---

## FormData Extraction Helpers

Server actions use typed helpers from `src/lib/form-data.ts` to extract values from `FormData`. The naming describes extraction behavior, not business logic:

| Function | Returns | Use when |
|---|---|---|
| `getRequiredString(fd, key)` | `string \| null` | The field must be non-empty; missing = a "required field" validation error |
| `getOptionalString(fd, key)` | `string` | The field may be missing or empty; a downstream guard handles validation |
| `getInt(fd, key)` | `number \| null` | The field must be a positive integer; missing = a "required field" validation error |

**When to use `getOptionalString` even though the field is required by business logic:**

```typescript
// The direction field IS required, but the guard validates it alongside other
// parameters in a combined check. The error is "Invalid parameters," not
// "direction is required."
const direction = getOptionalString(formData, "direction");
if (id === null || !direction || (direction !== "up" && direction !== "down")) {
  return { success: false, error: "Invalid parameters." };
}

// The URL field IS required, and the very next line treats missing = error.
// Here getRequiredString is the right choice — extraction and enforcement
// are a single thought unit.
const url = getRequiredString(formData, "url");
if (!url) {
  return { success: false, error: "URL is required." };
}
```

The distinction: `getRequiredString` signals "I expect this value; missing means the form is broken." `getOptionalString` signals "I'll accept whatever's there; my guard handles all validation." Use `getRequiredString` when the field is validated in isolation with a "required" error. Use `getOptionalString` when the field is part of a group validated together, or when empty is a valid intermediate value (e.g. clearing a field).

---

## Error Handling

### Repository Layer

**Throws on not-found.** Every `update*`, `delete*`, and `swap*` function throws `Error` if the row doesn't exist:

```typescript
const result = db.prepare("UPDATE ... WHERE id = ?").run(...values);
if (result.changes === 0) throw new Error(`Entity ${id} not found`);
```

This is intentional — callers (actions) wrap in try/catch and return `{ success: false, error }` to the UI.

### Action Layer

**Catches and returns.** Every action wraps repo calls in try/catch:

```typescript
try {
  someRepo(id);
  revalidatePath("/admin/some-page");
  return { success: true };
} catch (error) {
  console.error(error);
  return { success: false, error: "Failed to do something." };
}
```

---

## Transaction Patterns

### When to Wrap in a Transaction

| Pattern | Transaction? | Why |
|---|---|---|
| `create*` with auto sort_order | Yes | Read max + insert must be atomic |
| `delete*` with thumbnail cleanup | Yes | Read thumbnail + delete row must be atomic |
| `swap*SortOrder` | Yes | Two UPDATEs must both succeed |
| `delete*Tab` (cascading) | Yes | Delete items + delete tab must be atomic |
| `update*` with side effects | Yes | Update row + update related entity must be atomic |
| Simple `update*` (single UPDATE) | No | Single statement is already atomic |
| Simple `delete*` (single DELETE) | No | Single statement is already atomic |

### Pattern

```typescript
export function deleteOption(id: number): void {
  const db = getDb();
  db.transaction(() => {
    const item = db.prepare("SELECT ...").get(id);
    if (!item) throw new Error(`Entity ${id} not found`);
    // cleanup
    db.prepare("DELETE FROM ... WHERE id = ?").run(id);
  })();
}
```

Note the `()` invocation — `db.transaction()` returns a function that must be called.

---

## Thumbnail Cleanup

Entities with `thumbnail_url` columns (`media_items`, `lodging_options`, `dress_code_images`) must delete thumbnail files from disk when the entity is deleted.

```typescript
function deleteThumbnail(thumbnailUrl: string | null): void {
  if (!thumbnailUrl || !thumbnailUrl.startsWith("/api/media/thumbnails/")) return;
  const filename = thumbnailUrl.replace("/api/media/thumbnails/", "");
  fs.promises.unlink(path.join(THUMBNAILS_DIR, filename))
    .catch((err) => { console.warn("Failed to delete thumbnail:", err); });
}
```

Called inside the delete transaction, before the DELETE statement. Failures are caught and logged — thumbnail cleanup should never block entity deletion.

---

## CSS Conventions

**No Tailwind CSS.** This project uses hand-crafted CSS utility classes defined in `src/app/globals.css`. Do not use Tailwind class names — they will have no effect. When converting inline styles, use only the utility classes that exist in `globals.css` (e.g. `.flex-row`, `.gap-2`, `.mb-2`, `.text-sm`, `.cursor-pointer`). If a needed utility doesn't exist, add it to the `/* Utility Classes */` section at the bottom of `globals.css`.

**Inline styles are acceptable** when:
- Referencing CSS custom properties: `style={{ color: "var(--color-muted)" }}`, `style={{ borderRadius: "var(--radius)" }}`
- Setting dynamic values: `style={{ width: computedWidth }}`, `style={{ objectFit: "cover" }}`
- Using Next.js Image props that require inline: `style={{ objectFit: "cover" }}`

Convert to utility classes only when the style is **static and reusable** (e.g. `marginBottom: "1rem"` → `className="mb-2"`). Do not create utility classes for one-off values or values that depend on CSS variables.

### Full-Screen Sections
Use `100dvh` with `100vh` fallback for full-screen sections (home hero, landing):
```css
.min-h-screen { min-height: 100dvh; min-height: 100vh; }
```

### Safe Area (Safari iOS)
Use `env(safe-area-inset-bottom)` for home indicator clearance on notch devices:
```css
margin-bottom: 2rem;
margin-bottom: calc(2rem + env(safe-area-inset-bottom, 0px));
```

### Backdrop Filter
Always include `-webkit-backdrop-filter` alongside unprefixed version:
```css
-webkit-backdrop-filter: blur(10px);
backdrop-filter: blur(10px);
```

### Mobile Breakpoint
- **640px** — Used for mobile-specific adjustments. Avoid 768px (reserved for admin sidebar).
- Use `@media (max-width: 640px)` for phone-specific overrides.

### Admin Form CSS
- Admin-only forms use `.admin-form` for consistent left-aligned labels
- Admin forms use `.admin-fieldset` for the 3-fieldset layout (Login, Home, RSVP)

### Admin Collapsible Sections (`<details>`)

Admin pages use `<details className="admin-section">` for collapsible cards. The `open` attribute controls the default state.

| Content type | Default | Rationale |
|---|---|---|
| Data lists / tables | **open** | Primary content — why you navigated to the page |
| "Add new" forms | **open** | Action-oriented — likely why you're there |
| Settings / config forms | **collapsed** | Set once, rarely revisited; would clutter the page |
| Reference / informational | **collapsed** | Supplementary, not always needed |
| Conditional sections (`count > 0`) | **collapsed** | Secondary by nature; only relevant when data exists |

Consistent examples across the codebase:

- **Schedule, Lodging, Dress Code, Media pages**: Settings and Rate Limiting collapsed, forms + lists open
- **RSVP page**: Settings and Rate Limiting collapsed, Status table open
- **Help page**: Rate Limiting collapsed, Add FAQ / FAQ Items / Questions open
- **Security page**: Auto-Ban / Login Rate Limiting / Session & Tracking collapsed, Violations and Banned IPs open, Ban IP collapsed
- **Users page**: Add User and Users list open, System Accounts and Activity collapsed

---

## File Organization

```
src/app/admin/{entity}/
├── page.tsx          # Server Component — reads data, renders layout
├── actions.ts        # Server Actions — auth, validation, mutations
├── {entity}-form.tsx # Client Component — form with useActionState (if needed)
├── {entity}-list.tsx # Client Component — list with inline editing (if needed)
└── __tests__/
    └── {entity}-form.test.tsx

src/components/
├── {component}.tsx
└── __tests__/
    └── {component}.test.tsx

src/lib/repository/
├── {entity}.ts       # SQL queries, typed returns, transactions
└── __tests__/
    └── {entity}.test.ts
```

- `page.tsx` imports from `repository/` directly (Server Component, no client boundary)
- `actions.ts` imports from `repository/` (Server Actions, also server-only)
- `*-form.tsx` and `*-list.tsx` use `"use client"` — never import from `repository/` directly; they call actions

### Test Files

All test files go in `__tests__/` subdirectories, never colocated with source files. This keeps source directories clean and applies consistently across all layers of the codebase.

- Component tests: `src/components/__tests__/{component}.test.tsx`
- Route tests: `src/app/(main)/{route}/__tests__/{component}.test.tsx`
- Admin route tests: `src/app/admin/{entity}/__tests__/{entity}-form.test.tsx`
- Repository tests: `src/lib/repository/__tests__/{entity}.test.ts`
- Library tests: `src/lib/__tests__/{module}.test.ts`

Tests import from their sibling directory using `../` relative paths. Vitest picks up `*.test.ts(x)` files from anywhere in the project.

## Database Migrations

**Never put migration code in the webapp or deploy scripts.** Migrations are manual operator tasks, like backups.

- Write idempotent scripts in `scripts/migrate-*.sh`
- Run them manually on the production server **before** deploying: `./scripts/migrate-<name>.sh`
- Each script backs up the DB, runs `ALTER TABLE`, and logs what it did
- `deploy.sh` only builds and restarts — it does not touch the database schema
- `db.ts` uses `CREATE TABLE IF NOT EXISTS` — it creates new tables but never alters existing ones
- `scripts/db-seed.ts` runs DDL and includes idempotent column migrations for dev/test databases (only adds missing columns, never drops or modifies existing ones)

---

## E2E Testing Pitfalls

### Rate Limiting and Auto-Ban During Parallel Tests

Playwright runs tests in parallel across multiple browser workers (default: CPU cores - 1). Each worker that logs in hits the same dev server. With low rate-limit thresholds, **the tests will ban localhost and break themselves**.

**What happens:**
1. 8 workers start simultaneously, each navigating to `/login`
2. Multiple workers submit login forms within the same 60-second window
3. Violations accumulate per-IP (not per-user) in `rate_limit_violations`
4. When violations hit `AUTO_BAN_LOGIN_THRESHOLD_KEY`, `::1`/`127.0.0.1` gets added to `banned_ips`
5. The login page checks `isIpBanned(ip)` server-side and renders a "IP BANNED" screen instead of the login form
6. All subsequent tests timeout waiting for form elements that never render

**How to prevent it:**
- `scripts/db-seed.ts` always resets rate-limit config and clears `banned_ips`/`rate_limit_violations` on every run (even when demo data already exists)
- Dev defaults are set high enough for parallel tests: `LOGIN_RATE_LIMIT_MAX_KEY=100`, `AUTO_BAN_LOGIN_THRESHOLD_KEY=50`
- If you change these values, verify E2E tests still pass with `npm run test:e2e:parallel`

**If tests are already broken:**
```bash
# Clear bans and violations manually
sqlite3 data/dev.db "DELETE FROM banned_ips; DELETE FROM rate_limit_violations;"

# Or re-seed (resets everything)
npm run db:seed
```

**Key files:**
- `scripts/db-seed.ts` — rate-limit config reset and ban cleanup
- `playwright.config.ts` — worker count, webServer command
- `src/app/login/page.tsx` — IP ban check (renders banned screen)
- `src/app/login/actions.ts` — rate-limit check and auto-ban logic
- `src/lib/ip.ts` — `getClientIp()` returns `127.0.0.1` in dev (no proxy headers)

---

### Parallel Tests: Side-Effect Isolation

Parallel tests (`e2e/parallel/`) run concurrently across multiple browser workers against a **single shared server process**. Every worker shares the same database, in-memory state, and server runtime. A test that mutates shared state can break any other test running at the same time.

**Rules:**

1. **Never mutate shared DB state.** Do not `setConfig()`, ban IPs, create users, or modify `site_config` rows. These changes are visible to all workers instantly and may break concurrent tests.
2. **Never depend on in-memory state.** The rate limiter, cached config, and other server-side caches are shared. A test that triggers rate limiting (e.g. multiple failed logins) can exhaust the threshold for other workers.
3. **Never depend on a specific page view count or other cumulative counter.** Other workers may increment counters concurrently, so `before`/`after` comparisons will be unreliable.
4. **Each test must be self-contained.** A passing test must not change behavior of a subsequent test. If a test requires modified config or DB state, it belongs in `e2e/serial/`.

**Good parallel test patterns:**
- Read-only assertions against existing seed data
- UI interactions that don't mutate server state (navigation, form display, tab switching)
- Tests that use unique per-test identifiers (e.g. `Date.now()`) to avoid collisions

**If you need to modify shared state:**
Move the test to `e2e/serial/` and follow the serial test conventions below.

---

### Serial Tests: Initialization and Cleanup

Serial tests (`e2e/serial/`) run sequentially in a single worker against the same shared server process. Unlike parallel tests, they **can** mutate shared state — but they must do so responsibly because state persists across tests within the run.

**Shared state that persists between serial tests:**

| Layer | What persists | How it's affected |
|---|---|---|
| **Database** | `site_config` rows, `banned_ips`, `rate_limit_violations`, users, RSVPs | `setConfig()`, login failures, CRUD operations |
| **In-memory** | Rate limiter entries (per-IP counters with TTL), cached config | Login attempts, server actions |
| **Browser** | Cookies, localStorage (`VIEW_DEBOUNCE_UNTIL_KEY`, `LOGIN_LIMIT_UNTIL_KEY`, `RSVP_LIMIT_UNTIL_KEY`, `QUESTION_LIMIT_UNTIL_KEY`, `COOKIE_HEALTH_KEY`) | Login, PageViewTracker, rate-limit cooldown |

**Rules:**

1. **Initialize the state you need.** Do not assume a clean database, empty in-memory caches, or fresh browser state. Each test must set up whatever it needs at the start:
   - DB state: `setConfig()`, `setPageViewDebounce()`, etc.
   - Browser state: `page.context().clearCookies()`, navigate to a page before accessing `localStorage`
   - In-memory state: `waitForTimeout()` to let stale rate limiter entries expire

2. **Clean up in `try/finally`.** Every test that mutates state must restore it in a `finally` block so cleanup runs even on timeout or assertion failure. Follow the established patterns:
   - Config changes: restore seed values via `setConfig()` in `finally`
   - Bans/violations: `nukeAllBansAndViolations()` + `cleanupIp()` in `finally`
   - Browser state: `page.context().clearCookies()` in `finally`
   - IP bans via admin UI: `unbanIpViaAdmin()` in `finally` (see `session-revocation.spec.ts`)

3. **Use `test.describe.configure({ mode: "serial" })`** when tests within a file depend on execution order.

4. **Wait for stale in-memory state.** If a preceding test created rate limiter entries with a long TTL (e.g. seed config's 60-second window), the next test must either wait for them to expire or use `nukeAllBansAndViolations()` to clear the DB. In-memory entries cannot be cleared directly — only time-based expiry works.

**Reference implementations:**

| Test file | Initialization | Cleanup |
|---|---|---|
| `rate-limit.spec.ts` | `setConfig()` to low thresholds, `waitForTimeout(2000)` for stale entries | `nukeAllBansAndViolations()` + `setConfig()` restore in `finally`, `flushTestIps()` in `afterEach` |
| `session-revocation.spec.ts` | `loginAsAdmin()`, create users via admin UI | `unbanIpViaAdmin()` via admin UI + `cleanupIp()` via DB in `finally`, `ctx2.close()` |
| `tracking-page-views.spec.ts` | `setPageViewDebounce()`, `clearCookies()` | `setPageViewDebounce(15)` restore in `finally` |

---

## HTTP Cache vs RSC Cache

This application has **two independent caching layers** that affect how pages are served to the browser. Understanding the difference is critical for security reasoning and E2E test design.

### Layer 1: HTTP Cache (browser standard)

Controlled by `Cache-Control` response headers. The browser stores HTML responses on disk and decides whether to serve from cache or make a new request.

**How it works:**
- `no-store` → browser never stores anything. Every navigation is a full request to the server.
- `no-cache` → browser stores but must revalidate with the server before every use.
- `max-age=X` → browser serves from cache for X seconds without contacting the server.
- `stale-while-revalidate=X` → browser serves from cache immediately, revalidates in the background. Useful for public assets where slight staleness is acceptable.
- No header → browser uses heuristic caching (may serve from disk without any request).

**Where it's set:** The proxy (`src/proxy.ts`) sets `Cache-Control: no-store` on every page response. API routes (`/api/media/*`, `/api/login-background`) set their own headers and are excluded from the proxy matcher (`/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)`).

**Security impact:** With `no-store`, every page navigation hits the server. The proxy runs on every request, verifying the session cookie and checking IP bans. A user whose session was revoked or IP was banned will be caught on their next navigation.

### Layer 2: RSC Cache (Next.js client-side)

The React Server Component (RSC) cache is a Next.js mechanism that stores serialized component payloads in the browser's JavaScript memory (not on disk). It is **not** controlled by `Cache-Control` headers.

**How it works:**
- Next.js App Router eagerly prefetches `<Link>` targets when they enter the viewport.
- Once prefetched, the RSC payload is stored in memory.
- When the user clicks a prefetched `<Link>`, the client-side router serves the cached payload **without making a server request**.
- The proxy never runs. Session verification never happens.

**What triggers a server request (bypassing the RSC cache):**
- `page.goto()` — full navigation via URL bar, bookmark, or programmatic navigation
- `page.reload()` / `window.location.reload()` — browser refresh
- Form submissions — POST requests always hit the server
- Hard navigation — any navigation that doesn't go through the Next.js client-side router

**Security impact:** A banned user clicking a prefetched `<Link>` sees stale pre-ban content. This is not a security vulnerability — the server is fully protected. The stale content was already rendered in the browser before the ban. The ban takes effect on the next server request (form submit, reload, or full navigation).

### Summary

| Mechanism | Storage | Controlled by | Proxy runs? | Security boundary |
|---|---|---|---|---|
| HTTP cache | Browser disk | `Cache-Control` header | Yes (with `no-store`) | Server verifies session on every request |
| RSC cache | Browser memory (JS heap) | Next.js internals | No | Stale content only; no new data served |

**For E2E tests:** Tests that need to verify server-side enforcement (IP bans, session revocation) must use `page.goto()`, `page.reload()`, or form submissions — never `<Link>` clicks. See `e2e/serial/session-revocation.spec.ts` for reference implementations.

**For new features:** Any page navigation that must verify the session (e.g., checking if an IP is banned) should use a full page navigation or form submission, not rely on client-side routing.

### Cache Invalidation Principle

When a Server Action mutates data in SQLite, every page that reads that data must be revalidated via `revalidatePath`. The rule:

1. **The admin page** that displays/edits the data — always.
2. **Every public page** that reads the changed config key — check `getConfig()` or `getAllConfig()` calls on the page.
3. **The parent layout** if a layout reads the changed data — use `revalidatePath("/path", "layout")` to invalidate both the layout and all nested pages beneath it.
4. **Not `/`** unless it renders content — the root page (`src/app/page.tsx`) only redirects to `/home` and reads no data.

**Examples:**

| Action | Changed config | Pages to revalidate |
|---|---|---|
| `saveSiteConfig` | Home content, banner, landing | `/admin/site`, `/home` (layout), `/login` |
| `saveRsvpDeadline` | RSVP deadline | `/admin/rsvp`, `/rsvp`, `/admin/site` |
| `saveScheduleText` | Schedule display text | `/admin/schedule`, `/guide` |
| `addImage` (dress code) | Dress code image list | `/admin/dress-code`, `/guide` |

**Why not tags?** Next.js supports tag-based revalidation (`revalidateTag`) for more precise invalidation when multiple pages share a `fetch()` call with the same tag. This project does not use `fetch()` for DB reads — it calls repository functions directly, so tags have no effect. `revalidatePath` is the correct mechanism here.

**Layout invalidation:** `revalidatePath("/home", "layout")` revalidates `(main)/layout.tsx` and every page nested under it (`/home`, `/guide`, `/help`, `/media`, `/rsvp`). Use this when the layout reads a changed config key — it is more efficient than listing each child page individually.

**Why `revalidatePath` with `no-store`?** With `Cache-Control: no-store` on every page response, the browser never stores pages to disk and every navigation hits the server fresh. This means `revalidatePath` is **doubly redundant** in the current architecture — the server always re-renders from SQLite regardless. However, `revalidatePath` is still called as a **best practice** for principled cache invalidation: if the `no-store` policy were ever relaxed (e.g., adding ISR or CDN caching for performance), the `revalidatePath` calls would already be in place to ensure correctness. It is defense-in-depth against stale data, not a functional requirement today.

---

## 401 Redirect Convention (Client Components)

When a client component fetches an API route and receives a 401 response, it should redirect to `/login` and throw an error with `message: "Session expired"`. Catch blocks must guard against this intentional error to prevent flashing "Failed to load..." messages before the redirect completes.

**Pattern:**

```typescript
fetch("/api/some-endpoint")
  .then(r => {
    if (r.status === 401) { window.location.href = "/login"; throw new Error("Session expired"); }
    if (!r.ok) throw new Error("Failed to load data.");
    return r.json();
  })
  .then(data => { /* ... */ })
  .catch((e) => {
    // Guard against intentional redirect error — the redirect is already in progress.
    if (e?.message === "Session expired") return;
    setError("Failed to load data.");
    setLoading(false);
  });
```

**Why:** The `throw` after `window.location.href` ensures in-flight fetches are abandoned. Without the guard, the catch block would briefly flash an error message before navigation completes.

---

## Media Security: SVG Exclusion

SVG files are **not allowed** in the media system. They are excluded from `ALLOWED_EXTENSIONS`, `IMAGE_EXTENSIONS`, and `MIME_TYPES` in `src/lib/media.ts`.

**Why:** Serving SVGs as `image/svg+xml` enables stored XSS. If an attacker uploads a malicious SVG, it could execute JavaScript when rendered via `<object>`, `<embed>`, `<iframe>`, or CSS `background-image`. Even though the current codebase only renders media via `<img>` tags (which are safe), defense-in-depth requires blocking SVG at the upload layer.

**If you need to re-enable SVGs:** You must also sanitize SVG content on upload (strip `<script>`, `<foreignObject>`, event handlers) and serve with `Content-Disposition: attachment` to prevent in-page rendering. This is non-trivial — prefer using raster formats (JPEG, PNG, WebP).
