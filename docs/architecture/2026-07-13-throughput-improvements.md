# Throughput & Latency Improvements

**Date:** 2026-07-13  
**Status:** Implemented

## Changes

### 1. Batched home page config queries
**File:** `src/app/(main)/home/page.tsx`

Replaced 7 individual `getConfig()` SQL calls with a single `getAllConfig()` call. Accesses values via `Object.fromEntries()` map.

- **Before:** 7 SQL queries per page load
- **After:** 1 SQL query per page load

### 2. ISR on home page
**File:** `src/app/(main)/home/page.tsx`

Added `export const revalidate = 60`. Home page is now statically generated and revalidated every 60 seconds. This is safe because the home page has zero personalization — no session-dependent content.

Other pages (`/rsvp`, `/guide`, `/media`) remain dynamic because they depend on session data.

### 3. Configurable rate limiter
**Files:** `src/lib/rate-limit.ts`, `src/app/login/actions.ts`, `src/app/admin/site/actions.ts`, `src/app/admin/site/site-config-form.tsx`

Rate limiter now reads from `site_config` table instead of environment variables. Two new admin-configurable keys:
- `rate_limit_max_attempts` — max login attempts per window (default: 5)
- `rate_limit_window_seconds` — window duration in seconds (default: 60)

Config is read dynamically on each request (not cached), so changes take effect immediately without restart.

### 4. Streaming login background image
**File:** `src/app/api/login-background/route.ts`

Replaced `fs.promises.readFile` (full buffer in memory) with `fs.createReadStream` (streaming via `ReadableStream`). Also:
- Added `Content-Length` header for proper download progress
- Extended cache from 5 minutes to 1 hour
- Added `force-dynamic` to prevent Next.js caching interference

## Architecture Decisions

- **ISR scope:** Only `/home` gets ISR. All other pages depend on session data and must remain dynamic.
- **Rate limiter dynamic reads:** The `createRateLimiter` now accepts an optional `getConfig` callback that returns current limits. This avoids restarting the server to change limits while keeping the in-memory store fast.
- **Docker resource limits:** Not added. Docker already gives containers unlimited CPU/RAM by default. For true multi-core scaling, Node.js clustering would be needed (future consideration if deploying to a VPS).
