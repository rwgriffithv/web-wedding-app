# RSVP Page Mobile Responsiveness Fix

**Date:** 2026-07-13

## Context

The RSVP page (`src/app/(main)/rsvp/`) had horizontal overflow on mobile devices. The layout used a fixed `200px` two-column grid and a non-wrapping flex row, both of which broke on viewports under ~320px. No media queries existed for public-facing pages.

## Design Decisions

- **Breakpoint: 640px** — Chosen over 768px (which is reserved for admin sidebar collapse). 640px targets phones without breaking tablet layouts.
- **Grid collapse** — `.rsvp-member` switches from `200px 1fr` to `1fr` on mobile, stacking the guest name above the RSVP form. The two-column layout is preserved on wider screens per the original design intent.
- **Flex wrap** — `.rsvp-form .form-row` gains `flex-wrap: wrap` so "Attending?" and "Plus-one?" radio groups stack vertically when tight.
- **CSS-only fix** — No component logic or server action changes were needed.

## Blueprint

| File | Line(s) | Change |
|------|---------|--------|
| `src/app/globals.css` | 564-575 | Added `@media (max-width: 640px)` block with two rules |

## Compliance

- [x] No new files or classes — modifies existing CSS only
- [x] No component logic changes
- [x] Follows existing CSS conventions and theme variables
- [x] No dead code introduced
- [x] Lint passes cleanly
