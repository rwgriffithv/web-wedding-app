# Safari iOS Layout Fixes

**Date:** 2026-07-13

## Context

Users on iOS (including iOS 26) experienced broken layout on the RSVP page and video issues on the home page, while Android users saw no problems. Investigation revealed this was not a CSS feature compatibility issue but Safari's fundamentally different handling of viewport, scroll contexts, and fixed positioning compared to Chrome Android.

## Root Causes

1. **Missing viewport metadata** — No `export const viewport` in the root layout. Safari iOS relies on default viewport behavior that can differ from Chrome's inferred defaults.

2. **`html, body { height: 100% }`** — Creates a double scroll context on Safari iOS. Safari handles scroll propagation differently than Chrome, leaving pages in a broken scroll state after navigating from pages with `overflow: hidden`.

3. **`100vh` on full-screen sections** — On Safari iOS, `100vh` includes the area behind the URL toolbar. When the URL bar hides/shows, the viewport height changes but `100vh` doesn't, creating incorrect scroll heights.

4. **Fixed nav without safe area insets** — `.wedding-nav-wrapper { bottom: 2rem }` doesn't account for the home indicator bar on notched/Dynamic Island iPhones.

5. **Missing `-webkit-backdrop-filter`** — The bottom nav's blur effect requires the webkit prefix on older Safari versions.

## Changes

| File | Line(s) | Change |
|------|---------|--------|
| `src/app/layout.tsx` | 1, 18-22 | Added `Viewport` import and `export const viewport` with `device-width`, `initialScale: 1`, `viewportFit: "cover"` |
| `src/app/globals.css` | 24 | Removed `body` from `height: 100%` rule (only `html` now) |
| `src/app/globals.css` | 61 | `.landing { min-height: 100dvh }` (was `100vh`) |
| `src/app/globals.css` | 138 | `.home-hero { min-height: 100dvh }` (was `100vh`) |
| `src/app/globals.css` | 236 | `.wedding-nav-wrapper { bottom: calc(2rem + env(safe-area-inset-bottom)) }` |
| `src/app/globals.css` | 249 | Added `-webkit-backdrop-filter: blur(12px)` |
| `src/app/globals.css` | 364 | `.page-content { padding: 6rem 1.5rem calc(8rem + env(safe-area-inset-bottom)) }` |
| `src/app/globals.css` | 744 | `.admin-layout { min-height: 100dvh }` (was `100vh`) |

## Design Decisions

- **`100dvh` over `100vh`** — `dvh` (dynamic viewport height) accounts for the browser chrome. Supported since Safari 15.4 (2022), which covers all actively used iOS versions.
- **`env(safe-area-inset-bottom)`** — Standard CSS env() for home indicator clearance. Falls back to `0` when no safe area exists (non-notched devices).
- **Removed `body { height: 100% }`** — Only `html` needs a fixed height for the root element. `body` at natural height gives Safari a proper scroll context.
- **`-webkit-backdrop-filter`** — Added alongside unprefixed version for broader Safari coverage.

## Compliance

- [x] No new files — modifies existing CSS and layout only
- [x] No component logic changes
- [x] Lint and typecheck pass
- [x] All changes are backwards-compatible (dvh, env(), webkit prefix are progressive enhancements)
