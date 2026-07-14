# Feature Changelog

All features implemented on 2026-07-12, in chronological order. Each entry records context, design decisions, and what changed.

---

## 1. Guest/User Differentiation

**Problem:** The `guests` table conflated authentication (username/password) with RSVP entities. Adding a guest also created a login.

**Solution:** Split into two tables:
- `users` — Auth entities (admin, viewer, party roles). Admin from `.env`, party users auto-created.
- `guests` — RSVP-able people (display name, party membership, +1 flag). No auth fields.

Session structure: `{ userId?, partyId?, type }` where type is `admin | viewer | party`.

**Files:** `src/lib/repository/users.ts`, `src/lib/schema.ts`, `src/lib/db.ts`, `src/lib/auth.ts`, `src/app/admin/users/`, `src/app/login/`, `src/app/(main)/rsvp/`

---

## 2. Combined Guests & Parties

**Problem:** Guests and Parties were separate admin pages. Guests could exist without parties. Managing related data required navigating between pages.

**Solution:** Merged into a single admin section:
- Every guest MUST belong to a party
- `SearchableSelect` component for party selection with inline creation
- Sortable/searchable guest table
- Auto-delete empty parties when last guest removed
- Deleted `/admin/parties` page entirely

**New component:** `src/components/searchable-select.tsx` — WAI-ARIA combobox with search + "Create new" option.

**Files:** `src/app/admin/guests/`, `src/components/searchable-select.tsx`, `src/lib/repository/party.ts`

---

## 3. Collapsible Admin Sections

**Problem:** Inconsistent admin page layouts. No collapsible sections for long lists.

**Solution:** Native `<details>/<summary>` elements (zero new client components):
- Form-first layout on all admin pages (add form at top, list below)
- Both sections default open, collapsible
- Item counts in section headers
- Consistent `.admin-section` CSS class

**Files:** `src/app/admin/*/page.tsx`, `src/app/globals.css`

---

## 4. RSVP Two-Column Layout

**Problem:** RSVP form stacked all fields vertically — too much vertical space with multiple party members.

**Solution:** Two-column grid per guest card:
- Left (200px): Guest name (read-only) + current status
- Right (flex): Attending radio, plus-one yes/no toggle, conditional name input

Plus-one changed from direct text input to yes/no toggle that reveals the name field.

**Files:** `src/app/(main)/rsvp/page.tsx`, `src/app/(main)/rsvp/rsvp-form.tsx`, `src/app/globals.css`

---

## 5. Admin RSVP Table

**Problem:** Admin RSVP page only showed guests who had responded. No sorting, no way to see non-respondents.

**Solution:** Sortable, searchable table showing ALL guests:
- LEFT JOIN from guests to parties and rsvp_responses
- Sortable columns (Name, Party, Status, Plus One, Responded)
- Status filter buttons with counts (All, Yes, No, No response)
- Status sort order: No response → Yes → No (non-respondents at top)

**Files:** `src/app/admin/rsvp/rsvp-status-table.tsx`, `src/lib/repository/rsvp.ts`, `src/app/admin/rsvp/page.tsx`

---

## 6. Countdown Timer

**Problem:** Home page showed a static date string. No live countdown.

**Solution:** T-XYZ / T+XYZ countdown timer:
- Client component (`CountdownTimer`) with `setInterval` + `useState`
- CSS flip animation on digit changes (zero dependencies)
- `home_time` config key added to admin site config
- Server component combines `home_date` + `home_time` into ISO string
- `suppressHydrationWarning` for hydration safety

**Files:** `src/components/countdown-timer.tsx`, `src/app/(main)/home/page.tsx`, `src/app/admin/site/site-config-form.tsx`

---

## 7. Dead Code Cleanup

**Problem:** Dead functions and stale tests remaining from prior features.

**Removed:**
- `getCurrentUser()` from `src/lib/auth.ts` (exported but never called)
- `db.test.ts` (tested fictional schema from before Feature #1)
- Related dead tests from `auth.test.ts`

**Files:** `src/lib/auth.ts`, `src/lib/auth.test.ts`

---

## 8. Audit Deferred Items

Five items deferred from the original audit were implemented:

### W22 — Shared Test Helper
Created `src/test/db-test-utils.ts` with `createTestDb()` + `truncateAll()`. Refactored all 7 repo test files from `beforeAll` to `beforeEach` truncation for test isolation.

### W23 — Missing Repository Tests
- `src/lib/repository/__tests__/party.test.ts` — 8 tests
- `src/lib/repository/__tests__/users.test.ts` — 13 tests

### W24 — Rate Limiter Tests
- `src/lib/__tests__/rate-limit.test.ts` — 5 tests with fake timers

### W14 — SearchableSelect ARIA
Full rewrite following W3C APG editable combobox pattern: `role="combobox"`, `aria-activedescendant`, arrow key navigation, `useId()` for stable IDs.

### W18 — Admin Responsive Sidebar
CSS-only hamburger toggle using `<input type="checkbox">` + `:checked` sibling selector. No `"use client"` needed.

### N1 — Utility Classes
Added 17 utility classes to `globals.css`. Applied across 10 files, ~60% inline style reduction.

**Test suite after:** 61/61 passing across 13 test files.

---

## 9. Local Media File Support + Browse Function

**Problem:** `validateHttpUrl()` rejected relative paths like `/api/media/uuid.jpg`, preventing upload-to-local storage. No way to see/select pre-mounted files from `data/media/`.

**Solution:**
- Added `validateMediaUrl()` to `form-data.ts` — accepts HTTP(S) URLs and relative paths starting with `/`
- New `/api/media/list` GET endpoint — returns JSON array of filenames in `MEDIA_DIR` (admin-only)
- New `FileBrowser` client component — modal grid with image thumbnails, click to select
- Updated `MediaForm` with "Local" button to open the browser
- CSS added for `.file-browser-*` classes (grid, overlay, thumbnails)

**Docker context:** `./data` is bind-mounted to `/app/data`, making pre-mounted files accessible via `/api/media/[filename]` API route.

**Files:** `src/lib/form-data.ts`, `src/app/api/media/list/route.ts`, `src/components/file-browser.tsx`, `src/app/admin/media/actions.ts`, `src/app/admin/media/media-form.tsx`, `src/app/globals.css`

---

## 10. Media Upload + Browse Consistency Fix

**Problem:** `FileUpload` component shared a ref (`inputRef`) with the parent's text input. React reassigned the ref to the hidden file input (last rendered), so `onUpload` set the URL on the invisible file input instead of the text input. Upload appeared to "fail" but file was actually saved. Also, `next/image` `Image` with `fill` in FileBrowser intercepted clicks. Site config and dress code forms lacked upload/browse buttons.

**Solution:**
- Removed `inputRef` prop from `FileUpload` — always uses internal ref
- Replaced `next/image` `Image` with plain `<img>` in FileBrowser
- Added Upload + Local buttons to site config (`landing_background`, `home_background_video`)
- Added Local browser button to dress code image form
- Fixed media form thumbnail Local button (was `onClick={() => {}}`)
- Applied same fix to lodging form

**Files:** `src/components/file-upload.tsx`, `src/components/file-browser.tsx`, `src/app/admin/media/media-form.tsx`, `src/app/admin/dress-code/image-form.tsx`, `src/app/admin/site/site-config-form.tsx`, `src/app/admin/lodging/lodging-form.tsx`

---

## 11. Text-Based File Explorer with Subdirectory Navigation

**Problem:** FileBrowser rendered image thumbnails for every file. With hundreds of hi-res images, this caused hundreds of concurrent HTTP requests, high memory usage, and slow render. No subdirectory support — flat directory only.

**Solution:**
- `/api/media/list` accepts `?path=` query param, returns `{ path, dirs, files }` with path traversal protection
- `/api/media/[...path]` catch-all route replaces `[filename]` — serves files from subdirectories
- FileBrowser rewritten as text-based list: folders first, then files, breadcrumb navigation
- CSS updated from grid layout to list layout

**Trade-off:** Lost visual preview of images. Gained O(1) render cost regardless of directory size. One lightweight JSON request replaces hundreds of image fetches.

**Files:** `src/app/api/media/list/route.ts`, `src/app/api/media/[...path]/route.ts`, `src/components/file-browser.tsx`, `src/app/globals.css`

---

## 12. Media Endpoint Security + Login Background

**Problem:** `/api/media/[filename]` was public — anyone could enumerate and access uploaded files. Login page had no way to show a background image without auth.

**Solution:**
- `/api/media/[...path]` catch-all with `parseSession()` — any logged-in user (admin/viewer/party) can view media
- `/api/media/list` requires `isAdmin()` — only admins can browse the file system
- Extension allowlist on serve endpoint — only `.jpg/.png/.gif/.webp/.svg/.mp4/.webm/.mov` served
- New `/api/login-background` public endpoint — reads `landing_background` config, serves only that one file. No auth, no file enumeration.
- Login page updated to use `/api/login-background` for local media URLs

**Trade-off:** Login page gets a dedicated public endpoint; all other media requires session. Defense-in-depth with extension allowlist on top of session auth.

**Files:** `src/app/api/media/[...path]/route.ts`, `src/app/api/media/list/route.ts`, `src/app/api/login-background/route.ts`, `src/app/login/page.tsx`

---

## 13. Media Tabs — Database-Driven Gallery Sections

**Problem:** Media gallery sections were hardcoded strings (`section` column on `media_items`). No way to rename, reorder, or delete sections from the admin UI.

**Solution:**
- New `media_tabs` table — `slug` (URL-safe, unique), `label` (display name), `sort_order`
- Tab deletion cascades to `media_items` in a transaction (files on disk untouched)
- Media form uses `SearchableSelect` (same as party selection) — type to search existing tabs, or create new inline
- `createTabInline` server action returns `{ tabId, slug }` for immediate selection
- Media list groups items by tab with collapsible sections; each section has rename/delete buttons
- `updateItem` server action for inline title editing
- Public media page uses `?tab=` URL routing (mirrors guide page pattern) with `isValidTab()` guard
- Media gallery shows titles always-visible as caption overlay

**Design decisions:**
- Slug-based loose coupling — `media_items.section` stores tab slug, no foreign key
- Tab delete warns admin that media will be unlinked (not deleted from storage)
- First tab is the default redirect for `/media`

**Files:** `src/lib/schema.ts`, `src/lib/types.ts`, `src/lib/repository/media.ts`, `src/app/admin/media/media-form.tsx`, `src/app/admin/media/media-list.tsx`, `src/app/admin/media/actions.ts`, `src/app/(main)/media/page.tsx`, `src/app/(main)/media/media-gallery.tsx`, `src/app/globals.css`

---

## 14. Architecture Documentation Consolidation

**Problem:** 14 scattered documentation files across `docs/`, dated documents becoming stale, no single source of truth.

**Solution:**
- Consolidated into 5 files under `docs/architecture/`: `overview.md`, `database-layer.md`, `deployment-pipeline.md`, `conventions.md`, `changelog.md`
- Moved dated feature docs to `docs/features/` (kept for reference)
- `changelog.md` serves as a chronological record with design decisions
- `overview.md` is the single entry point for understanding the system

**Files:** `docs/architecture/overview.md`, `docs/architecture/database-layer.md`, `docs/architecture/deployment-pipeline.md`, `docs/architecture/conventions.md`, `docs/architecture/changelog.md`

---

## 15. IP Banning + Rate-Limit Refactoring

**Problem:** No protection against brute-force login attacks. Rate limiting was in-memory only (lost on restart) with no persistent tracking or auto-ban capability. Rate limit config was scattered across site config and hardcoded defaults.

**Solution:**
- **New tables:** `banned_ips` (soft-delete with `unbanned_at`) and `rate_limit_violations` (event log for auto-ban decisions)
- **Auto-ban:** After N rate-limit lockouts within a configurable window, the client IP is automatically banned
- **Admin UI:** `/admin/security` page with auto-ban settings, login rate limit config, manual IP ban form, and banned IP list with unban buttons
- **Dashboard stats:** Security row showing suspicious IPs (approaching threshold) and banned count
- **Rate-limit refactoring:** `getRateLimitConfig()` shared helper replaces scattered defaults. `createRateLimiter(name)` simplified — config passed at call site, no hidden defaults. `RateLimitForm` component with optional props for per-feature defaults.
- **Login page:** Server Component checks IP ban before rendering — banned clients see a minimal screen, no images or heavy assets loaded

**Design decisions:**
- IP check at page level (not middleware) to avoid serving landing page assets to banned clients
- `tryAutoBan` extracted as shared helper for both `login()` and `loginByPartyCode()`
- Periodic cleanup via counter (every 50th lockout), not a timer
- Race conditions guarded: `banIp()` wrapped in try-catch to handle concurrent duplicate inserts from the unique index
- In-memory rate limiter resets on restart; DB violations persist for auto-ban decisions

**Migrations:** 7 (banned_ips), 8 (rate_limit_violations), 9 (unique partial index)

**Files:** `src/lib/ip.ts`, `src/lib/constants.ts`, `src/lib/rate-limit.ts`, `src/lib/schema.ts`, `src/lib/types.ts`, `src/lib/repository/ip-bans.ts`, `src/app/login/page.tsx`, `src/app/login/actions.ts`, `src/app/admin/security/`, `src/components/rate-limit-form/`, `docs/features/ip-banning.md`
